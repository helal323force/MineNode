import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useBot } from '../context/BotContext.js';
import { BotProfile } from '../types.js';
import { 
  Plus, 
  Play, 
  Square, 
  RotateCw, 
  Terminal, 
  Sliders, 
  Trash2, 
  Server, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Activity, 
  ShieldAlert,
  ArrowRight,
  X,
  Key,
  Lock,
  Eye,
  EyeOff,
  Utensils,
  Shield,
  Crosshair,
  Fish,
  Footprints,
  Zap,
  Sparkles
} from 'lucide-react';

interface DashboardPageProps {
  setCurrentTab: (tab: string) => void;
}

export function DashboardPage({ setCurrentTab }: DashboardPageProps) {
  const { account, currentUser } = useAuth();
  const { 
    profiles, 
    activeStates, 
    selectedProfileId, 
    setSelectedProfileId, 
    createProfile, 
    updateProfile, 
    deleteProfile, 
    startBot, 
    stopBot, 
    restartBot 
  } = useBot();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BotProfile | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string; createdProfileId?: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [serverHost, setServerHost] = useState('');
  const [serverPort, setServerPort] = useState(25565);
  const [botUsername, setBotUsername] = useState('');
  const [authType, setAuthType] = useState<'offline' | 'microsoft'>('offline');
  const [version, setVersion] = useState('auto');
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [reconnectDelay, setReconnectDelay] = useState(15);
  const [autoLogin, setAutoLogin] = useState(true);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCommand, setLoginCommand] = useState('auto');
  const [showPassword, setShowPassword] = useState(false);

  // Automations state
  const [autoEat, setAutoEat] = useState(true);
  const [autoArmor, setAutoArmor] = useState(true);
  const [autoTotem, setAutoTotem] = useState(true);
  const [afkAntiKick, setAfkAntiKick] = useState(false);
  const [guardMode, setGuardMode] = useState(false);
  const [autoFish, setAutoFish] = useState(false);

  const runningCount = profiles.filter(p => activeStates[p.id]?.status === 'online').length;
  const activeCount = profiles.filter(p => {
    const st = activeStates[p.id]?.status;
    return st === 'online' || st === 'connecting' || st === 'reconnecting';
  }).length;
  const stoppedCount = profiles.length - activeCount;
  const maxBots = account?.botLimit || 3;

  const openCreateModal = () => {
    setEditingProfile(null);
    setName('');
    setServerHost('localhost');
    setServerPort(25565);
    setBotUsername(`Bot_${Math.floor(1000 + Math.random() * 9000)}`);
    setAuthType('offline');
    setVersion('auto');
    setAutoReconnect(true);
    setReconnectDelay(15);
    setAutoLogin(true);
    setLoginPassword('');
    setLoginCommand('auto');
    setShowPassword(false);
    setAutoEat(true);
    setAutoArmor(true);
    setAutoTotem(true);
    setAfkAntiKick(false);
    setGuardMode(false);
    setAutoFish(false);
    setModalOpen(true);
  };

  const openEditModal = (p: BotProfile) => {
    setEditingProfile(p);
    setName(p.name);
    setServerHost(p.serverHost);
    setServerPort(p.serverPort || 25565);
    setBotUsername(p.botUsername);
    setAuthType(p.authType);
    setVersion(p.version || 'auto');
    setAutoReconnect(p.autoReconnect);
    setReconnectDelay(p.reconnectDelay || 15);
    setAutoLogin(p.autoLogin !== undefined ? p.autoLogin : true);
    setLoginPassword(p.loginPassword || '');
    setLoginCommand(p.loginCommand || 'auto');
    setShowPassword(false);
    setAutoEat(p.autoEat !== undefined ? p.autoEat : true);
    setAutoArmor(p.autoArmor !== undefined ? p.autoArmor : true);
    setAutoTotem(p.autoTotem !== undefined ? p.autoTotem : true);
    setAfkAntiKick(Boolean(p.afkAntiKick));
    setGuardMode(Boolean(p.guardMode));
    setAutoFish(Boolean(p.autoFish));
    setModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !serverHost || !botUsername) {
      setFeedbackMessage({ type: 'error', text: 'Please fill in all required profile fields.' });
      return;
    }

    const cleanHost = serverHost.trim().replace(/\s+/g, '');
    const cleanUser = botUsername.trim().replace(/\s+/g, '_');
    setIsSubmitting(true);

    try {
      if (editingProfile) {
        await updateProfile({
          ...editingProfile,
          name: name.trim(),
          serverHost: cleanHost,
          serverPort: Number(serverPort) || 25565,
          botUsername: cleanUser,
          authType,
          version,
          autoReconnect,
          reconnectDelay: Number(reconnectDelay) || 15,
          autoLogin,
          loginPassword: loginPassword.trim() || undefined,
          loginCommand: loginCommand || 'auto',
          autoEat,
          autoArmor,
          autoTotem,
          afkAntiKick,
          guardMode,
          autoFish,
        });
        setModalOpen(false);
        setFeedbackMessage({ type: 'success', text: `Profile "${name}" successfully updated.` });
      } else {
        const newId = await createProfile({
          name: name.trim(),
          serverHost: cleanHost,
          serverPort: Number(serverPort) || 25565,
          botUsername: cleanUser,
          authType,
          version,
          autoReconnect,
          reconnectDelay: Number(reconnectDelay) || 15,
          autoLogin,
          loginPassword: loginPassword.trim() || undefined,
          loginCommand: loginCommand || 'auto',
          autoEat,
          autoArmor,
          autoTotem,
          afkAntiKick,
          guardMode,
          autoFish,
          activeFeatures: ['feat-auto-greet', 'feat-auto-login'],
        });
        setSelectedProfileId(newId);
        setModalOpen(false);
        setFeedbackMessage({ 
          type: 'success', 
          text: `Bot profile "${name}" successfully created!`,
          createdProfileId: newId 
        });
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to save profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async (p: BotProfile) => {
    setActionLoading(prev => ({ ...prev, [p.id]: true }));
    setFeedbackMessage(null);
    const res = await startBot(p);
    setActionLoading(prev => ({ ...prev, [p.id]: false }));
    if (!res.success) {
      setFeedbackMessage({ type: 'error', text: res.message });
    } else {
      setFeedbackMessage({ type: 'success', text: `Connection started for ${p.name}.` });
    }
  };

  const handleStop = async (p: BotProfile) => {
    setActionLoading(prev => ({ ...prev, [p.id]: true }));
    setFeedbackMessage(null);
    const res = await stopBot(p.id);
    setActionLoading(prev => ({ ...prev, [p.id]: false }));
    if (!res.success) {
      setFeedbackMessage({ type: 'error', text: res.message });
    } else {
      setFeedbackMessage({ type: 'success', text: `Bot ${p.name} stopped.` });
    }
  };

  const handleRestart = async (p: BotProfile) => {
    setActionLoading(prev => ({ ...prev, [p.id]: true }));
    setFeedbackMessage(null);
    const res = await restartBot(p);
    setActionLoading(prev => ({ ...prev, [p.id]: false }));
    if (!res.success) {
      setFeedbackMessage({ type: 'error', text: res.message });
    } else {
      setFeedbackMessage({ type: 'success', text: `Restart initiated for ${p.name}.` });
    }
  };

  const handleDelete = async (id: string, profileName: string) => {
    if (confirm(`Are you sure you want to delete profile "${profileName}"?`)) {
      await deleteProfile(id);
      setFeedbackMessage({ type: 'success', text: `Profile "${profileName}" deleted.` });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Overview Metric Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bot Operations Overview</h1>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
            <span>Operator: {account?.displayName || currentUser?.email}</span>
            <span aria-hidden="true">·</span>
            <span>Plan Limit: {maxBots} Active Bots</span>
            <span aria-hidden="true">·</span>
            <span className={activeCount >= maxBots ? 'text-amber-400 font-medium' : 'text-emerald-400'}>
              {activeCount} of {maxBots} Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Bot Profile</span>
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div className={`p-3 rounded-lg text-xs flex items-center justify-between ${
          feedbackMessage.type === 'error'
            ? 'bg-red-500/10 border border-red-500/20 text-red-300'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
        }`}>
          <div className="flex items-center gap-3">
            <span>{feedbackMessage.text}</span>
            {feedbackMessage.createdProfileId && (
              <button
                onClick={() => {
                  setSelectedProfileId(feedbackMessage.createdProfileId!);
                  setCurrentTab('control-panel');
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-400 text-neutral-950 font-semibold hover:bg-emerald-300 transition-colors cursor-pointer shadow-sm"
              >
                <span>Open Control Panel</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <button onClick={() => setFeedbackMessage(null)} className="text-neutral-400 hover:text-white cursor-pointer ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#121417] border border-neutral-800/80 rounded-xl p-4">
          <div className="text-xs text-neutral-400 mb-1">Total Profiles</div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">{profiles.length}</div>
          <div className="text-[11px] text-neutral-500 mt-1">Saved configurations</div>
        </div>

        <div className="bg-[#121417] border border-neutral-800/80 rounded-xl p-4">
          <div className="text-xs text-neutral-400 mb-1">Running Bots</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">{runningCount}</div>
          <div className="text-[11px] text-neutral-500 mt-1">Authenticated in world</div>
        </div>

        <div className="bg-[#121417] border border-neutral-800/80 rounded-xl p-4">
          <div className="text-xs text-neutral-400 mb-1">Stopped / Standby</div>
          <div className="text-2xl font-bold text-neutral-300 font-mono tabular-nums">{stoppedCount}</div>
          <div className="text-[11px] text-neutral-500 mt-1">Idle instances</div>
        </div>

        <div className="bg-[#121417] border border-neutral-800/80 rounded-xl p-4">
          <div className="text-xs text-neutral-400 mb-1">Quota Capacity</div>
          <div className="text-2xl font-bold text-white font-mono tabular-nums">
            {Math.round((activeCount / maxBots) * 100)}%
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">{maxBots - activeCount} slots remaining</div>
        </div>
      </div>

      {/* Bot Profiles List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Configured Bot Instances</h2>
          <span className="text-xs text-neutral-500">{profiles.length} total profiles</span>
        </div>

        {profiles.length === 0 ? (
          <div className="bg-[#121417] border border-dashed border-neutral-800 rounded-2xl p-12 text-center">
            <Server className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">No bot profiles configured</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mb-6">
              Create your first Minecraft Java Edition bot profile to connect to any online or offline server.
            </p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Bot Profile</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => {
              const liveState = activeStates[p.id];
              const status = liveState?.status || 'stopped';
              const isLoading = actionLoading[p.id];

              const statusColor = 
                status === 'online' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                status === 'connecting' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                status === 'reconnecting' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                status === 'error' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                status === 'kicked' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                'text-neutral-400 border-neutral-800 bg-neutral-900';

              return (
                <div key={p.id} className="bg-[#121417] border border-neutral-800/80 rounded-xl p-5 flex flex-col justify-between hover:border-neutral-700 transition-colors">
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white tracking-tight">{p.name}</h3>
                        <div className="text-xs text-neutral-400 font-mono mt-0.5">{p.botUsername}</div>
                      </div>
                      <span className={`px-2 py-0.5 text-[11px] font-medium border rounded capitalize ${statusColor}`}>
                        {status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-neutral-400 py-3 border-y border-neutral-800/80 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Target Server</span>
                        <span className="font-mono text-neutral-200">{p.serverHost}:{p.serverPort || 25565}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-neutral-500">Auth Mode</span>
                        <span className="capitalize text-neutral-300">{p.authType}</span>
                      </div>
                      {liveState?.status === 'online' && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Uptime</span>
                            <span className="font-mono tabular-nums text-neutral-200">
                              {Math.floor(liveState.uptime / 60)}m {liveState.uptime % 60}s
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-500">Server Ping</span>
                            <span className="font-mono tabular-nums text-neutral-200">{liveState.ping} ms</span>
                          </div>
                        </>
                      )}
                      {liveState?.errorMessage && (
                        <div className="text-[11px] text-red-400 truncate pt-1">
                          {liveState.errorMessage}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {status === 'online' || status === 'connecting' ? (
                        <button
                          onClick={() => handleStop(p)}
                          disabled={isLoading}
                          title="Stop bot"
                          className="p-2 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <Square className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStart(p)}
                          disabled={isLoading}
                          title="Start bot"
                          className="p-2 text-xs font-medium text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer font-semibold shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => handleRestart(p)}
                        disabled={isLoading}
                        title="Restart connection"
                        className="p-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => openEditModal(p)}
                        title="Edit profile settings"
                        className="p-2 text-xs font-medium text-neutral-400 hover:text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        title="Delete profile"
                        className="p-2 text-xs font-medium text-neutral-400 hover:text-red-400 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedProfileId(p.id);
                        setCurrentTab('control-panel');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-100 hover:text-white bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/60 rounded-lg transition-colors cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Control Panel</span>
                      <ArrowRight className="w-3 h-3 text-neutral-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Creating / Editing Profile - Mobile Slideover / Desktop Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-150">
          <div className="bg-[#121417] border border-neutral-800 rounded-t-2xl sm:rounded-2xl w-full max-w-xl max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Pinned Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 shrink-0 bg-[#121417]">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {editingProfile ? 'Edit Bot Profile' : 'Configure New Minecraft Bot'}
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {editingProfile ? 'Modify server connection and automation settings' : 'Deploy a new Java Edition bot session to your server'}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveProfile} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto overscroll-contain px-5 py-4 space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Profile Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Hypixel Lobby Bot"
                    required
                    className="w-full px-3 py-2 bg-[#171a1e] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-medium text-neutral-300">Server IP / Hostname</label>
                      {serverHost.includes(' ') && (
                        <span className="text-[10px] text-amber-400">Spaces stripped automatically</span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={serverHost}
                      onChange={(e) => setServerHost(e.target.value)}
                      placeholder="mc.hypixel.net or localhost"
                      required
                      className="w-full px-3 py-2 bg-[#171a1e] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <div className="text-[10px] text-neutral-500 mt-1">Domain or IP without spaces (e.g. play.hypixel.net)</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Port</label>
                    <input
                      type="number"
                      value={serverPort}
                      onChange={(e) => setServerPort(Number(e.target.value))}
                      required
                      className="w-full px-3 py-2 bg-[#171a1e] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Bot Username</label>
                  <input
                    type="text"
                    value={botUsername}
                    onChange={(e) => setBotUsername(e.target.value)}
                    placeholder="Bot_Sentinel"
                    required
                    className="w-full px-3 py-2 bg-[#171a1e] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Authentication Mode</label>
                    <select
                      value={authType}
                      onChange={(e: any) => setAuthType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#171a1e] border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="offline">Offline / Cracked</option>
                      <option value="microsoft">Microsoft OAuth (Premium)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Minecraft Version</label>
                    <select
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="w-full px-3 py-2 bg-[#171a1e] border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="auto">Auto-negotiate (Recommended)</option>
                      <option value="1.20.4">1.20.4</option>
                      <option value="1.20.2">1.20.2</option>
                      <option value="1.19.4">1.19.4</option>
                      <option value="1.18.2">1.18.2</option>
                      <option value="1.16.5">1.16.5</option>
                      <option value="1.12.2">1.12.2</option>
                      <option value="1.8.9">1.8.9</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">Automatic Reconnect</div>
                    <div className="text-[11px] text-neutral-500">Retry connection after disconnects</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoReconnect}
                    onChange={(e) => setAutoReconnect(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                </div>

                {autoReconnect && (
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">Reconnect Delay (seconds)</label>
                    <input
                      type="number"
                      min={5}
                      max={300}
                      value={reconnectDelay}
                      onChange={(e) => setReconnectDelay(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#171a1e] border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                )}

                {/* Auto-Login Configuration Section */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-white flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Auto-Login System (AuthMe / nLogin)</span>
                      </div>
                      <div className="text-[11px] text-neutral-500">Automatically executes /login or /register upon join</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoLogin}
                      onChange={(e) => setAutoLogin(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>

                  {autoLogin && (
                    <div className="bg-[#16181b] p-3 rounded-xl border border-neutral-800 space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-medium text-neutral-300">Server Password</label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-[10px] text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            <span>{showPassword ? 'Hide' : 'Show'}</span>
                          </button>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter password for /login & /register"
                          className="w-full px-3 py-2 bg-[#121417] border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                        />
                        <div className="text-[10px] text-neutral-500 mt-1">
                          Stored safely in your profile. Never revealed publicly.
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">Authentication Mode</label>
                        <select
                          value={loginCommand}
                          onChange={(e) => setLoginCommand(e.target.value)}
                          className="w-full px-3 py-2 bg-[#121417] border border-neutral-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="auto">Auto-detect (/login & /register prompts)</option>
                          <option value="/login {password}">Always /login {`{password}`}</option>
                          <option value="/register {password} {password}">Always /register {`{password} {password}`}</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Built-in Automation Suite Configuration */}
                <div className="pt-3 border-t border-neutral-800/80 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">Bot Automation Suite</div>
                      <div className="text-[11px] text-neutral-500">Autonomous survivability and utilities</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <label className="flex items-center justify-between p-2.5 bg-[#16181b] border border-neutral-800/80 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-3.5 h-3.5 text-amber-400" />
                        <div>
                          <div className="font-medium text-neutral-200">Auto-Eat</div>
                          <div className="text-[10px] text-neutral-500">Consumes food when hungry</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoEat}
                        onChange={(e) => setAutoEat(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#16181b] border border-neutral-800/80 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <div>
                          <div className="font-medium text-neutral-200">Auto-Armor</div>
                          <div className="text-[10px] text-neutral-500">Equips highest defense armor</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoArmor}
                        onChange={(e) => setAutoArmor(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#16181b] border border-neutral-800/80 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                        <div>
                          <div className="font-medium text-neutral-200">Auto-Totem</div>
                          <div className="text-[10px] text-neutral-500">Equips Totem to offhand</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoTotem}
                        onChange={(e) => setAutoTotem(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#16181b] border border-neutral-800/80 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <Footprints className="w-3.5 h-3.5 text-purple-400" />
                        <div>
                          <div className="font-medium text-neutral-200">AFK Anti-Kick</div>
                          <div className="text-[10px] text-neutral-500">Randomized subtle movement</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={afkAntiKick}
                        onChange={(e) => setAfkAntiKick(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#16181b] border border-neutral-800/80 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <Crosshair className="w-3.5 h-3.5 text-red-400" />
                        <div>
                          <div className="font-medium text-neutral-200">Guard Mode</div>
                          <div className="text-[10px] text-neutral-500">Defends against nearby mobs</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={guardMode}
                        onChange={(e) => setGuardMode(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 bg-[#16181b] border border-neutral-800/80 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                      <div className="flex items-center gap-2">
                        <Fish className="w-3.5 h-3.5 text-cyan-400" />
                        <div>
                          <div className="font-medium text-neutral-200">Auto-Fish</div>
                          <div className="text-[10px] text-neutral-500">Auto rod cast & catch</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoFish}
                        onChange={(e) => setAutoFish(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Pinned Modal Sticky Footer */}
              <div className="p-4 border-t border-neutral-800 bg-[#0e1013] shrink-0 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-sm"
                >
                  {isSubmitting && (
                    <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>{isSubmitting ? (editingProfile ? 'Saving...' : 'Creating...') : (editingProfile ? 'Save Changes' : 'Create Profile')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
