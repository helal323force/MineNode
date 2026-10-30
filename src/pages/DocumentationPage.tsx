import React from 'react';
import { 
  BookOpen, 
  Terminal, 
  ShieldCheck, 
  Server, 
  Layers, 
  ExternalLink, 
  Copy, 
  Check 
} from 'lucide-react';

export function DocumentationPage() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 text-neutral-300">
      <div>
        <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">Technical Documentation</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">MineNode Platform Guide</h1>
        <p className="text-sm text-neutral-400 mt-2">
          Architecture, bot runtime lifecycle, custom features manifest specification, and deployment blueprints.
        </p>
      </div>

      {/* Navigation index */}
      <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <a href="#quickstart" className="text-neutral-300 hover:text-emerald-400">1. Quickstart & Profiles</a>
        <a href="#auth" className="text-neutral-300 hover:text-emerald-400">2. Minecraft Authentication</a>
        <a href="#control-panel" className="text-neutral-300 hover:text-emerald-400">3. Control Panel Usage</a>
        <a href="#features" className="text-neutral-300 hover:text-emerald-400">4. Custom Features (ZIP)</a>
        <a href="#firebase" className="text-neutral-300 hover:text-emerald-400">5. Firebase & Security Rules</a>
        <a href="#env-vars" className="text-neutral-300 hover:text-emerald-400">6. Environment Variables</a>
        <a href="#render" className="text-neutral-300 hover:text-emerald-400">7. Render Deployment</a>
        <a href="#vps" className="text-neutral-300 hover:text-emerald-400">8. VPS Migration</a>
      </div>

      {/* Section 1: Quickstart */}
      <section id="quickstart" className="space-y-4">
        <h2 className="text-xl font-bold text-white">1. Creating Bot Profiles & Starting Bots</h2>
        <p className="text-sm leading-relaxed">
          MineNode hosts genuine Mineflayer bots connecting directly through TCP sockets to your designated Minecraft Java Edition server.
        </p>
        <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-neutral-300">
          <li>Navigate to the <strong>Dashboard</strong> and click <strong>Create Bot Profile</strong>.</li>
          <li>Enter a descriptive name, server hostname (e.g. <code className="text-emerald-300">play.hypixel.net</code>, <code className="text-emerald-300">mc.example.com</code>, or an IP), and server port (standard: <code className="text-emerald-300">25565</code>).</li>
          <li>Choose an in-game bot username. If the server is offline/cracked, choose any unique nickname.</li>
          <li>Select either <strong>Auto-negotiate</strong> version or pin a specific version (e.g. <code className="text-emerald-300">1.20.4</code>).</li>
          <li>Click <strong>Start Bot</strong> on the profile card or control panel to initiate the live connection.</li>
        </ol>
      </section>

      {/* Section 2: Auth Modes */}
      <section id="auth" className="space-y-4">
        <h2 className="text-xl font-bold text-white">2. Minecraft Authentication</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-[#121417] border border-neutral-800 rounded-xl space-y-2">
            <h3 className="font-semibold text-white">Offline / Cracked Authentication</h3>
            <p className="text-neutral-400">
              For private, self-hosted, or cracked servers (<code className="text-neutral-300">online-mode=false</code>). The bot connects immediately using the specified username without external password requirements.
            </p>
          </div>
          <div className="p-4 bg-[#121417] border border-neutral-800 rounded-xl space-y-2">
            <h3 className="font-semibold text-white">Microsoft Premium OAuth</h3>
            <p className="text-neutral-400">
              For official Mojang/Microsoft authenticated servers. MineNode utilizes Microsoft's official device code flow. We never ask for or store your Microsoft account password. When connecting, visit <code className="text-emerald-300">microsoft.com/link</code> and input the one-time code.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Control Panel */}
      <section id="control-panel" className="space-y-4">
        <h2 className="text-xl font-bold text-white">3. Bot Control Panel Operation</h2>
        <div className="space-y-2 text-xs leading-relaxed">
          <p>The Bot Control Panel features 8 specialized operational tabs:</p>
          <ul className="list-disc list-inside space-y-1 text-neutral-400 pl-2">
            <li><strong className="text-white">Overview:</strong> Real-time health hearts, hunger level, ping, active dimension, and spatial coordinates.</li>
            <li><strong className="text-white">Console:</strong> Live stdout stream from the bot thread with filtering and clear console capability.</li>
            <li><strong className="text-white">Chat:</strong> Real-time Minecraft chat listener and sender. Enter commands like <code className="text-emerald-300">/help</code> directly.</li>
            <li><strong className="text-white">Players:</strong> Live roster of all online players in the server chunk.</li>
            <li><strong className="text-white">Inventory:</strong> Visual 36-slot inventory inspector showing stack counts.</li>
            <li><strong className="text-white">Movement:</strong> Virtual directional pad invoking genuine <code className="text-emerald-300">bot.setControlState()</code> commands.</li>
            <li><strong className="text-white">Features:</strong> Enable or disable modular scripts per bot.</li>
          </ul>
        </div>
      </section>

      {/* Section 4: Custom Features */}
      <section id="features" className="space-y-4">
        <h2 className="text-xl font-bold text-white">4. Custom Feature Packages (ZIP Architecture)</h2>
        <p className="text-sm leading-relaxed">
          Users can upload custom feature packages as standard ZIP files containing a <code className="text-emerald-300 font-mono">manifest.json</code> and entry point script (e.g. <code className="text-emerald-300 font-mono">index.js</code>).
        </p>

        <div className="bg-[#0b0c0e] border border-neutral-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-neutral-300">
          <div className="text-neutral-500 mb-2">// manifest.json specification</div>
{`{
  "name": "Auto-Greeter",
  "description": "Welcomes new players to the server.",
  "version": "1.0.0",
  "entryPoint": "index.js",
  "botApiVersion": "1.0",
  "permissions": ["chat", "events"],
  "configSchema": {
    "greeting": { "type": "string", "label": "Welcome Message", "default": "Hello!" }
  }
}`}
        </div>

        <div className="bg-[#0b0c0e] border border-neutral-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-neutral-300">
          <div className="text-neutral-500 mb-2">// index.js execution script</div>
{`// Sandboxed API exposed strictly based on declared permissions:
api.log("Custom feature loaded!");

api.events.on('playerJoined', function(player) {
  api.chat.send("Welcome to the server, " + player.username + "!");
});`}
        </div>

        <div className="p-4 bg-[#121417] border border-neutral-800 rounded-xl text-xs space-y-2">
          <h4 className="font-semibold text-white">Security & Isolation Guarantee</h4>
          <p className="text-neutral-400">
            Uploaded features execute inside an isolated Node.js VM context. Access to <code className="text-red-300">process</code>, <code className="text-red-300">require</code>, <code className="text-red-300">fs</code>, and sockets is strictly forbidden. A crash in a custom feature is trapped by sandboxed error boundaries and will never terminate the Mineflayer bot or host server.
          </p>
        </div>
      </section>

      {/* Section 5: Firebase */}
      <section id="firebase" className="space-y-4">
        <h2 className="text-xl font-bold text-white">5. Firebase Configuration & Security Rules</h2>
        <p className="text-sm leading-relaxed">
          MineNode utilizes Firebase Firestore for profile storage and Firebase Authentication for secure operator login.
        </p>

        <div className="bg-[#0b0c0e] border border-neutral-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-neutral-300">
          <div className="text-neutral-500 mb-2">// firestore.rules excerpt</div>
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }

    function isSignedIn() { return request.auth != null; }
    function isAdmin() { return request.auth.token.email == 'wingxmc26@gmail.com'; }

    match /users/{userId} {
      allow get: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow list: if isAdmin();
    }
    match /botProfiles/{profileId} {
      allow read, write: if isSignedIn() && (resource.data.userId == request.auth.uid || isAdmin());
    }
  }
}`}
        </div>
      </section>

      {/* Section 6: Environment Variables */}
      <section id="env-vars" className="space-y-4">
        <h2 className="text-xl font-bold text-white">6. Environment Variables (.env.example)</h2>
        <div className="bg-[#0b0c0e] border border-neutral-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-neutral-300">
{`PORT=3000
NODE_ENV=production
ADMIN_EMAIL=wingxmc26@gmail.com
DEFAULT_BOT_LIMIT=3
DEFAULT_FEATURE_LIMIT=5

# Firebase Public Configuration
VITE_FIREBASE_API_KEY=AIzaSyD-CPX3R-MmTE9_qJn3hzgd6XVckHy_BRw
VITE_FIREBASE_AUTH_DOMAIN=minecraft-bot-hosting.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=minecraft-bot-hosting`}
        </div>
      </section>

      {/* Section 7: Render Deployment */}
      <section id="render" className="space-y-4">
        <h2 className="text-xl font-bold text-white">7. Render Deployment Guide</h2>
        <ol className="list-decimal list-inside space-y-2 text-xs leading-relaxed text-neutral-300">
          <li>Create a new <strong>Web Service</strong> on <a href="https://render.com" target="_blank" rel="noreferrer" className="text-emerald-400 underline">Render.com</a> linked to your Git repository.</li>
          <li>Set <strong>Environment</strong> to <code className="text-emerald-300">Node</code>.</li>
          <li>Set <strong>Build Command</strong> to: <code className="text-emerald-300 font-mono">npm install && npm run build</code></li>
          <li>Set <strong>Start Command</strong> to: <code className="text-emerald-300 font-mono">npm start</code></li>
          <li>Set Health Check Path to <code className="text-emerald-300 font-mono">/health</code></li>
          <li>Add your environment variables from <code className="text-emerald-300 font-mono">.env.example</code>.</li>
        </ol>
      </section>

      {/* Section 8: VPS Migration */}
      <section id="vps" className="space-y-4">
        <h2 className="text-xl font-bold text-white">8. Future VPS / Dedicated Server Migration</h2>
        <p className="text-sm leading-relaxed">
          Migrating MineNode to a high-capacity VPS (Ubuntu/Debian) with PM2 process manager:
        </p>

        <div className="bg-[#0b0c0e] border border-neutral-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-neutral-300 space-y-1">
          <div>sudo apt update && sudo apt install -y nodejs npm git</div>
          <div>git clone &lt;your-repo-url&gt; minenode && cd minenode</div>
          <div>npm install</div>
          <div>npm run build</div>
          <div>npm install -g pm2</div>
          <div>pm2 start server.ts --interpreter tsx --name "minenode"</div>
          <div>pm2 save && pm2 startup</div>
        </div>
      </section>
    </div>
  );
}
