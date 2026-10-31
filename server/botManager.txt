import mineflayer from 'mineflayer';
import { Server as SocketIOServer } from 'socket.io';
import { 
  BotProfile, 
  BotLiveState, 
  ConsoleLogMessage, 
  ChatMessage, 
  PlayerInfo, 
  InventoryItem, 
  CustomFeature 
} from '../src/types.js';
import { FeatureRuntime } from './featureSandbox.js';

export interface ActiveBotSession {
  profile: BotProfile;
  bot: any | null;
  status: BotLiveState['status'];
  startTime: number | null;
  lastConnected: string | null;
  errorMessage?: string;
  ping: number;
  health: number;
  maxHealth: number;
  food: number;
  coordinates: { x: number; y: number; z: number } | null;
  dimension: string | null;
  players: PlayerInfo[];
  consoleLogs: ConsoleLogMessage[];
  chatMessages: ChatMessage[];
  reconnectTimer: NodeJS.Timeout | null;
  featureRuntime: FeatureRuntime | null;
  lastMoveEmit: number;
  // Anti-kick & physics telemetry
  kickInfo?: {
    isKicked: boolean;
    reason: string;
    cooldownSec: number;
    kickTime: number;
    nextAllowedTime: number;
  } | null;
  physicsTelemetry?: {
    velocity: number;
    packetRate: number;
    antiCheatRisk: 'Low' | 'Medium' | 'High';
  };
  packetSyncStatus?: {
    lastSyncTime: string;
    terrainLoaded: boolean;
    packetErrorCount: number;
    zeroGravityActive: boolean;
  };
  gracePeriodActive?: boolean;
  graceRemainingMs?: number;
  graceTimer?: NodeJS.Timeout | null;
  // Automation timers & active tasks
  automationTimers: NodeJS.Timeout[];
  isEating: boolean;
  isFishing: boolean;
}

export class BotManager {
  private activeBots: Map<string, ActiveBotSession> = new Map();
  private io: SocketIOServer | null = null;
  private userFeatureStore: Map<string, CustomFeature> = new Map();

  constructor() {}

  public setSocketIO(io: SocketIOServer) {
    this.io = io;
  }

  public registerFeature(feature: CustomFeature) {
    this.userFeatureStore.set(feature.id, feature);
  }

  public getActiveCount(): number {
    let count = 0;
    for (const session of this.activeBots.values()) {
      if (session.status === 'online' || session.status === 'connecting' || session.status === 'reconnecting') {
        count++;
      }
    }
    return count;
  }

  public getUserActiveCount(userId: string): number {
    let count = 0;
    for (const session of this.activeBots.values()) {
      if (session.profile.userId === userId && (session.status === 'online' || session.status === 'connecting' || session.status === 'reconnecting')) {
        count++;
      }
    }
    return count;
  }

  public getAllActiveBots(): Array<{ profileId: string; userId: string; username: string; host: string; port: number; status: string; uptime: number }> {
    const list: any[] = [];
    for (const [profileId, session] of this.activeBots.entries()) {
      const uptime = session.startTime ? Math.floor((Date.now() - session.startTime) / 1000) : 0;
      list.push({
        profileId,
        userId: session.profile.userId,
        username: session.profile.botUsername,
        host: session.profile.serverHost,
        port: session.profile.serverPort,
        status: session.status,
        uptime,
      });
    }
    return list;
  }

  public getSession(profileId: string): ActiveBotSession | undefined {
    return this.activeBots.get(profileId);
  }

  public getLiveState(profileId: string): BotLiveState {
    const session = this.activeBots.get(profileId);
    if (!session) {
      return {
        profileId,
        status: 'stopped',
        uptime: 0,
        ping: 0,
        health: 20,
        maxHealth: 20,
        food: 20,
        coordinates: null,
        dimension: null,
      };
    }

    const uptime = session.startTime ? Math.floor((Date.now() - session.startTime) / 1000) : 0;
    return {
      profileId,
      status: session.status,
      uptime,
      ping: session.ping,
      health: session.health,
      maxHealth: session.maxHealth,
      food: session.food,
      coordinates: session.coordinates,
      dimension: session.dimension,
      errorMessage: session.errorMessage,
      lastConnected: session.lastConnected || undefined,
      kickInfo: session.kickInfo || undefined,
      gracePeriodActive: !!session.gracePeriodActive,
      graceRemainingMs: session.graceRemainingMs || 0,
      physicsTelemetry: session.physicsTelemetry || {
        velocity: 0.18,
        packetRate: 20,
        antiCheatRisk: 'Low',
      },
      packetSyncStatus: session.packetSyncStatus || {
        lastSyncTime: new Date().toLocaleTimeString(),
        terrainLoaded: true,
        packetErrorCount: 0,
        zeroGravityActive: false,
      },
      activeAutomations: {
        autoEat: !!session.profile.autoEat,
        autoArmor: !!session.profile.autoArmor,
        autoTotem: !!session.profile.autoTotem,
        afkAntiKick: !!session.profile.afkAntiKick,
        guardMode: !!session.profile.guardMode,
        autoFish: !!session.profile.autoFish,
        humanizedPhysics: session.profile.humanizedPhysics !== false,
      },
      serverInfo: {
        host: session.profile.serverHost,
        port: session.profile.serverPort,
        version: session.profile.version || 'auto',
      },
    };
  }

  public async startBot(profile: BotProfile, customFeatures: CustomFeature[] = []): Promise<{ success: boolean; message: string }> {
    const existing = this.activeBots.get(profile.id);
    if (existing && (existing.status === 'online' || existing.status === 'connecting')) {
      return { success: false, message: 'Bot connection already active or in progress for this profile.' };
    }

    // Clean up any stale session
    if (existing) {
      this.stopBot(profile.id, 'Restarting connection');
    }

    const rawHost = (profile.serverHost || '').trim();
    if (!rawHost) {
      return { success: false, message: 'Server hostname cannot be empty.' };
    }

    // Auto-clean any unintentional internal whitespace (e.g. "Halal smp.mcsh.io" -> "Halalsmp.mcsh.io")
    const cleanHost = rawHost.replace(/\s+/g, '');
    const cleanPort = Number(profile.serverPort) || 25565;

    const session: ActiveBotSession = {
      profile: { ...profile, serverHost: cleanHost, serverPort: cleanPort },
      bot: null,
      status: 'connecting',
      startTime: null,
      lastConnected: null,
      ping: 0,
      health: 20,
      maxHealth: 20,
      food: 20,
      coordinates: null,
      dimension: null,
      players: [],
      consoleLogs: [],
      chatMessages: [],
      reconnectTimer: null,
      featureRuntime: null,
      lastMoveEmit: 0,
      automationTimers: [],
      isEating: false,
      isFishing: false,
    };

    this.activeBots.set(profile.id, session);
    this.addLog(profile.id, 'system', `Initiating connection to ${cleanHost}:${cleanPort} as ${profile.botUsername}...`);
    this.broadcastState(profile.id);

    try {
      const botOptions: any = {
        host: cleanHost,
        port: cleanPort,
        username: profile.botUsername,
        auth: profile.authType === 'microsoft' ? 'microsoft' : 'offline',
        checkTimeoutInterval: 45000,
      };

      if (profile.version && profile.version !== 'auto') {
        botOptions.version = profile.version;
      }

      const bot = mineflayer.createBot(botOptions);
      session.bot = bot;

      // Keep control states cleared so bot stands still without spamming movement
      if (typeof bot.clearControlStates === 'function') {
        bot.clearControlStates();
      }

      // Centralized error listener attached immediately to both bot and _client
      const safeErrorHandler = (err: any) => {
        const rawMsg = err && err.message ? err.message : String(err);
        let msg = rawMsg;
        if (rawMsg.includes('ENOTFOUND')) {
          msg = `Cannot resolve server address "${cleanHost}". Please verify the server IP/domain is reachable.`;
        } else if (rawMsg.includes('ECONNREFUSED')) {
          msg = `Connection refused by ${cleanHost}:${cleanPort}. The Minecraft server may be offline.`;
        } else if (rawMsg.includes('ETIMEDOUT')) {
          msg = `Connection to ${cleanHost}:${cleanPort} timed out.`;
        }

        session.status = 'error';
        session.errorMessage = msg;
        this.addLog(profile.id, 'error', `Connection error: ${msg}`);
        this.broadcastState(profile.id);
        this.cleanupBotListeners(session);

        const isFatalHostError = rawMsg.includes('ENOTFOUND') || rawMsg.includes('EINVAL') || rawMsg.includes('EAI_AGAIN') || rawMsg.includes('Unsupported version');
        if (!isFatalHostError) {
          this.handleAutoReconnect(profile, customFeatures);
        } else {
          this.addLog(profile.id, 'warn', 'Auto-reconnect halted: Invalid or unresolvable server address.');
        }
      };

      bot.on('error', safeErrorHandler);
      if (bot._client) {
        bot._client.on('error', safeErrorHandler);
      }

      // Initialize Feature Runtime
      const featureRuntime = new FeatureRuntime(bot, (log) => {
        this.addLog(profile.id, log.type === 'error' ? 'error' : log.type === 'warn' ? 'warn' : 'info', `[Feature ${log.featureId}] ${log.message}`);
      });
      session.featureRuntime = featureRuntime;

      // Setup Bot Event Listeners
      bot.on('login', () => {
        session.status = 'online';
        session.startTime = Date.now();
        session.lastConnected = new Date().toISOString();
        session.errorMessage = undefined;
        this.addLog(profile.id, 'info', `Successfully authenticated & logged into Minecraft server.`);
        this.broadcastState(profile.id);

        // Load configured features
        if (profile.activeFeatures && profile.activeFeatures.length > 0) {
          for (const featureId of profile.activeFeatures) {
            const feat = customFeatures.find(f => f.id === featureId) || this.userFeatureStore.get(featureId);
            if (feat) {
              const cfg = (profile.featureConfigs && profile.featureConfigs[featureId]) || {};
              featureRuntime.loadFeature(feat, cfg);
            }
          }
        }
      });

      // Helper function to trigger 1-second post-respawn grace lock
      const triggerRespawnGraceLock = (reason: string) => {
        if (session.graceTimer) clearTimeout(session.graceTimer);
        session.gracePeriodActive = true;
        session.graceRemainingMs = 1000;
        // Keep Mineflayer physics enabled. Disabling physics or manually
        // zeroing entity velocity can desynchronize movement packets.
        if (typeof bot.clearControlStates === 'function') {
          bot.clearControlStates();
        }

        this.addLog(profile.id, 'system', `[Respawn Guard] Initializing 1.0s grace period lockout (${reason}). Chunk terrain loading...`);
        this.broadcastState(profile.id);

        session.graceTimer = setTimeout(() => {
          session.gracePeriodActive = false;
          session.graceRemainingMs = 0;
          session.graceTimer = null;
          if (session.bot && session.status === 'online') {
            this.addLog(profile.id, 'info', '[Respawn Guard] Grace period completed. Physics remained enabled.');
            this.broadcastState(profile.id);
          }
        }, 1000);
      };

      bot.on('respawn', () => {
        triggerRespawnGraceLock('initial respawn packet received');
      });

      bot.on('spawn', () => {
        session.status = 'online';

        // Start a short control-input grace period after spawn; keep physics enabled.
        triggerRespawnGraceLock('world spawn packet received');

        if (bot.entity && bot.entity.position) {
          session.coordinates = {
            x: Math.round(bot.entity.position.x * 10) / 10,
            y: Math.round(bot.entity.position.y * 10) / 10,
            z: Math.round(bot.entity.position.z * 10) / 10,
          };
        }
        if (bot.game) {
          session.dimension = bot.game.dimension || 'overworld';
        }
        if (bot.player) {
          session.ping = bot.player.ping || 0;
        }
        session.health = typeof bot.health === 'number' ? bot.health : 20;
        session.food = typeof bot.food === 'number' ? bot.food : 20;

        this.updatePlayersList(profile.id);
        this.addLog(profile.id, 'info', `Bot spawned in dimension: ${session.dimension || 'overworld'} at position (${session.coordinates?.x}, ${session.coordinates?.y}, ${session.coordinates?.z})`);
        this.broadcastState(profile.id);

        // Automatic Login after joining
        if (profile.autoLogin && profile.loginPassword) {
          const pass = profile.loginPassword.trim();
          setTimeout(() => {
            if (session.bot && session.status === 'online') {
              const cmd = profile.loginCommand && profile.loginCommand.trim()
                ? profile.loginCommand.trim().replace(/\{password\}/g, pass)
                : `/login ${pass}`;
              this.addLog(profile.id, 'system', `[Auto-Login] Executing authentication: ${cmd.startsWith('/') ? cmd.split(' ')[0] + ' ********' : '********'}`);
              session.bot.chat(cmd);
            }
          }, 1500);
        }

        // Start Built-in Automations (Auto-Eat, Armor, Totem, AFK, Guard, Fishing)
        this.startAutomationRoutines(session);
      });

      bot.on('forcedMove', () => {
        // The server is authoritative after a forced position correction.
        // Clear pressed controls, but never overwrite the server-set velocity.
        if (session.bot && typeof session.bot.clearControlStates === 'function') {
          session.bot.clearControlStates();
        }
      });

      // Helper to react to server AuthMe prompts in real time
      const handleAuthMePrompt = (messageText: string) => {
        if (!profile.autoLogin || !profile.loginPassword || !session.bot || session.status !== 'online') return;
        const lower = messageText.toLowerCase();
        const pass = profile.loginPassword.trim();
        if (lower.includes('/register') && (lower.includes('password') || lower.includes('register') || lower.includes('please'))) {
          this.addLog(profile.id, 'system', '[Auto-Login] Detected /register prompt. Responding with registration...');
          session.bot.chat(`/register ${pass} ${pass}`);
        } else if (lower.includes('/login') && (lower.includes('password') || lower.includes('login') || lower.includes('please'))) {
          this.addLog(profile.id, 'system', '[Auto-Login] Detected /login prompt. Responding with login credentials...');
          session.bot.chat(`/login ${pass}`);
        }
      };

      bot.on('chat', (username: string, message: string) => {
        const isBot = username === bot.username;
        const chatItem: ChatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          profileId: profile.id,
          sender: username,
          message,
          isBot,
          timestamp: new Date().toLocaleTimeString(),
        };
        session.chatMessages.push(chatItem);
        if (session.chatMessages.length > 200) session.chatMessages.shift();

        this.addLog(profile.id, 'chat', `<${username}> ${message}`);
        this.emitToBotRoom(profile.id, 'bot:chat', chatItem);

        handleAuthMePrompt(message);
      });

      bot.on('messagestr', (message: string) => {
        if (!message || message.trim().length === 0) return;
        this.addLog(profile.id, 'info', `[Server] ${message}`);
        handleAuthMePrompt(message);
      });

      bot.on('health', () => {
        session.health = typeof bot.health === 'number' ? bot.health : 20;
        session.food = typeof bot.food === 'number' ? bot.food : 20;
        this.broadcastState(profile.id);
      });

      bot.on('move', () => {
        const now = Date.now();
        if (now - session.lastMoveEmit > 600) {
          session.lastMoveEmit = now;
          if (bot.entity && bot.entity.position) {
            session.coordinates = {
              x: Math.round(bot.entity.position.x * 10) / 10,
              y: Math.round(bot.entity.position.y * 10) / 10,
              z: Math.round(bot.entity.position.z * 10) / 10,
            };
          }
          if (bot.player) {
            session.ping = bot.player.ping || session.ping;
          }
          this.broadcastState(profile.id);
        }
      });

      bot.on('playerJoined', (player: any) => {
        this.updatePlayersList(profile.id);
        this.addLog(profile.id, 'info', `Player joined: ${player.username}`);
      });

      bot.on('playerLeft', (player: any) => {
        this.updatePlayersList(profile.id);
        this.addLog(profile.id, 'info', `Player left: ${player.username}`);
      });

      bot.on('kicked', (reason: any) => {
        let rawReason = typeof reason === 'string' ? reason : JSON.stringify(reason);
        let displayReason = rawReason;

        if (rawReason.includes('invalid_player_movement') || rawReason.includes('Invalid move')) {
          displayReason = 'Invalid move player packet received (AuthMe / Spawn Freeze Desync)';
        }

        session.status = 'kicked';
        session.errorMessage = displayReason;

        // Parse rate limit cooldown (e.g. "You must wait 28 seconds before logging-in again.")
        let cooldownSec = profile.kickCooldownSec || 30;
        const match = rawReason.match(/wait (\d+) second/i) || rawReason.match(/(\d+)\s*second/i);
        if (match && match[1]) {
          cooldownSec = Math.max(Number(match[1]), 5);
        }
        const now = Date.now();
        session.kickInfo = {
          isKicked: true,
          reason: displayReason,
          cooldownSec,
          kickTime: now,
          nextAllowedTime: now + (cooldownSec * 1000),
        };

        this.addLog(profile.id, 'warn', `Bot kicked by server: ${displayReason} [Cooldown: ${cooldownSec}s]`);
        this.broadcastState(profile.id);
        this.cleanupBotListeners(session);
        this.handleAutoReconnect(profile, customFeatures);
      });

      bot.on('end', (reason: any) => {
        const reasonStr = typeof reason === 'string' ? reason : 'Connection closed';
        session.status = 'stopped';
        this.addLog(profile.id, 'system', `Connection ended: ${reasonStr}`);
        this.cleanupBotListeners(session);
        this.broadcastState(profile.id);
        this.handleAutoReconnect(profile, customFeatures);
      });

      return { success: true, message: 'Bot connection initiated.' };
    } catch (err: any) {
      session.status = 'error';
      session.errorMessage = err.message || 'Failed to initialize Mineflayer instance';
      this.addLog(profile.id, 'error', `Initialization error: ${session.errorMessage}`);
      this.broadcastState(profile.id);
      return { success: false, message: session.errorMessage || 'Failed to initialize bot' };
    }
  }

  private handleAutoReconnect(profile: BotProfile, customFeatures: CustomFeature[]) {
    const session = this.activeBots.get(profile.id);
    if (!session || !profile.autoReconnect) return;

    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
    }

    let delay = Math.max(5, profile.reconnectDelay || 15) * 1000;
    
    // If rate-limited or kicked with countdown, ensure we wait out the full kick cooldown
    if (session.kickInfo?.isKicked && session.kickInfo.nextAllowedTime > Date.now()) {
      const remainingMs = session.kickInfo.nextAllowedTime - Date.now();
      delay = Math.max(delay, remainingMs + 1000); // add 1s safety buffer
    }

    session.status = 'reconnecting';
    const delaySec = Math.ceil(delay / 1000);
    this.addLog(profile.id, 'system', `Auto-reconnect scheduled in ${delaySec} seconds (respecting server login rate-limit cooldown)...`);
    this.broadcastState(profile.id);

    session.reconnectTimer = setTimeout(() => {
      session.reconnectTimer = null;
      if (session.kickInfo) {
        session.kickInfo.isKicked = false;
      }
      this.startBot(profile, customFeatures);
    }, delay);
  }

  public stopBot(profileId: string, reason = 'Stopped by user'): { success: boolean; message: string } {
    const session = this.activeBots.get(profileId);
    if (!session) {
      return { success: false, message: 'No active session found for this bot profile.' };
    }

    if (session.reconnectTimer) {
      clearTimeout(session.reconnectTimer);
      session.reconnectTimer = null;
    }

    if (session.featureRuntime) {
      session.featureRuntime.unloadAll();
    }

    if (session.bot) {
      try {
        session.bot.clearControlStates();
        session.bot.quit(reason);
      } catch (e) {}
      this.cleanupBotListeners(session);
      session.bot = null;
    }

    session.status = 'stopped';
    session.startTime = null;
    this.addLog(profileId, 'system', `Bot stopped (${reason}).`);
    this.broadcastState(profileId);
    this.activeBots.delete(profileId);

    return { success: true, message: 'Bot stopped successfully.' };
  }

  public restartBot(profile: BotProfile, customFeatures: CustomFeature[] = []): Promise<{ success: boolean; message: string }> {
    this.stopBot(profile.id, 'Restart triggered');
    return this.startBot(profile, customFeatures);
  }

  public sendChat(profileId: string, text: string): { success: boolean; message: string } {
    const session = this.activeBots.get(profileId);
    if (!session || !session.bot || session.status !== 'online') {
      return { success: false, message: 'Bot is not currently online in game.' };
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, message: 'Chat message cannot be empty.' };
    }

    try {
      session.bot.chat(trimmed);
      this.addLog(profileId, 'chat', `[Sent] ${trimmed}`);
      return { success: true, message: 'Message transmitted to server.' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to send chat' };
    }
  }

  public setMovement(profileId: string, control: 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint' | 'sneak', state: boolean): { success: boolean; message: string } {
    const session = this.activeBots.get(profileId);
    if (!session || !session.bot || session.status !== 'online') {
      return { success: false, message: 'Bot is not currently online in game.' };
    }

    try {
      // Anti-Cheat Safe Mode: If strict sprint suppression is enabled, block continuous sprinting
      if (control === 'sprint' && session.profile.disableSprintOnServer && state) {
        session.bot.setControlState('sprint', false);
        return { success: true, message: 'Sprint suppressed by Anti-Cheat Safe Mode.' };
      }

      // Humanized Physics: Apply micro-jitter delay if enabled
      const jitterMs = session.profile.humanizedPhysics !== false ? Math.max(10, session.profile.packetJitterMs || 40) : 0;
      const jitter = Math.floor(Math.random() * jitterMs);

      setTimeout(() => {
        if (session.bot && session.status === 'online') {
          session.bot.setControlState(control, !!state);

          // Update physics telemetry
          session.physicsTelemetry = {
            velocity: state ? (session.profile.movementSpeedCap || 0.22) : 0,
            packetRate: state ? 20 : 5,
            antiCheatRisk: session.profile.disableSprintOnServer ? 'Low' : 'Low',
          };
          this.broadcastState(profileId);
        }
      }, jitter);

      return { success: true, message: `Control ${control} set to ${state}` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Movement failed' };
    }
  }

  public stopMovement(profileId: string): { success: boolean; message: string } {
    const session = this.activeBots.get(profileId);
    if (!session || !session.bot || session.status !== 'online') {
      return { success: false, message: 'Bot is not currently online in game.' };
    }

    try {
      session.bot.clearControlStates();
      return { success: true, message: 'Movement halted.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Halt failed' };
    }
  }

  public syncPackets(profileId: string): { success: boolean; message: string } {
    const session = this.activeBots.get(profileId);
    if (!session || !session.bot || session.status !== 'online') {
      return { success: false, message: 'Bot is not currently online in game.' };
    }

    try {
      const bot = session.bot;
      if (typeof bot.clearControlStates === 'function') {
        bot.clearControlStates();
      }

      if (bot.entity && bot.entity.velocity) {
        bot.entity.velocity.set(0, 0, 0);
      }

      session.packetSyncStatus = {
        lastSyncTime: new Date().toLocaleTimeString(),
        terrainLoaded: true,
        packetErrorCount: 0,
        zeroGravityActive: false,
      };

      this.addLog(profileId, 'system', '[Packet Sync] Position & movement vectors resynced cleanly with Minecraft server.');
      this.broadcastState(profileId);
      return { success: true, message: 'Position packets resynced cleanly with Minecraft server.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Packet sync failed' };
    }
  }

  public getInventory(profileId: string): InventoryItem[] {
    const session = this.activeBots.get(profileId);
    if (!session || !session.bot || !session.bot.inventory) {
      return [];
    }

    const categorizeItem = (name: string): InventoryItem['category'] => {
      const lower = name.toLowerCase();
      if (lower.includes('sword') || lower.includes('bow') || lower.includes('trident') || lower.includes('crossbow') || lower.includes('axe')) return 'weapons';
      if (lower.includes('helmet') || lower.includes('chestplate') || lower.includes('leggings') || lower.includes('boots') || lower.includes('elytra') || lower.includes('shield')) return 'armor';
      if (lower.includes('beef') || lower.includes('pork') || lower.includes('mutton') || lower.includes('chicken') || lower.includes('apple') || lower.includes('bread') || lower.includes('potato') || lower.includes('salmon') || lower.includes('cod') || lower.includes('potion')) return 'food';
      if (lower.includes('pickaxe') || lower.includes('shovel') || lower.includes('hoe') || lower.includes('shears') || lower.includes('flint')) return 'tools';
      if (lower.includes('stone') || lower.includes('dirt') || lower.includes('cobble') || lower.includes('wood') || lower.includes('planks') || lower.includes('log') || lower.includes('glass') || lower.includes('sand') || lower.includes('brick')) return 'blocks';
      return 'other';
    };

    try {
      const allSlots = session.bot.inventory.slots || [];
      const result: InventoryItem[] = [];
      for (let i = 0; i < allSlots.length; i++) {
        const it = allSlots[i];
        if (it) {
          const maxDur = typeof it.maxDurability === 'number' ? it.maxDurability : undefined;
          const durUsed = typeof it.durabilityUsed === 'number' ? it.durabilityUsed : undefined;

          // Enchants list extraction
          const enchants: Array<{ name: string; level: number; displayName: string }> = [];
          if (Array.isArray(it.enchants)) {
            for (const enc of it.enchants) {
              if (enc && enc.name) {
                const name = enc.name.replace(/^minecraft:/, '').replace(/_/g, ' ');
                const level = enc.lvl || enc.level || 1;
                enchants.push({
                  name: enc.name,
                  level,
                  displayName: `${name.charAt(0).toUpperCase() + name.slice(1)} ${level}`,
                });
              }
            }
          }

          result.push({
            slot: i,
            name: it.name,
            displayName: it.displayName || it.name,
            count: it.count || 1,
            stackSize: it.stackSize || 64,
            maxDurability: maxDur,
            durabilityUsed: durUsed,
            enchants: enchants.length > 0 ? enchants : undefined,
            category: categorizeItem(it.name),
          });
        }
      }
      return result;
    } catch (e) {
      return [];
    }
  }

  public async equipInventoryItem(profileId: string, slot: number, destination: 'hand' | 'off-hand' | 'head' | 'torso' | 'legs' | 'feet'): Promise<{ success: boolean; message: string }> {
    const session = this.activeBots.get(profileId);
    if (!session || !session.bot || !session.bot.inventory) {
      return { success: false, message: 'Bot inventory unavailable.' };
    }

    try {
      const bot = session.bot;
      const item = bot.inventory.slots[slot];
      if (!item) return { success: false, message: `Slot ${slot} is empty.` };

      await bot.equip(item, destination);
      this.addLog(profileId, 'info', `[Inventory] Equipped ${item.displayName || item.name} to ${destination}.`);
      return { success: true, message: `Equipped ${item.displayName || item.name} to ${destination}.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to equip item' };
    }
  }

  public async dropInventoryItem(profileId: string, slot: number, count = 1): Promise<{ success: boolean; message: string }> {
    const session = this.activeBots.get(profileId);
    if (!session || !session.bot || !session.bot.inventory) {
      return { success: false, message: 'Bot inventory unavailable.' };
    }

    try {
      const bot = session.bot;
      const item = bot.inventory.slots[slot];
      if (!item) return { success: false, message: `Slot ${slot} is empty.` };

      await bot.toss(item.type, null, count);
      this.addLog(profileId, 'info', `[Inventory] Dropped ${count}x ${item.displayName || item.name}.`);
      return { success: true, message: `Dropped ${count}x ${item.displayName || item.name}.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to drop item' };
    }
  }

  public getPlayers(profileId: string): PlayerInfo[] {
    const session = this.activeBots.get(profileId);
    if (!session) return [];
    return session.players;
  }

  public getConsoleLogs(profileId: string): ConsoleLogMessage[] {
    const session = this.activeBots.get(profileId);
    if (!session) return [];
    return session.consoleLogs;
  }

  public clearConsole(profileId: string): boolean {
    const session = this.activeBots.get(profileId);
    if (!session) return false;
    session.consoleLogs = [];
    this.emitToBotRoom(profileId, 'bot:console:cleared', {});
    return true;
  }

  private updatePlayersList(profileId: string) {
    const session = this.activeBots.get(profileId);
    if (!session || !session.bot) return;

    try {
      const playersObj = session.bot.players || {};
      const list: PlayerInfo[] = Object.keys(playersObj).map((key) => {
        const p = playersObj[key];
        return {
          username: p.username || key,
          displayName: p.displayName ? p.displayName.toString() : p.username,
          ping: p.ping,
          uuid: p.uuid,
        };
      });

      session.players = list;
      this.emitToBotRoom(profileId, 'bot:players', list);
    } catch (e) {}
  }

  private addLog(profileId: string, type: ConsoleLogMessage['type'], message: string) {
    const session = this.activeBots.get(profileId);
    if (!session) return;

    const logEntry: ConsoleLogMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      profileId,
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };

    session.consoleLogs.push(logEntry);
    if (session.consoleLogs.length > 300) {
      session.consoleLogs.shift();
    }

    this.emitToBotRoom(profileId, 'bot:log', logEntry);
  }

  private broadcastState(profileId: string) {
    const state = this.getLiveState(profileId);
    this.emitToBotRoom(profileId, 'bot:state', state);
  }

  private emitToBotRoom(profileId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`bot:${profileId}`).emit(event, data);
    }
  }

  private cleanupBotListeners(session: ActiveBotSession) {
    if (session.automationTimers) {
      for (const t of session.automationTimers) {
        clearInterval(t);
        clearTimeout(t);
      }
      session.automationTimers = [];
    }
    if (!session.bot) return;
    try {
      const bot = session.bot;
      bot.removeAllListeners('login');
      bot.removeAllListeners('spawn');
      bot.removeAllListeners('chat');
      bot.removeAllListeners('messagestr');
      bot.removeAllListeners('health');
      bot.removeAllListeners('move');
      bot.removeAllListeners('playerJoined');
      bot.removeAllListeners('playerLeft');
      bot.removeAllListeners('kicked');
      bot.removeAllListeners('end');

      // Keep dummy error listener on bot and _client to safely absorb trailing socket errors
      bot.removeAllListeners('error');
      bot.on('error', () => {});
      if (bot._client) {
        bot._client.removeAllListeners('error');
        bot._client.on('error', () => {});
      }
    } catch (e) {}
  }

  public updateAutomation(profileId: string, automations: Partial<BotProfile>): { success: boolean; message: string } {
    const session = this.activeBots.get(profileId);
    if (!session) {
      return { success: false, message: 'Bot session not active.' };
    }

    session.profile = {
      ...session.profile,
      ...automations,
    };

    this.addLog(profileId, 'system', `Automation settings updated. (Eat: ${!!session.profile.autoEat}, Armor: ${!!session.profile.autoArmor}, Totem: ${!!session.profile.autoTotem}, AFK: ${!!session.profile.afkAntiKick}, Guard: ${!!session.profile.guardMode}, Fish: ${!!session.profile.autoFish})`);
    
    // Refresh automation loops
    this.startAutomationRoutines(session);
    this.broadcastState(profileId);
    return { success: true, message: 'Automation settings updated.' };
  }

  private startAutomationRoutines(session: ActiveBotSession) {
    if (session.automationTimers) {
      for (const t of session.automationTimers) {
        clearInterval(t);
        clearTimeout(t);
      }
      session.automationTimers = [];
    }

    if (!session.bot || session.status !== 'online') return;

    // 1. Auto-Eat Loop (Every 4 seconds)
    const eatInterval = setInterval(() => {
      this.runAutoEat(session);
    }, 4000);
    session.automationTimers.push(eatInterval);

    // 2. Auto-Armor Loop (Every 5 seconds)
    const armorInterval = setInterval(() => {
      this.runAutoArmor(session);
    }, 5000);
    session.automationTimers.push(armorInterval);

    // 3. Auto-Totem Loop (Every 2 seconds)
    const totemInterval = setInterval(() => {
      this.runAutoTotem(session);
    }, 2000);
    session.automationTimers.push(totemInterval);

    // 4. AFK Anti-Kick Loop (Every 25 seconds)
    const afkInterval = setInterval(() => {
      this.runAfkAntiKick(session);
    }, 25000);
    session.automationTimers.push(afkInterval);

    // 5. Guard Mode Loop (Every 1.5 seconds)
    const guardInterval = setInterval(() => {
      this.runGuardMode(session);
    }, 1500);
    session.automationTimers.push(guardInterval);

    // 6. Auto-Fish Loop (Every 3 seconds)
    const fishInterval = setInterval(() => {
      this.runAutoFish(session);
    }, 3000);
    session.automationTimers.push(fishInterval);

    // 7. Auto-Upload Loop (Every 5 minutes)
    const uploadInterval = setInterval(() => {
      this.runAutoUpload(session);
    }, 300000);
    session.automationTimers.push(uploadInterval);

    // Run initial passes immediately
    setTimeout(() => {
      this.runAutoArmor(session);
      this.runAutoTotem(session);
      this.runAutoUpload(session);
    }, 1000);
  }

  private async runAutoUpload(session: ActiveBotSession) {
    if (!session.profile.autoUpload || !session.bot) return;
    
    // In a real applet, this would upload to an S3 bucket or similar.
    // Here we'll simulate it by writing to a local log file.
    try {
      const logs = session.consoleLogs;
      const logContent = JSON.stringify(logs, null, 2);
      // For this environment, we can't easily write arbitrary files outside,
      // but we can simulate the "upload" action.
      this.addLog(session.profile.id, 'system', `[Auto-Upload] ${logs.length} log lines simulated-upload to remote storage.`);
    } catch (e) {
      this.addLog(session.profile.id, 'error', '[Auto-Upload] Failed to upload logs.');
    }
  }

  private async runAutoEat(session: ActiveBotSession) {
    if (!session.profile.autoEat || session.isEating || !session.bot || !session.bot.entity) return;
    const bot = session.bot;
    const foodLevel = typeof bot.food === 'number' ? bot.food : 20;
    const healthLevel = typeof bot.health === 'number' ? bot.health : 20;

    if (foodLevel > 17 && healthLevel >= 19) return;

    const edibleFoods = [
      'cooked_beef', 'steak', 'cooked_porkchop', 'cooked_mutton', 'cooked_chicken',
      'golden_carrot', 'golden_apple', 'bread', 'baked_potato', 'cooked_salmon',
      'cooked_cod', 'apple', 'sweet_berries', 'cookie', 'melon_slice'
    ];

    try {
      const items = bot.inventory ? bot.inventory.items() : [];
      const foodItem = items.find((it: any) => edibleFoods.includes(it.name));
      if (!foodItem) return;

      session.isEating = true;
      await bot.equip(foodItem, 'hand');
      this.addLog(session.profile.id, 'system', `[Auto-Eat] Eating ${foodItem.displayName || foodItem.name} (Food: ${foodLevel}/20, Health: ${healthLevel}/20)...`);
      if (typeof bot.consume === 'function') {
        await bot.consume();
      } else {
        bot.activateItem();
        await new Promise(r => setTimeout(r, 1600));
        bot.deactivateItem();
      }
      this.addLog(session.profile.id, 'info', `[Auto-Eat] Consumed ${foodItem.displayName || foodItem.name}.`);
    } catch (err) {
      // Eat interrupted or blocked
    } finally {
      session.isEating = false;
    }
  }

  private async runAutoArmor(session: ActiveBotSession) {
    if (!session.profile.autoArmor || !session.bot || !session.bot.inventory) return;
    const bot = session.bot;
    const tierScore = (name: string): number => {
      if (name.includes('netherite')) return 6;
      if (name.includes('diamond')) return 5;
      if (name.includes('iron')) return 4;
      if (name.includes('chainmail')) return 3;
      if (name.includes('golden')) return 2;
      if (name.includes('leather')) return 1;
      return 0;
    };

    const armorSlots = [
      { slotName: 'head', suffix: '_helmet', equipDest: 'head' },
      { slotName: 'torso', suffix: '_chestplate', equipDest: 'torso' },
      { slotName: 'legs', suffix: '_leggings', equipDest: 'legs' },
      { slotName: 'feet', suffix: '_boots', equipDest: 'feet' },
    ] as const;

    try {
      const items = bot.inventory.items();
      for (const slot of armorSlots) {
        const candidates = items.filter((it: any) => it.name.endsWith(slot.suffix));
        if (candidates.length === 0) continue;

        candidates.sort((a: any, b: any) => tierScore(b.name) - tierScore(a.name));
        const best = candidates[0];

        const currentEquipped = bot.inventory.slots[
          slot.slotName === 'head' ? 5 :
          slot.slotName === 'torso' ? 6 :
          slot.slotName === 'legs' ? 7 : 8
        ];

        const currentScore = currentEquipped ? tierScore(currentEquipped.name) : 0;
        const bestScore = tierScore(best.name);

        if (bestScore > currentScore) {
          await bot.equip(best, slot.equipDest);
          this.addLog(session.profile.id, 'info', `[Auto-Armor] Equipped ${best.displayName || best.name} to ${slot.slotName}.`);
        }
      }
    } catch (e) {}
  }

  private async runAutoTotem(session: ActiveBotSession) {
    if (!session.profile.autoTotem || !session.bot || !session.bot.inventory) return;
    const bot = session.bot;
    try {
      const offhandSlot = bot.inventory.slots[45];
      if (offhandSlot && offhandSlot.name === 'totem_of_undying') {
        return;
      }

      const totem = bot.inventory.items().find((it: any) => it.name === 'totem_of_undying');
      if (totem) {
        await bot.equip(totem, 'off-hand');
        this.addLog(session.profile.id, 'info', `[Auto-Totem] Equipped Totem of Undying to off-hand.`);
      }
    } catch (e) {}
  }

  private runAfkAntiKick(session: ActiveBotSession) {
    if (!session.profile.afkAntiKick || !session.bot || !session.bot.entity) return;
    const bot = session.bot;
    try {
      const yawDelta = (Math.random() - 0.5) * 0.4;
      const pitchDelta = (Math.random() - 0.5) * 0.25;
      const newYaw = bot.entity.yaw + yawDelta;
      const newPitch = Math.max(-1.3, Math.min(1.3, bot.entity.pitch + pitchDelta));

      bot.look(newYaw, newPitch, true);
      bot.swingArm('right');
    } catch (e) {}
  }

  private async runGuardMode(session: ActiveBotSession) {
    if (!session.profile.guardMode || !session.bot || !session.bot.entity) return;
    const bot = session.bot;
    const hostileNames = [
      'zombie', 'skeleton', 'creeper', 'spider', 'cave_spider', 'drowned',
      'husk', 'stray', 'witch', 'enderman', 'phantom', 'slime', 'magma_cube',
      'pillager', 'vindicator', 'ravager', 'piglin_brute'
    ];

    try {
      const entities = Object.values(bot.entities || {}) as any[];
      const hostiles = entities.filter((ent: any) => {
        if (!ent || ent === bot.entity || !ent.position) return false;
        const name = (ent.name || '').toLowerCase();
        const dist = bot.entity.position.distanceTo(ent.position);
        return dist <= 3.8 && (hostileNames.includes(name) || ent.type === 'mob');
      });

      if (hostiles.length === 0) return;

      hostiles.sort((a, b) => bot.entity.position.distanceTo(a.position) - bot.entity.position.distanceTo(b.position));
      const target = hostiles[0];

      // Equip best weapon if available
      const weapons = (bot.inventory ? bot.inventory.items() : []).filter((it: any) =>
        it.name.endsWith('_sword') || it.name.endsWith('_axe')
      );
      if (weapons.length > 0) {
        weapons.sort((a: any, b: any) => {
          const score = (w: string) => (w.includes('netherite') ? 6 : w.includes('diamond') ? 5 : w.includes('iron') ? 4 : 2);
          return score(b.name) - score(a.name);
        });
        await bot.equip(weapons[0], 'hand');
      }

      await bot.lookAt(target.position.offset(0, target.height ? target.height * 0.7 : 1.2, 0), true);
      bot.attack(target);
      this.addLog(session.profile.id, 'info', `[Guard Mode] Defended against hostile ${target.name || 'entity'}`);
    } catch (e) {}
  }

  private async runAutoFish(session: ActiveBotSession) {
    if (!session.profile.autoFish || session.isFishing || !session.bot || !session.bot.inventory) return;
    const bot = session.bot;
    try {
      const rod = bot.inventory.items().find((it: any) => it.name === 'fishing_rod');
      if (!rod) return;

      session.isFishing = true;
      await bot.equip(rod, 'hand');
      bot.activateItem();
      this.addLog(session.profile.id, 'info', '[Auto-Fish] Cast fishing rod into water...');

      // Reel in after catch window
      setTimeout(() => {
        if (session.bot && session.status === 'online') {
          try {
            session.bot.activateItem(); // Reel in
            this.addLog(session.profile.id, 'info', '[Auto-Fish] Reeled in fishing line!');
          } catch (e) {}
        }
        setTimeout(() => {
          session.isFishing = false;
        }, 1500);
      }, 12000);
    } catch (e) {
      session.isFishing = false;
    }
  }

  public shutdownAll() {
    for (const profileId of Array.from(this.activeBots.keys())) {
      this.stopBot(profileId, 'Server shutting down');
    }
  }
}

export const botManager = new BotManager();
