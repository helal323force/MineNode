import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { 
  Bot, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Server, 
  Layers, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink 
} from 'lucide-react';

interface LandingPageProps {
  setCurrentTab: (tab: string) => void;
}

export function LandingPage({ setCurrentTab }: LandingPageProps) {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen bg-[#0c0d0e] text-neutral-100 flex flex-col">
      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-20 pb-16 max-w-7xl mx-auto w-full">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-400 mb-4 tracking-wide uppercase">
            <span>Minecraft Java Edition</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>Real Mineflayer Engine</span>
            <span aria-hidden="true" className="text-neutral-600">·</span>
            <span>Zero Mock Telemetry</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-6 leading-tight">
            Professional Minecraft bot hosting with authentic runtime controls.
          </h1>
          
          <p className="text-lg text-neutral-400 mb-8 leading-relaxed max-w-2xl">
            Deploy, supervise, and control Minecraft Java bots directly from your browser. Connect to real servers with live console streaming, bi-directional chat, movement coordination, and secure sandboxed custom features.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setCurrentTab(currentUser ? 'dashboard' : 'register')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <span>{currentUser ? 'Open Bot Dashboard' : 'Deploy Your First Bot'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentTab('docs')}
              className="inline-flex items-center gap-2 px-5 py-3 text-sm font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <span>Read Architecture Specs</span>
            </button>
          </div>
        </div>

        {/* Real Architecture Indicators Strip */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-neutral-800/80 pt-8">
          <div>
            <div className="text-xs text-neutral-500 mb-1">Target Platform</div>
            <div className="text-sm font-semibold text-neutral-200">Java Edition Only</div>
            <div className="text-xs text-neutral-500">v1.8.x through 1.20.4+</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Engine Core</div>
            <div className="text-sm font-semibold text-neutral-200">Mineflayer Runtime</div>
            <div className="text-xs text-neutral-500">Node.js worker process</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Authentication</div>
            <div className="text-sm font-semibold text-neutral-200">Cracked & Microsoft OAuth</div>
            <div className="text-xs text-neutral-500">Passwordless device code</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 mb-1">Real-Time Sync</div>
            <div className="text-sm font-semibold text-neutral-200">WebSocket / Socket.IO</div>
            <div className="text-xs text-neutral-500">Sub-100ms bidirectional pipe</div>
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto w-full border-t border-neutral-800/60">
        <div className="mb-12 max-w-2xl">
          <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">Capabilities</div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Built for operators who require actual server fidelity.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#111315] border border-neutral-800/80 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <Terminal className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Live Console & Bi-directional Chat</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Stream raw protocol logs, connection state changes, and chat feeds directly from the Mineflayer instance. Execute native server commands and send chat messages in real time.
            </p>
          </div>

          <div className="bg-[#111315] border border-neutral-800/80 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Live Inventory & Movement</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Inspect your bot's 36-slot Minecraft inventory in a live read-only layout. Issue genuine Mineflayer movement controls: forward, backward, strafe, jump, and sprint with virtual D-pad inputs.
            </p>
          </div>

          <div className="bg-[#111315] border border-neutral-800/80 rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Sandboxed ZIP Feature Packages</h3>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Upload custom modular JavaScript features packaged as ZIP files. Features run in strictly isolated Node VM contexts with granular permissions, timeouts, and crash protection.
            </p>
          </div>
        </div>
      </section>

      {/* Technical Architecture Comparison */}
      <section className="px-4 sm:px-6 lg:px-8 py-16 max-w-7xl mx-auto w-full border-t border-neutral-800/60">
        <div className="bg-[#121417] border border-neutral-800 rounded-2xl p-6 sm:p-10">
          <div className="max-w-2xl mb-8">
            <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider mb-2">Production Architecture</div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
              Render-Ready & Future VPS Migration Designed
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              MineNode packages the entire web frontend, Express API routes, Socket.IO channels, and Mineflayer bot runtime within a unified, stateless server architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-[#16181b] p-4 rounded-xl border border-neutral-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">Official Microsoft OAuth Flow</div>
                <div className="text-neutral-400 text-xs">Zero password exposure. Authenticate premium accounts via official device code prompts at microsoft.com/link.</div>
              </div>
            </div>
            <div className="bg-[#16181b] p-4 rounded-xl border border-neutral-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">Server-Side Admin Enforcement</div>
                <div className="text-neutral-400 text-xs">Admin privileges verified on every backend request. Frontend client checks are never trusted for authorization.</div>
              </div>
            </div>
            <div className="bg-[#16181b] p-4 rounded-xl border border-neutral-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">Automated Reconnection Recovery</div>
                <div className="text-neutral-400 text-xs">Configurable per-profile backoff logic gracefully reconnects after server restarts or network blips.</div>
              </div>
            </div>
            <div className="bg-[#16181b] p-4 rounded-xl border border-neutral-800 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-medium text-white mb-1">Crash-Isolated Custom Features</div>
                <div className="text-neutral-400 text-xs">Uploaded feature packages operate within memory boundaries; feature errors never crash the bot or server.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-800/80 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
        <div>
          MineNode · Dedicated Minecraft Java Bot Hosting Platform
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setCurrentTab('docs')} className="hover:text-neutral-300 transition-colors">
            Documentation
          </button>
          <a href="/health" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors flex items-center gap-1">
            <span>Health Check</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}
