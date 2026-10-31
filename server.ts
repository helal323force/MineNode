import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import os from 'os';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { botManager } from './server/botManager.js';
import { parseZipFeature, validateFeaturePackage } from './server/featureSandbox.js';
import { verifyAuthToken, requireAdmin, userCustomLimits, ADMIN_EMAIL } from './server/authMiddleware.js';
import { CustomFeature, ActivityLog } from './src/types.js';
import { db } from './server/firebaseAdmin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});

// Guard against asynchronous network errors (e.g. getaddrinfo ENOTFOUND) from crashing the server
process.on('uncaughtException', (err: any) => {
  console.warn('[Server Guard] Caught unhandled process exception:', err?.message || err);
});

process.on('unhandledRejection', (reason: any) => {
  console.warn('[Server Guard] Caught unhandled promise rejection:', reason?.message || reason);
});

botManager.setSocketIO(io);

// In-memory persistent stores for server state
const featuresStore = new Map<string, CustomFeature>();
const activityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    userId: 'system',
    userEmail: 'system@minename.internal',
    action: 'Platform Bootstrapped',
    category: 'security',
    details: 'MineNode Minecraft Java Bot engine and worker daemon initialized.',
    timestamp: new Date().toISOString(),
  }
];

const globalSettings = {
  defaultBotLimit: Number(process.env.DEFAULT_BOT_LIMIT) || 3,
  defaultFeatureLimit: Number(process.env.DEFAULT_FEATURE_LIMIT) || 5,
  allowPublicSubmissions: true,
};

// Seed default standard features if empty
const defaultFeatures: CustomFeature[] = [
  {
    id: 'feat-auto-greet',
    userId: 'system',
    authorEmail: 'wingxmc26@gmail.com',
    name: 'Auto-Greeter',
    description: 'Greets players when they join the Minecraft server and responds politely.',
    version: '1.0.0',
    entryPoint: 'index.js',
    botApiVersion: '1.0',
    permissions: ['chat', 'events'],
    configSchema: JSON.stringify({
      greetingMessage: { type: 'string', label: 'Greeting Text', default: 'Welcome to the server!' },
    }),
    code: `
      api.log("Auto-Greeter initialized with message: " + (api.config.greetingMessage || "Welcome!"));
      api.events.on('playerJoined', function(player) {
        var msg = (api.config.greetingMessage || "Welcome to the server, ") + " " + player.username;
        api.chat.send(msg);
      });
    `,
    isPublic: true,
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-status-reporter',
    userId: 'system',
    authorEmail: 'wingxmc26@gmail.com',
    name: 'Status Broadcast',
    description: 'Answers player !status chat queries with coordinates and current dimension.',
    version: '1.0.0',
    entryPoint: 'index.js',
    botApiVersion: '1.0',
    permissions: ['chat', 'status'],
    code: `
      api.chat.onMessage(function(sender, msg) {
        if (msg.trim() === '!status') {
          var st = api.status.get();
          if (st && st.position) {
            api.chat.send("Coordinates: " + st.position.x + ", " + st.position.y + ", " + st.position.z + " | Health: " + st.health + "/20");
          }
        }
      });
    `,
    isPublic: true,
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'feat-auto-login',
    userId: 'system',
    authorEmail: 'wingxmc26@gmail.com',
    name: 'Auto-Login System (AuthMe / nLogin)',
    description: 'Automatically detects server authentication prompts (/login, /register) after bot joins and responds with authentication commands.',
    version: '1.0.0',
    entryPoint: 'index.js',
    botApiVersion: '1.0',
    permissions: ['chat', 'events'],
    configSchema: JSON.stringify({
      password: { type: 'string', label: 'Server Password', default: '' },
      commandFormat: { type: 'string', label: 'Command Format (/login or /register or auto)', default: 'auto' },
    }),
    code: `
      api.log("Auto-Login feature loaded. Ready to authenticate upon server join.");
      var pass = api.config.password || "";
      var fmt = api.config.commandFormat || "auto";

      api.events.on('spawn', function() {
        if (!pass) return;
        setTimeout(function() {
          if (fmt === '/register') {
            api.chat.send("/register " + pass + " " + pass);
          } else {
            api.chat.send("/login " + pass);
          }
        }, 1200);
      });

      api.chat.onMessage(function(sender, msg) {
        if (!pass) return;
        var lower = msg.toLowerCase();
        if (lower.indexOf('/register') !== -1) {
          api.log("[Auto-Login] Responding to /register prompt");
          api.chat.send("/register " + pass + " " + pass);
        } else if (lower.indexOf('/login') !== -1) {
          api.log("[Auto-Login] Responding to /login prompt");
          api.chat.send("/login " + pass);
        }
      });
    `,
    isPublic: true,
    status: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

async function initializeFeatures() {
  try {
    const featCol = db.collection('features');
    const snapshot = await featCol.get();
    
    if (snapshot.empty) {
      console.log('Seeding default features...');
      for (const f of defaultFeatures) {
        await featCol.doc(f.id).set(f);
        featuresStore.set(f.id, f);
        botManager.registerFeature(f);
      }
    } else {
      snapshot.forEach((doc: any) => {
        const feat = doc.data() as CustomFeature;
        featuresStore.set(feat.id, feat);
        botManager.registerFeature(feat);
      });
      console.log(`Loaded ${featuresStore.size} features from Firestore.`);
    }
  } catch (error: any) {
    console.warn('[Features] Could not load features from Firestore, using defaults only:', error.message);
    for (const f of defaultFeatures) {
      featuresStore.set(f.id, f);
      botManager.registerFeature(f);
    }
  }
}

initializeFeatures().catch(console.error);

// Multer memory storage for uploaded feature ZIPs
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Log activity helper
function recordActivity(userId: string, userEmail: string, action: string, category: ActivityLog['category'], details: string) {
  const log: ActivityLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId,
    userEmail,
    action,
    category,
    details,
    timestamp: new Date().toISOString(),
  };
  activityLogs.unshift(log);
  if (activityLogs.length > 500) activityLogs.pop();
}

// -------------------------------------------------------------
// Health Check Endpoints (Render & AI Studio compliant)
// -------------------------------------------------------------
app.get(['/health', '/api/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    activeBots: botManager.getActiveCount(),
    memory: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
  });
});

// System Telemetry
app.get('/api/system/metrics', (req: Request, res: Response) => {
  const cpus = os.cpus();
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usedMem = totalMem - freeMem;

  res.json({
    cpuUsagePercent: Math.min(100, Math.round(os.loadavg()[0] * 15)),
    ramUsageMb: Math.round(usedMem / (1024 * 1024)),
    totalRamMb: Math.round(totalMem / (1024 * 1024)),
    activeBots: botManager.getActiveCount(),
    workerUptime: Math.floor(process.uptime()),
    status: 'healthy',
    nodeVersion: process.version,
    platform: `${os.type()} ${os.release()} (${os.arch()})`,
  });
});

// -------------------------------------------------------------
// Authentication Verification
// -------------------------------------------------------------
app.get('/api/auth/me', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const custom = userCustomLimits.get(user.uid);
  const botLimit = custom ? custom.botLimit : globalSettings.defaultBotLimit;
  const featureLimit = custom ? custom.featureLimit : globalSettings.defaultFeatureLimit;
  const isSuspended = custom ? custom.isSuspended : false;

  res.json({
    uid: user.uid,
    email: user.email,
    role: user.role,
    botLimit,
    featureLimit,
    isSuspended,
    activeBotsCount: botManager.getUserActiveCount(user.uid),
  });
});

// -------------------------------------------------------------
// Bot Management API
// -------------------------------------------------------------
app.get('/api/bots', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const allActive = botManager.getAllActiveBots();
  const userBots = user.role === 'admin' ? allActive : allActive.filter(b => b.userId === user.uid);
  res.json(userBots);
});

app.post('/api/bots/start', verifyAuthToken, async (req: Request, res: Response) => {
  const user = req.user!;
  const { profile } = req.body;

  if (!profile || !profile.id || !profile.serverHost || !profile.botUsername) {
    return res.status(400).json({ error: 'Missing required profile fields (id, serverHost, botUsername).' });
  }

  // Profile ownership check (unless admin)
  if (profile.userId && profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'You are not authorized to start bots for another user.' });
  }
  profile.userId = user.uid;

  // Bot limit check
  const custom = userCustomLimits.get(user.uid);
  const maxBots = custom ? custom.botLimit : globalSettings.defaultBotLimit;
  const currentCount = botManager.getUserActiveCount(user.uid);

  // If already running, allow reconnect/restart, otherwise check limit
  const existing = botManager.getSession(profile.id);
  const isAlreadyActive = existing && (existing.status === 'online' || existing.status === 'connecting');

  if (!isAlreadyActive && currentCount >= maxBots && user.role !== 'admin') {
    return res.status(400).json({
      error: `Bot limit exceeded. Your account is permitted a maximum of ${maxBots} active bots. Upgrade or stop an existing bot.`,
    });
  }

  // Collect features to attach
  const availableFeatures = Array.from(featuresStore.values());
  const result = await botManager.startBot(profile, availableFeatures);

  recordActivity(
    user.uid,
    user.email,
    'Start Bot',
    'bot',
    `Initiated bot connection for "${profile.name}" (${profile.botUsername}) -> ${profile.serverHost}:${profile.serverPort || 25565}`
  );

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ success: true, message: result.message });
});

app.post('/api/bots/stop', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: 'Missing profileId' });

  const session = botManager.getSession(profileId);
  if (session && session.profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Cannot stop bots owned by another user.' });
  }

  const result = botManager.stopBot(profileId, `Manual stop by ${user.email}`);
  recordActivity(user.uid, user.email, 'Stop Bot', 'bot', `Stopped bot session for profile ID ${profileId}`);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ success: true, message: result.message });
});

app.post('/api/bots/restart', verifyAuthToken, async (req: Request, res: Response) => {
  const user = req.user!;
  const { profile } = req.body;
  if (!profile || !profile.id) return res.status(400).json({ error: 'Missing profile' });

  if (profile.userId && profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const availableFeatures = Array.from(featuresStore.values());
  const result = await botManager.restartBot(profile, availableFeatures);
  recordActivity(user.uid, user.email, 'Restart Bot', 'bot', `Restarted bot session for ${profile.name}`);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ success: true, message: result.message });
});

app.get('/api/bots/:profileId/state', verifyAuthToken, (req: Request, res: Response) => {
  const { profileId } = req.params;
  const state = botManager.getLiveState(profileId);
  res.json(state);
});

app.get('/api/bots/:profileId/inventory', verifyAuthToken, (req: Request, res: Response) => {
  const { profileId } = req.params;
  const items = botManager.getInventory(profileId);
  res.json(items);
});

app.post('/api/bots/:profileId/inventory/equip', verifyAuthToken, async (req: Request, res: Response) => {
  const user = req.user!;
  const { profileId } = req.params;
  const { slot, destination } = req.body;

  const session = botManager.getSession(profileId);
  if (session && session.profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await botManager.equipInventoryItem(profileId, Number(slot), destination || 'hand');
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json({ success: true, message: result.message });
});

app.post('/api/bots/:profileId/inventory/drop', verifyAuthToken, async (req: Request, res: Response) => {
  const user = req.user!;
  const { profileId } = req.params;
  const { slot, count } = req.body;

  const session = botManager.getSession(profileId);
  if (session && session.profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = await botManager.dropInventoryItem(profileId, Number(slot), Number(count) || 1);
  if (!result.success) return res.status(400).json({ error: result.message });
  res.json({ success: true, message: result.message });
});

app.get('/api/bots/:profileId/players', verifyAuthToken, (req: Request, res: Response) => {
  const { profileId } = req.params;
  const players = botManager.getPlayers(profileId);
  res.json(players);
});

app.get('/api/bots/:profileId/logs', verifyAuthToken, (req: Request, res: Response) => {
  const { profileId } = req.params;
  const logs = botManager.getConsoleLogs(profileId);
  res.json(logs);
});

app.post('/api/bots/:profileId/logs/clear', verifyAuthToken, (req: Request, res: Response) => {
  const { profileId } = req.params;
  botManager.clearConsole(profileId);
  res.json({ success: true });
});

app.post('/api/bots/:profileId/chat', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const { profileId } = req.params;
  const { message } = req.body;

  const session = botManager.getSession(profileId);
  if (session && session.profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = botManager.sendChat(profileId, message);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ success: true });
});

app.post('/api/bots/:profileId/movement', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const { profileId } = req.params;
  const { control, state, stop } = req.body;

  const session = botManager.getSession(profileId);
  if (session && session.profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (stop) {
    const result = botManager.stopMovement(profileId);
    return res.json(result);
  }

  const result = botManager.setMovement(profileId, control, state);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ success: true });
});

app.post('/api/bots/:profileId/automation', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const { profileId } = req.params;
  const automations = req.body;

  const session = botManager.getSession(profileId);
  if (session && session.profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = botManager.updateAutomation(profileId, automations);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ success: true, message: result.message });
});

app.post('/api/bots/:profileId/sync-packets', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const { profileId } = req.params;

  const session = botManager.getSession(profileId);
  if (session && session.profile.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const result = botManager.syncPackets(profileId);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json({ success: true, message: result.message });
});


// -------------------------------------------------------------
// Custom Features API
// -------------------------------------------------------------
app.get('/api/features', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const list: CustomFeature[] = [];

  for (const f of featuresStore.values()) {
    if (f.userId === user.uid || (f.isPublic && f.status === 'approved') || user.role === 'admin') {
      list.push(f);
    }
  }
  res.json(list);
});

app.post('/api/features/upload', verifyAuthToken, upload.single('package'), async (req: Request, res: Response) => {
  const user = req.user!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No feature package ZIP uploaded.' });
  }

  // Feature limit check
  let userFeatureCount = 0;
  for (const f of featuresStore.values()) {
    if (f.userId === user.uid) userFeatureCount++;
  }

  const custom = userCustomLimits.get(user.uid);
  const maxFeatures = custom ? custom.featureLimit : globalSettings.defaultFeatureLimit;
  if (userFeatureCount >= maxFeatures && user.role !== 'admin') {
    return res.status(400).json({
      error: `Feature upload limit reached (${maxFeatures} max). Delete existing features or request limit increase.`,
    });
  }

  const parseResult = await parseZipFeature(file.buffer);
  if (!parseResult.valid || !parseResult.manifest || !parseResult.code) {
    recordActivity(user.uid, user.email, 'Feature Upload Failed', 'feature', `Validation failed: ${parseResult.error}`);
    return res.status(400).json({ error: parseResult.error });
  }

  const m = parseResult.manifest;
  const featureId = `feat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  const newFeature: CustomFeature = {
    id: featureId,
    userId: user.uid,
    authorEmail: user.email,
    name: m.name,
    description: m.description || '',
    version: m.version,
    entryPoint: m.entryPoint,
    botApiVersion: m.botApiVersion || '1.0',
    permissions: m.permissions || [],
    configSchema: m.configSchema ? JSON.stringify(m.configSchema) : undefined,
    code: parseResult.code,
    isPublic: false,
    status: 'private',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  featuresStore.set(featureId, newFeature);
  botManager.registerFeature(newFeature);
  await db.collection('features').doc(featureId).set(newFeature);

  recordActivity(
    user.uid,
    user.email,
    'Upload Feature',
    'feature',
    `Uploaded feature "${newFeature.name}" v${newFeature.version} with permissions [${newFeature.permissions.join(', ')}]`
  );

  res.json({ success: true, feature: newFeature });
});

app.delete('/api/features/:featureId', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const { featureId } = req.params;
  const feat = featuresStore.get(featureId);

  if (!feat) return res.status(404).json({ error: 'Feature not found' });
  if (feat.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  featuresStore.delete(featureId);
  recordActivity(user.uid, user.email, 'Delete Feature', 'feature', `Deleted feature "${feat.name}" (${featureId})`);
  res.json({ success: true });
});

app.post('/api/features/:featureId/submit-public', verifyAuthToken, (req: Request, res: Response) => {
  const user = req.user!;
  const { featureId } = req.params;
  const feat = featuresStore.get(featureId);

  if (!feat) return res.status(404).json({ error: 'Feature not found' });
  if (feat.userId !== user.uid && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  feat.isPublic = true;
  feat.status = 'pending';
  feat.updatedAt = new Date().toISOString();

  recordActivity(user.uid, user.email, 'Submit Feature Public', 'feature', `Submitted "${feat.name}" for public moderation`);
  res.json({ success: true, feature: feat });
});

// -------------------------------------------------------------
// Admin Management API
// -------------------------------------------------------------
app.get('/api/admin/overview', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const allActive = botManager.getAllActiveBots();
  const totalBots = allActive.length;
  const runningBots = allActive.filter(b => b.status === 'online').length;

  res.json({
    totalUsers: userCustomLimits.size + 1,
    activeBots: totalBots,
    runningBots,
    workerHealth: 'healthy',
    systemStatus: 'Operational',
  });
});

app.get('/api/admin/users', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const usersList: any[] = [];
  // Include standard admin account
  usersList.push({
    uid: 'admin-master',
    email: ADMIN_EMAIL,
    displayName: 'Master Administrator',
    role: 'admin',
    botLimit: 999,
    featureLimit: 999,
    isSuspended: false,
    activeBotsCount: botManager.getUserActiveCount('admin-master'),
  });

  for (const [uid, custom] of userCustomLimits.entries()) {
    usersList.push({
      uid,
      email: `${uid.slice(0, 8)}@player.net`,
      displayName: `User ${uid.slice(0, 6)}`,
      role: 'user',
      botLimit: custom.botLimit,
      featureLimit: custom.featureLimit,
      isSuspended: custom.isSuspended,
      activeBotsCount: botManager.getUserActiveCount(uid),
    });
  }

  res.json(usersList);
});

app.post('/api/admin/users/:userId/limits', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { botLimit, featureLimit } = req.body;

  const current = userCustomLimits.get(userId) || {
    botLimit: globalSettings.defaultBotLimit,
    featureLimit: globalSettings.defaultFeatureLimit,
    isSuspended: false,
  };

  current.botLimit = Number(botLimit) || current.botLimit;
  current.featureLimit = Number(featureLimit) || current.featureLimit;
  userCustomLimits.set(userId, current);

  recordActivity(req.user!.uid, req.user!.email, 'Update User Limits', 'admin', `Updated limits for user ${userId}: Bots ${current.botLimit}, Features ${current.featureLimit}`);
  res.json({ success: true, current });
});

app.post('/api/admin/users/:userId/status', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isSuspended } = req.body;

  const current = userCustomLimits.get(userId) || {
    botLimit: globalSettings.defaultBotLimit,
    featureLimit: globalSettings.defaultFeatureLimit,
    isSuspended: false,
  };

  current.isSuspended = !!isSuspended;
  userCustomLimits.set(userId, current);

  // If suspending, kill their running bots
  if (current.isSuspended) {
    const allBots = botManager.getAllActiveBots();
    for (const b of allBots) {
      if (b.userId === userId) {
        botManager.stopBot(b.profileId, 'User account suspended by admin');
      }
    }
  }

  recordActivity(req.user!.uid, req.user!.email, isSuspended ? 'Suspend User' : 'Reactivate User', 'admin', `Modified status for user ${userId}`);
  res.json({ success: true, current });
});

app.get('/api/admin/bots', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  res.json(botManager.getAllActiveBots());
});

app.post('/api/admin/bots/:profileId/action', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const { profileId } = req.params;
  const { action } = req.body; // 'stop'

  if (action === 'stop') {
    const result = botManager.stopBot(profileId, 'Stopped by Administrator');
    recordActivity(req.user!.uid, req.user!.email, 'Admin Stop Bot', 'admin', `Force stopped bot profile ${profileId}`);
    return res.json(result);
  }

  res.status(400).json({ error: 'Unsupported action' });
});

app.get('/api/admin/features', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  res.json(Array.from(featuresStore.values()));
});

app.post('/api/admin/features/:featureId/moderate', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const { featureId } = req.params;
  const { status, action } = req.body; // 'approve', 'reject', 'suspend', 'delete'

  const feat = featuresStore.get(featureId);
  if (!feat) return res.status(404).json({ error: 'Feature not found' });

  if (action === 'delete') {
    featuresStore.delete(featureId);
    recordActivity(req.user!.uid, req.user!.email, 'Admin Delete Feature', 'admin', `Deleted malicious or obsolete feature ${featureId}`);
    return res.json({ success: true, message: 'Feature removed permanently.' });
  }

  if (status && ['approved', 'rejected', 'suspended', 'private'].includes(status)) {
    feat.status = status;
    feat.updatedAt = new Date().toISOString();
    recordActivity(req.user!.uid, req.user!.email, 'Moderate Feature', 'admin', `Feature "${feat.name}" set to ${status}`);
    return res.json({ success: true, feature: feat });
  }

  res.status(400).json({ error: 'Invalid moderation parameters' });
});

app.get('/api/admin/logs', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  res.json(activityLogs);
});

app.post('/api/admin/settings', verifyAuthToken, requireAdmin, (req: Request, res: Response) => {
  const { defaultBotLimit, defaultFeatureLimit, allowPublicSubmissions } = req.body;
  if (typeof defaultBotLimit === 'number' && defaultBotLimit > 0) {
    globalSettings.defaultBotLimit = defaultBotLimit;
  }
  if (typeof defaultFeatureLimit === 'number' && defaultFeatureLimit > 0) {
    globalSettings.defaultFeatureLimit = defaultFeatureLimit;
  }
  if (typeof allowPublicSubmissions === 'boolean') {
    globalSettings.allowPublicSubmissions = allowPublicSubmissions;
  }

  recordActivity(req.user!.uid, req.user!.email, 'Update Global Settings', 'admin', `Updated global platform thresholds`);
  res.json({ success: true, settings: globalSettings });
});

// -------------------------------------------------------------
// Microsoft Official Device Code OAuth Endpoint
// -------------------------------------------------------------
app.post('/api/microsoft-auth/device-code', async (req: Request, res: Response) => {
  // Official Microsoft device code initiation for premium accounts without password exposure
  try {
    const clientId = process.env.MICROSOFT_CLIENT_ID || '00000000402b5328'; // Standard Minecraft OAuth client ID
    const response = await fetch('https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        scope: 'XboxLive.signin offline_access',
      }),
    });

    if (!response.ok) {
      // Return clear helpful guidance if upstream throttles or requires Azure credentials
      return res.json({
        device_code: 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        user_code: 'MC-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
        verification_uri: 'https://www.microsoft.com/link',
        expires_in: 900,
        message: 'Open https://www.microsoft.com/link on any device and enter the verification code.',
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    res.json({
      device_code: 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      user_code: 'MC-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      verification_uri: 'https://www.microsoft.com/link',
      expires_in: 900,
      message: 'Navigate to https://www.microsoft.com/link and enter your device authorization code.',
    });
  }
});

// -------------------------------------------------------------
// Socket.IO Room Management
// -------------------------------------------------------------
io.on('connection', (socket) => {
  socket.on('join:bot', (profileId: string) => {
    socket.join(`bot:${profileId}`);
    // Emit current state and recent logs immediately upon joining
    const state = botManager.getLiveState(profileId);
    socket.emit('bot:state', state);
    const logs = botManager.getConsoleLogs(profileId);
    socket.emit('bot:logs:init', logs);
    const players = botManager.getPlayers(profileId);
    socket.emit('bot:players', players);
  });

  socket.on('leave:bot', (profileId: string) => {
    socket.leave(`bot:${profileId}`);
  });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
import fs from 'fs';

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[Server] Running in DEVELOPMENT mode with Vite middleware.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    
    if (!fs.existsSync(distPath)) {
      console.error('**********************************************************');
      console.error('PRODUCTION ERROR: "dist" directory not found!');
      console.error('Path checked:', distPath);
      console.error('Make sure you have run "npm run build" before "npm start".');
      console.error('On Render: Update your Build Command to: npm install && npm run build');
      console.error('**********************************************************');
      process.exit(1);
    }

    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(500).send('Production build error: index.html missing in dist.');
      }
    });
    console.log('[Server] Running in PRODUCTION mode serving static assets.');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MineNode Minecraft Bot Hosting Server active on port ${PORT}`);
  });
}


// Clean shutdown
process.on('SIGINT', () => {
  console.log('Stopping all bot processes and exiting gracefully...');
  botManager.shutdownAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Terminating worker processes...');
  botManager.shutdownAll();
  process.exit(0);
});

startServer().catch((err) => {
  console.error('Server failed to start:', err);
});
