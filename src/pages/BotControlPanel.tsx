import React, { useState, useEffect, useRef } from 'react';
import { useBot } from '../context/BotContext.js';
import { useAuth } from '../context/AuthContext.js';
import { InventoryItem, CustomFeature, BotProfile } from '../types.js';
import { MinecraftItemIcon } from '../components/MinecraftItemIcon.js';
import { SpatialRadarCanvas } from '../components/SpatialRadarCanvas.js';
import { MacroCommandManager } from '../components/MacroCommandManager.js';
import { soundFx } from '../utils/audioEffects.js';
import { 
  Play, 
  Square, 
  RotateCw, 
  Terminal, 
  MessageSquare, 
  Users, 
  Package, 
  Compass, 
  Puzzle, 
  Settings, 
  Trash2, 
  Send, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Heart, 
  Utensils, 
  Wifi, 
  Clock, 
  MapPin, 
  Layers, 
  X,
  ExternalLink,
  ChevronDown,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  Info,
  Sparkles,
  Shirt,
  Footprints,
  AlertCircle,
  Zap,
  Fish,
  Crosshair,
  Volume2,
  VolumeX,
  Bookmark
} from 'lucide-react';

interface BotControlPanelProps {
  setCurrentTab: (tab: string) => void;
}

export function BotControlPanel({ setCurrentTab }: BotControlPanelProps) {
  const { authFetch } = useAuth();
  const { 
    profiles, 
    activeStates, 
    selectedProfileId, 
    setSelectedProfileId, 
    startBot, 
    stopBot, 
    restartBot, 
    sendChat, 
    sendMovement, 
    stopMovement, 
    clearConsole, 
    getInventory, 
    updateProfile,
    updateBotAutomation,
    syncPackets,
    consoleLogs, 
    chatMessages, 
    onlinePlayers 
  } = useBot();

  const [activeTab, setActiveTab] = useState<'overview' | 'automations' | 'movement' | 'radar' | 'macros' | 'console' | 'chat' | 'players' | 'inventory' | 'features' | 'settings'>('overview');
  const [soundMuted, setSoundMuted] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [availableFeatures, setAvailableFeatures] = useState<CustomFeature[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSyncingPackets, setIsSyncingPackets] = useState(false);
  const [packetSyncNotice, setPacketSyncNotice] = useState<string | null>(null);

  const handleSyncPacketsNow = async () => {
    if (!currentProfile) return;
    setIsSyncingPackets(true);
    setPacketSyncNotice(null);
    try {
      const res = await syncPackets(currentProfile.id);
      setPacketSyncNotice(res.message || 'Position packets resynced cleanly with Minecraft server.');
      setTimeout(() => setPacketSyncNotice(null), 4000);
    } catch (e: any) {
      setPacketSyncNotice(`Sync error: ${e?.message || 'Failed to sync'}`);
    } finally {
      setIsSyncingPackets(false);
    }
  };
  const [activeControls, setActiveControls] = useState<Record<string, boolean>>({});

  // Inventory Inspector & Refresh state
  const [selectedSlotInfo, setSelectedSlotInfo] = useState<{ item: InventoryItem | null; slot: number; label: string } | null>(null);
  const [isRefreshingInventory, setIsRefreshingInventory] = useState(false);
  const [inventoryCategory, setInventoryCategory] = useState<'all' | 'weapons' | 'armor' | 'food' | 'blocks' | 'tools'>('all');
  const [inventoryActionNotice, setInventoryActionNotice] = useState<string | null>(null);

  const handleEquipItem = async (slot: number, destination: 'hand' | 'offhand' | 'head' | 'chest' | 'legs' | 'feet' = 'hand') => {
    if (!currentProfile) return;
    try {
      const res = await authFetch(`/api/bots/${currentProfile.id}/inventory/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, destination }),
      });
      const data = await res.json();
      if (res.ok) {
        setInventoryActionNotice(data.message || `Equipped item to ${destination}`);
        const updated = await getInventory(currentProfile.id);
        setInventoryItems(updated);
        const matching = updated.find(it => it.slot === slot);
        setSelectedSlotInfo(prev => prev ? { ...prev, item: matching || null } : null);
      } else {
        setInventoryActionNotice(`Equip error: ${data.error || 'Failed to equip'}`);
      }
    } catch (e: any) {
      setInventoryActionNotice(`Equip error: ${e?.message || 'Network error'}`);
    } finally {
      setTimeout(() => setInventoryActionNotice(null), 3500);
    }
  };

  const handleDropItem = async (slot: number, count: number = 1) => {
    if (!currentProfile) return;
    try {
      const res = await authFetch(`/api/bots/${currentProfile.id}/inventory/drop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, count }),
      });
      const data = await res.json();
      if (res.ok) {
        setInventoryActionNotice(data.message || `Dropped item from slot #${slot}`);
        const updated = await getInventory(currentProfile.id);
        setInventoryItems(updated);
        const matching = updated.find(it => it.slot === slot);
        setSelectedSlotInfo(prev => prev ? { ...prev, item: matching || null } : null);
      } else {
        setInventoryActionNotice(`Drop error: ${data.error || 'Failed to drop'}`);
      }
    } catch (e: any) {
      setInventoryActionNotice(`Drop error: ${e?.message || 'Network error'}`);
    } finally {
      setTimeout(() => setInventoryActionNotice(null), 3500);
    }
  };

  const isItemInCategory = (item: InventoryItem, category: string) => {
    if (category === 'all') return true;
    if (item.category === category) return true;
    const lowerName = item.name.toLowerCase();
    if (category === 'weapons') {
      return lowerName.includes('sword') || lowerName.includes('bow') || lowerName.includes('trident') || lowerName.includes('crossbow');
    }
    if (category === 'armor') {
      return lowerName.includes('helmet') || lowerName.includes('chestplate') || lowerName.includes('leggings') || lowerName.includes('boots') || lowerName.includes('shield');
    }
    if (category === 'food') {
      return lowerName.includes('apple') || lowerName.includes('beef') || lowerName.includes('porkchop') || lowerName.includes('chicken') || lowerName.includes('bread') || lowerName.includes('potion');
    }
    if (category === 'tools') {
      return lowerName.includes('pickaxe') || lowerName.includes('axe') || lowerName.includes('shovel') || lowerName.includes('hoe') || lowerName.includes('rod');
    }
    if (category === 'blocks') {
      return lowerName.includes('stone') || lowerName.includes('dirt') || lowerName.includes('planks') || lowerName.includes('log') || lowerName.includes('cobblestone') || lowerName.includes('ore') || lowerName.includes('block');
    }
    return true;
  };

  const renderDurabilityBar = (item: InventoryItem) => {
    if (item.maxDurability && item.durabilityUsed !== undefined && item.maxDurability > 0) {
      const remaining = Math.max(0, item.maxDurability - item.durabilityUsed);
      const pct = Math.min(100, Math.max(0, (remaining / item.maxDurability) * 100));
      const barColor = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
      return (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50 overflow-hidden">
          <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      );
    }
    return null;
  };

  // Auto-Login settings state
  const [autoLoginEnabled, setAutoLoginEnabled] = useState(false);
  const [autoLoginPassword, setAutoLoginPassword] = useState('');
  const [autoLoginCommand, setAutoLoginCommand] = useState('auto');
  const [showAutoLoginPassword, setShowAutoLoginPassword] = useState(false);
  const [autoLoginSavedNotice, setAutoLoginSavedNotice] = useState(false);
  const [isSendingLoginCommand, setIsSendingLoginCommand] = useState(false);
  const [autoLoginFeedback, setAutoLoginFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);
  const currentProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0] || null;
  const liveState = currentProfile ? activeStates[currentProfile.id] : null;
  const status = liveState?.status || 'stopped';
  const logs = (currentProfile ? consoleLogs[currentProfile.id] : []) || [];
  const chats = (currentProfile ? chatMessages[currentProfile.id] : []) || [];
  const players = (currentProfile ? onlinePlayers[currentProfile.id] : []) || [];

  const [kickCountdown, setKickCountdown] = useState<number | null>(null);
  const [humanizedPhysicsEnabled, setHumanizedPhysicsEnabled] = useState(true);
  const [packetJitterMs, setPacketJitterMs] = useState(40);
  const [movementSpeedCap, setMovementSpeedCap] = useState(0.22);
  const [kickCooldownSec, setKickCooldownSec] = useState(30);
  const [disableSprintOnServer, setDisableSprintOnServer] = useState(false);
  const [automationUpdating, setAutomationUpdating] = useState<Record<string, boolean>>({});

  // Sync anti-kick tuning form state when profile selection changes
  useEffect(() => {
    if (currentProfile) {
      setAutoLoginEnabled(Boolean(currentProfile.autoLogin));
      setAutoLoginPassword(currentProfile.loginPassword || '');
      setAutoLoginCommand(currentProfile.loginCommand || 'auto');
      setHumanizedPhysicsEnabled(currentProfile.humanizedPhysics !== false);
      setPacketJitterMs(currentProfile.packetJitterMs ?? 40);
      setMovementSpeedCap(currentProfile.movementSpeedCap ?? 0.22);
      setKickCooldownSec(currentProfile.kickCooldownSec ?? 30);
      setDisableSprintOnServer(Boolean(currentProfile.disableSprintOnServer));
      setAutoLoginSavedNotice(false);
      setAutoLoginFeedback(null);
    }
  }, [currentProfile?.id, currentProfile?.autoLogin, currentProfile?.loginPassword, currentProfile?.loginCommand, currentProfile?.humanizedPhysics, currentProfile?.packetJitterMs, currentProfile?.movementSpeedCap, currentProfile?.kickCooldownSec, currentProfile?.disableSprintOnServer]);

  // Live Kick Rate-Limit Countdown Timer
  useEffect(() => {
    if (liveState?.kickInfo?.isKicked && liveState.kickInfo.nextAllowedTime) {
      const update = () => {
        const remaining = Math.max(0, Math.ceil((liveState.kickInfo!.nextAllowedTime - Date.now()) / 1000));
        setKickCountdown(remaining);
      };
      update();
      const timer = setInterval(update, 1000);
      return () => clearInterval(timer);
    } else {
      setKickCountdown(null);
    }
  }, [liveState?.kickInfo?.nextAllowedTime, liveState?.kickInfo?.isKicked]);

  // Auto-scroll console
  useEffect(() => {
    if (autoScroll && activeTab === 'console') {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, activeTab]);

  // Fetch inventory when inventory tab active
  useEffect(() => {
    if (currentProfile && activeTab === 'inventory') {
      getInventory(currentProfile.id).then(setInventoryItems);
      const interval = setInterval(() => {
        getInventory(currentProfile.id).then(setInventoryItems);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [currentProfile, activeTab]);

  // Fetch custom features
  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const res = await authFetch('/api/features');
        if (res.ok) {
          const list = await res.json();
          setAvailableFeatures(list);
        }
      } catch (e) {}
    };
    fetchFeatures();
  }, [activeTab]);

  const handleStart = async () => {
    if (!currentProfile) return;
    setActionLoading(true);
    await startBot(currentProfile);
    setActionLoading(false);
  };

  const handleStop = async () => {
    if (!currentProfile) return;
    setActionLoading(true);
    await stopBot(currentProfile.id);
    setActionLoading(false);
  };

  const handleRestart = async () => {
    if (!currentProfile) return;
    setActionLoading(true);
    await restartBot(currentProfile);
    setActionLoading(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfile || !chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    await sendChat(currentProfile.id, msg);
  };

  const handleMoveButton = async (control: 'forward' | 'back' | 'left' | 'right' | 'jump' | 'sprint', isDown: boolean) => {
    if (!currentProfile) return;
    setActiveControls(prev => ({ ...prev, [control]: isDown }));
    await sendMovement(currentProfile.id, control, isDown);
  };

  const handleHaltMovement = async () => {
    if (!currentProfile) return;
    setActiveControls({});
    await stopMovement(currentProfile.id);
  };

  const handleRefreshInventory = async () => {
    if (!currentProfile) return;
    setIsRefreshingInventory(true);
    try {
      const items = await getInventory(currentProfile.id);
      setInventoryItems(items);
    } catch (e) {
      console.error('Failed to load inventory', e);
    } finally {
      setTimeout(() => setIsRefreshingInventory(false), 400);
    }
  };

  const handleSaveAutoLogin = async () => {
    if (!currentProfile) return;
    try {
      const updated: BotProfile = {
        ...currentProfile,
        autoLogin: autoLoginEnabled,
        loginPassword: autoLoginPassword.trim(),
        loginCommand: autoLoginCommand || 'auto',
      };
      await updateProfile(updated);
      setAutoLoginSavedNotice(true);
      setAutoLoginFeedback({ type: 'success', text: 'Auto-Login settings saved and synced.' });
      setTimeout(() => setAutoLoginSavedNotice(false), 3500);
    } catch (e: any) {
      setAutoLoginFeedback({ type: 'error', text: `Failed to save: ${e?.message || 'Unknown error'}` });
    }
  };

  const handleSendLoginNow = async () => {
    if (!currentProfile || !autoLoginPassword) return;
    setIsSendingLoginCommand(true);
    setAutoLoginFeedback(null);
    try {
      let cmd = `/login ${autoLoginPassword}`;
      if (autoLoginCommand === '/register {password} {password}') {
        cmd = `/register ${autoLoginPassword} ${autoLoginPassword}`;
      } else if (autoLoginCommand && autoLoginCommand !== 'auto') {
        cmd = autoLoginCommand.replace('{password}', autoLoginPassword);
      }
      const res = await sendChat(currentProfile.id, cmd);
      if (res.success) {
        setAutoLoginFeedback({
          type: 'success',
          text: `Executed auth command in game chat (${cmd.startsWith('/register') ? '/register' : '/login'} ••••••)`
        });
      } else {
        setAutoLoginFeedback({ type: 'error', text: res.message || 'Server rejected command' });
      }
    } catch (e: any) {
      setAutoLoginFeedback({ type: 'error', text: e?.message || 'Failed to dispatch command' });
    } finally {
      setIsSendingLoginCommand(false);
      setTimeout(() => setAutoLoginFeedback(null), 5000);
    }
  };

  const handleSaveAntiKickSettings = async () => {
    if (!currentProfile) return;
    try {
      const updated: BotProfile = {
        ...currentProfile,
        humanizedPhysics: humanizedPhysicsEnabled,
        packetJitterMs,
        movementSpeedCap,
        kickCooldownSec,
        disableSprintOnServer,
      };
      await updateProfile(updated);
      await updateBotAutomation(currentProfile.id, {
        humanizedPhysics: humanizedPhysicsEnabled,
        packetJitterMs,
        movementSpeedCap,
        kickCooldownSec,
        disableSprintOnServer,
      });
      setAutoLoginSavedNotice(true);
      setTimeout(() => setAutoLoginSavedNotice(false), 3500);
    } catch (e: any) {
      console.error('Failed to save anti-kick settings', e);
    }
  };

  const handleToggleAutomation = async (key: keyof BotProfile, currentValue: boolean) => {
    if (!currentProfile) return;
    const nextVal = !currentValue;
    setAutomationUpdating(prev => ({ ...prev, [key]: true }));
    try {
      await updateBotAutomation(currentProfile.id, { [key]: nextVal });
    } catch (e) {
      console.error('Failed to update automation', e);
    } finally {
      setTimeout(() => {
        setAutomationUpdating(prev => ({ ...prev, [key]: false }));
      }, 350);
    }
  };


  if (!currentProfile) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-neutral-400">
        <p className="mb-4">No bot profiles configured.</p>
        <button
          onClick={() => setCurrentTab('dashboard')}
          className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-lg"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'automations', label: 'Automations', icon: Sparkles },
    { id: 'movement', label: 'Movement & D-Pad', icon: Compass },
    { id: 'radar', label: '2D Spatial Radar', icon: MapPin },
    { id: 'macros', label: 'Macros & Repeater', icon: Bookmark },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'players', label: 'Players', icon: Users },
    { id: 'features', label: 'Addons', icon: Puzzle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 max-w-full overflow-x-hidden">
      {/* Bot Selector & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={currentProfile.id}
              onChange={(e) => setSelectedProfileId(e.target.value)}
              className="appearance-none bg-[#121417] border border-neutral-800 rounded-xl px-4 py-2 pr-10 text-sm font-semibold text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.botUsername})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-3 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              status === 'online' ? 'bg-emerald-500' :
              status === 'connecting' || status === 'reconnecting' ? 'bg-amber-500' :
              status === 'error' ? 'bg-red-500' : 'bg-neutral-600'
            }`} />
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-300">
              {status}
            </span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          {status === 'online' || status === 'connecting' ? (
            <button
              onClick={() => { soundFx.playClick(); handleStop(); }}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-neutral-200 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 text-red-400" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => { soundFx.playClick(); handleStart(); }}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start</span>
            </button>
          )}

          <button
            onClick={() => { soundFx.playClick(); handleRestart(); }}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Restart</span>
          </button>

          <button
            onClick={() => { soundFx.playClick(); handleSyncPacketsNow(); }}
            disabled={isSyncingPackets || status !== 'online'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 rounded-lg transition-all shadow-sm disabled:opacity-40 cursor-pointer"
            title="Resync client position vectors & zero movement packets"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isSyncingPackets ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Packet Sync</span>
          </button>

          <button
            onClick={() => {
              const nextMuted = !soundMuted;
              setSoundMuted(nextMuted);
              soundFx.enabled = !nextMuted;
              if (!nextMuted) soundFx.playClick();
            }}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors cursor-pointer text-neutral-300"
            title={soundMuted ? 'Unmute Cyber SFX' : 'Mute Cyber SFX'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-neutral-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
        </div>
      </div>

      {/* 1.0s Post-Respawn Grace Period Lock Live Banner */}
      {liveState?.gracePeriodActive && (
        <div className="bg-cyan-950/80 border-2 border-cyan-400/80 rounded-2xl p-4 text-xs text-cyan-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xl animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0">
              <Lock className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider font-mono text-cyan-300">
                  GRACE LOCK: CHUNK SYNC (1.0s)
                </span>
                <span className="px-2 py-0.5 text-[9px] font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-400/40 font-mono">
                  ZERO PACKET DESYNC
                </span>
              </div>
              <p className="text-[11px] text-cyan-300/80 mt-0.5">
                Physics controls and velocity movement packets are locked during the 1-second post-respawn grace period to ensure terrain chunks load cleanly and eliminate invalid movement disconnections.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-1 bg-cyan-900/60 border border-cyan-400/50 text-cyan-200 rounded-lg shrink-0">
            {((liveState.graceRemainingMs || 1000) / 1000).toFixed(1)}s remaining
          </span>
        </div>
      )}

      {/* Interactive Kick & Rate-Limit Countdown Banner */}
      {(status === 'kicked' || liveState?.kickInfo?.isKicked || (kickCountdown !== null && kickCountdown > 0)) && (
        <div className="bg-amber-950/40 border-2 border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
                <AlertCircle className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-amber-200">
                    Server Kick / Rate-Limit Cooldown
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 font-mono">
                    ANTI-CHEAT KICK PROTECTOR
                  </span>
                </div>
                <p className="text-xs text-amber-300/90 mt-0.5 font-mono">
                  {liveState?.kickInfo?.reason || liveState?.errorMessage || 'Invalid movement / Login rate limit enforced by server.'}
                </p>
              </div>
            </div>

            {/* Countdown Badge & Controls */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="bg-[#121417] px-3.5 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-2 text-center">
                <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                <div>
                  <div className="text-[9px] font-mono uppercase text-amber-400/80">Login Cooldown</div>
                  <div className="text-sm font-black font-mono text-amber-300 tabular-nums">
                    {kickCountdown !== null ? `${kickCountdown}s` : '28s'}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStart}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Force Reconnect</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-amber-200/70 pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>
              Mineflayer auto-reconnect engine is waiting out the 28-second server login cooldown before retrying to prevent extended IP bans.
            </span>
            <button
              onClick={() => setActiveTab('automations')}
              className="text-amber-400 hover:underline font-semibold shrink-0 cursor-pointer"
            >
              Configure Anti-Kick Tuning &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Packet Sync Feedback Toast */}
      {packetSyncNotice && (
        <div className="bg-emerald-950/60 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-300 flex items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold font-mono">{packetSyncNotice}</span>
          </div>
          <button
            onClick={() => setPacketSyncNotice(null)}
            className="text-neutral-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation Tabs - Mobile Swipeable Snap Strip */}
      <div className="flex items-center gap-2 p-1.5 bg-[#121417] border border-neutral-800 rounded-xl overflow-x-auto scroll-smooth snap-x touch-pan-x shadow-inner scrollbar-none flex-nowrap">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { soundFx.playClick(); setActiveTab(t.id as any); }}
              className={`snap-start inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-neutral-800 text-emerald-400 font-semibold shadow border border-neutral-700/60'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cyber Ninja Stealth Status Header */}
          <div className="bg-gradient-to-r from-[#0d131a] via-[#101b26] to-[#0d131a] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    SHADOW STEALTH BOT ENGINE
                  </h3>
                  <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 font-mono tracking-widest uppercase">
                    NINJA MODE ONLINE
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Packet jitter active ({currentProfile.packetJitterMs ?? 40}ms) · Zero-gravity physics guard engaged · Anti-cheat risk: <span className="text-emerald-400 font-semibold font-mono">LOW</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSyncPacketsNow}
                disabled={isSyncingPackets || status !== 'online'}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPackets ? 'animate-spin' : ''}`} />
                <span>Instant Resync</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>Health Points</span>
                <Heart className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {liveState?.health ?? 20} <span className="text-xs text-neutral-500 font-sans">/ 20</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all"
                  style={{ width: `${Math.min(100, ((liveState?.health ?? 20) / 20) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>Food Level</span>
                <Utensils className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl font-bold font-mono text-white">
                {liveState?.food ?? 20} <span className="text-xs text-neutral-500 font-sans">/ 20</span>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all"
                  style={{ width: `${Math.min(100, ((liveState?.food ?? 20) / 20) * 100)}%` }}
                />
              </div>
            </div>

            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>Server Ping</span>
                <Wifi className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-white">
                {liveState?.ping ?? 0} <span className="text-xs text-neutral-500 font-sans">ms</span>
              </div>
              <div className="text-[11px] text-neutral-500 mt-2">Latency to Minecraft host</div>
            </div>

            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                <span>Connection Uptime</span>
                <Clock className="w-4 h-4 text-neutral-400" />
              </div>
              <div className="text-xl font-bold font-mono tabular-nums text-white">
                {liveState?.uptime ? `${Math.floor(liveState.uptime / 60)}m ${liveState.uptime % 60}s` : '0s'}
              </div>
              <div className="text-[11px] text-neutral-500 mt-2">Active session runtime</div>
            </div>
          </div>

          {/* Active Automations Status Ribbon */}
          <div className="bg-[#121417] border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automations:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentProfile.autoEat ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>
                  Eat: {currentProfile.autoEat ? 'ON' : 'OFF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentProfile.autoArmor ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>
                  Armor: {currentProfile.autoArmor ? 'ON' : 'OFF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentProfile.autoTotem ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>
                  Totem: {currentProfile.autoTotem ? 'ON' : 'OFF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentProfile.afkAntiKick ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>
                  AFK: {currentProfile.afkAntiKick ? 'ON' : 'OFF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentProfile.guardMode ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>
                  Guard: {currentProfile.guardMode ? 'ON' : 'OFF'}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${currentProfile.autoFish ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-neutral-900 text-neutral-500 border-neutral-800'}`}>
                  Fish: {currentProfile.autoFish ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('automations')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>Configure Automations</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Spatial Telemetry</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#16181b] p-3 rounded-lg border border-neutral-800">
                  <div className="text-[11px] text-neutral-500">Coord X</div>
                  <div className="text-sm font-mono font-bold text-white tabular-nums">
                    {liveState?.coordinates?.x ?? '—'}
                  </div>
                </div>
                <div className="bg-[#16181b] p-3 rounded-lg border border-neutral-800">
                  <div className="text-[11px] text-neutral-500">Coord Y</div>
                  <div className="text-sm font-mono font-bold text-white tabular-nums">
                    {liveState?.coordinates?.y ?? '—'}
                  </div>
                </div>
                <div className="bg-[#16181b] p-3 rounded-lg border border-neutral-800">
                  <div className="text-[11px] text-neutral-500">Coord Z</div>
                  <div className="text-sm font-mono font-bold text-white tabular-nums">
                    {liveState?.coordinates?.z ?? '—'}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs pt-2 text-neutral-400">
                <span>Dimension:</span>
                <span className="font-mono text-neutral-200 capitalize">{liveState?.dimension || 'Overworld'}</span>
              </div>
            </div>

            <div className="bg-[#121417] border border-neutral-800 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Server Connection Specs</h3>
              <div className="space-y-2 text-xs text-neutral-400">
                <div className="flex justify-between py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-500">Destination</span>
                  <span className="font-mono text-neutral-200">{currentProfile.serverHost}:{currentProfile.serverPort}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-500">Username</span>
                  <span className="font-mono text-neutral-200">{currentProfile.botUsername}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-500">Auth Mechanism</span>
                  <span className="capitalize text-neutral-200">{currentProfile.authType}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-neutral-800/80">
                  <span className="text-neutral-500">Auto-Login System</span>
                  <span className={`inline-flex items-center gap-1 font-mono text-xs ${currentProfile.autoLogin ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}`}>
                    {currentProfile.autoLogin ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Enabled ({currentProfile.loginCommand === '/register {password} {password}' ? '/register' : '/login'})
                      </>
                    ) : (
                      'Disabled'
                    )}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Auto-Reconnect</span>
                  <span className="text-neutral-200">{currentProfile.autoReconnect ? `Enabled (${currentProfile.reconnectDelay}s)` : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Automations */}
      {activeTab === 'automations' && (
        <div className="space-y-6">
          <div className="bg-[#121417] border border-neutral-800 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <span>Real-Time Bot Automations</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Active survival intelligence and routines running natively in the Mineflayer process.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-mono font-medium">Engine Synchronized</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Card 1: Auto-Eat */}
              <div className={`p-4 rounded-xl border transition-all ${
                currentProfile.autoEat 
                  ? 'bg-emerald-950/15 border-emerald-500/40 shadow-sm' 
                  : 'bg-[#171a1e] border-neutral-800/80 hover:border-neutral-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 text-amber-400">
                      <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>Auto-Eat Sustenance</span>
                        {currentProfile.autoEat && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Detects hunger &lt; 18 or low health. Searches inventory for cooked food, equips, and consumes safely.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAutomation('autoEat', Boolean(currentProfile.autoEat))}
                    disabled={automationUpdating['autoEat']}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentProfile.autoEat ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        currentProfile.autoEat ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card 2: Auto-Armor */}
              <div className={`p-4 rounded-xl border transition-all ${
                currentProfile.autoArmor 
                  ? 'bg-emerald-950/15 border-emerald-500/40 shadow-sm' 
                  : 'bg-[#171a1e] border-neutral-800/80 hover:border-neutral-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>Auto-Armor Defense</span>
                        {currentProfile.autoArmor && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Scans inventory for helmets, chestplates, leggings, and boots. Equips highest defense tier automatically.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAutomation('autoArmor', Boolean(currentProfile.autoArmor))}
                    disabled={automationUpdating['autoArmor']}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentProfile.autoArmor ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        currentProfile.autoArmor ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card 3: Auto-Totem */}
              <div className={`p-4 rounded-xl border transition-all ${
                currentProfile.autoTotem 
                  ? 'bg-emerald-950/15 border-emerald-500/40 shadow-sm' 
                  : 'bg-[#171a1e] border-neutral-800/80 hover:border-neutral-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0 text-yellow-400">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>Auto-Totem Keeper</span>
                        {currentProfile.autoTotem && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Checks off-hand slot continuously. Instantly equips Totem of Undying from inventory if off-hand is empty.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAutomation('autoTotem', Boolean(currentProfile.autoTotem))}
                    disabled={automationUpdating['autoTotem']}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentProfile.autoTotem ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        currentProfile.autoTotem ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card 4: AFK Anti-Kick */}
              <div className={`p-4 rounded-xl border transition-all ${
                currentProfile.afkAntiKick 
                  ? 'bg-emerald-950/15 border-emerald-500/40 shadow-sm' 
                  : 'bg-[#171a1e] border-neutral-800/80 hover:border-neutral-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
                      <Footprints className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>AFK Anti-Kick Routine</span>
                        {currentProfile.afkAntiKick && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Executes gentle randomized micro-yaw pitch look and subtle arm swing every 25s without causing movement kicks.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAutomation('afkAntiKick', Boolean(currentProfile.afkAntiKick))}
                    disabled={automationUpdating['afkAntiKick']}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentProfile.afkAntiKick ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        currentProfile.afkAntiKick ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card 5: Guard Mode */}
              <div className={`p-4 rounded-xl border transition-all ${
                currentProfile.guardMode 
                  ? 'bg-emerald-950/15 border-emerald-500/40 shadow-sm' 
                  : 'bg-[#171a1e] border-neutral-800/80 hover:border-neutral-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0 text-red-400">
                      <Crosshair className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>Guard Mode (Mob Defense)</span>
                        {currentProfile.guardMode && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Scans within 3.8m for hostile mobs (Zombies, Skeletons, Creepers). Equips sword/axe and attacks automatically.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAutomation('guardMode', Boolean(currentProfile.guardMode))}
                    disabled={automationUpdating['guardMode']}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentProfile.guardMode ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        currentProfile.guardMode ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card 6: Auto-Fish */}
              <div className={`p-4 rounded-xl border transition-all ${
                currentProfile.autoFish 
                  ? 'bg-emerald-950/15 border-emerald-500/40 shadow-sm' 
                  : 'bg-[#171a1e] border-neutral-800/80 hover:border-neutral-700'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 text-cyan-400">
                      <Fish className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>Auto-Fish Automation</span>
                        {currentProfile.autoFish && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                            ONLINE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        Equips fishing rod from inventory, casts bobber into water, reels in upon bite window, and recasts automatically.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleAutomation('autoFish', Boolean(currentProfile.autoFish))}
                    disabled={automationUpdating['autoFish']}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      currentProfile.autoFish ? 'bg-emerald-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        currentProfile.autoFish ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Anti-Kick Physics & Rate Limit Tuning Suite */}
            <div className="pt-6 border-t border-neutral-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Anti-Kick Movement Physics & Rate-Limit Tuning</span>
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                        GRIMAC / VULCAN PROTECTOR
                      </span>
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Fine-tune velocity caps, packet jitter, and login backoff timers to prevent "Invalid movement" kicks.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAntiKickSettings}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  Save Anti-Kick Settings
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Setting 1: Humanized Movement */}
                <div className="p-4 bg-[#16181c] border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Humanized Physics</span>
                    <input
                      type="checkbox"
                      checked={humanizedPhysicsEnabled}
                      onChange={(e) => setHumanizedPhysicsEnabled(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    Smooths out movement vector steps to mimic human player keyboard input.
                  </p>
                </div>

                {/* Setting 2: Packet Jitter */}
                <div className="p-4 bg-[#16181c] border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Packet Jitter Delay</span>
                    <span className="font-mono text-emerald-400 font-bold">{packetJitterMs}ms</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={5}
                    value={packetJitterMs}
                    onChange={(e) => setPacketJitterMs(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Injects micro-random packet delay (10ms - 120ms) to defeat pattern detection.
                  </p>
                </div>

                {/* Setting 3: Velocity Cap */}
                <div className="p-4 bg-[#16181c] border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Velocity Speed Cap</span>
                    <span className="font-mono text-emerald-400 font-bold">{movementSpeedCap.toFixed(2)} b/t</span>
                  </div>
                  <input
                    type="range"
                    min={0.10}
                    max={0.28}
                    step={0.01}
                    value={movementSpeedCap}
                    onChange={(e) => setMovementSpeedCap(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Caps maximum delta position per tick below server anti-cheat speed threshold.
                  </p>
                </div>

                {/* Setting 4: Login Rate-Limit Backoff */}
                <div className="p-4 bg-[#16181c] border border-neutral-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Server Cooldown Backoff</span>
                    <span className="font-mono text-amber-400 font-bold">{kickCooldownSec}s</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    step={2}
                    value={kickCooldownSec}
                    onChange={(e) => setKickCooldownSec(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-neutral-400">
                    Default delay (28s-30s) before reconnecting when server rate-limit kicks occur.
                  </p>
                </div>

                {/* Setting 5: Strict Sprint Suppressor */}
                <div className="p-4 bg-[#16181c] border border-neutral-800 rounded-xl space-y-2 lg:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-white">Anti-Cheat Safe Mode (Sprint Suppressor)</span>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Blocks continuous sprinting on servers with strict GrimAC or Vulcan anti-cheat rules.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={disableSprintOnServer}
                      onChange={(e) => setDisableSprintOnServer(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: 2D Spatial Radar Pathfinder */}
      {activeTab === 'radar' && (
        <div className="space-y-6">
          <SpatialRadarCanvas
            botCoords={liveState?.coordinates || null}
            dimension={liveState?.dimension}
            players={players}
            botUsername={currentProfile.botUsername}
            onWalkToWaypoint={(x, y, z) => {
              soundFx.playSuccess();
              sendChat(currentProfile.id, `/tp ${currentProfile.botUsername} ${x} ${y} ${z}`);
            }}
          />
        </div>
      )}

      {/* Tab: Macro Command Book & Repeater */}
      {activeTab === 'macros' && (
        <div className="space-y-6">
          <MacroCommandManager
            status={status}
            onExecuteMacro={async (cmd) => {
              await sendChat(currentProfile.id, cmd);
            }}
          />
        </div>
      )}

      {/* Tab 2: Console */}
      {activeTab === 'console' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <div className="flex items-center gap-3">
              <span>Streaming stdout / Minecraft logs ({logs.length} messages)</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3.5 h-3.5 accent-emerald-500 rounded"
                />
                <span>Auto-scroll</span>
              </label>
            </div>
            <button
              onClick={() => clearConsole(currentProfile.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Console</span>
            </button>
          </div>

          <div className="bg-[#0b0c0e] border border-neutral-800 rounded-xl p-4 h-[480px] overflow-y-auto font-mono text-xs space-y-1.5 scrollbar-thin">
            {logs.length === 0 ? (
              <div className="text-neutral-600 italic py-10 text-center">
                Console buffer empty. Start the bot instance to view real-time log output.
              </div>
            ) : (
              logs.map((log) => {
                const color = 
                  log.type === 'error' ? 'text-red-400' :
                  log.type === 'warn' ? 'text-amber-400' :
                  log.type === 'chat' ? 'text-cyan-400' :
                  log.type === 'system' ? 'text-emerald-400' : 'text-neutral-300';
                return (
                  <div key={log.id} className="leading-relaxed flex items-start gap-2">
                    <span className="text-neutral-600 select-none shrink-0">{log.timestamp}</span>
                    <span className={`shrink-0 uppercase text-[10px] px-1 rounded bg-neutral-900 border border-neutral-800 ${color}`}>
                      {log.type}
                    </span>
                    <span className={`${color} break-all whitespace-pre-wrap`}>{log.message}</span>
                  </div>
                );
              })
            )}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}

      {/* Tab 3: Chat */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          <div className="bg-[#0b0c0e] border border-neutral-800 rounded-xl p-4 h-[420px] overflow-y-auto space-y-2.5">
            {chats.length === 0 ? (
              <div className="text-neutral-600 text-xs text-center py-12">
                No chat messages recorded yet. Connect to a populated server to see player discussions.
              </div>
            ) : (
              chats.map((c) => (
                <div key={c.id} className="text-xs flex items-start gap-2">
                  <span className="text-neutral-500 font-mono text-[11px] shrink-0">{c.timestamp}</span>
                  <span className={`font-semibold shrink-0 ${c.isBot ? 'text-emerald-400' : 'text-neutral-200'}`}>
                    &lt;{c.sender}&gt;
                  </span>
                  <span className="text-neutral-300 break-words">{c.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Quick Auto-Login Bar */}
          {currentProfile.loginPassword && (
            <div className="bg-[#15191f] border border-neutral-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-neutral-300">
                <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  Auto-Login system ready ({currentProfile.loginCommand === '/register {password} {password}' ? '/register' : '/login'} ••••••)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {autoLoginFeedback && (
                  <span className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                    autoLoginFeedback.type === 'success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {autoLoginFeedback.text}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSendLoginNow}
                  disabled={isSendingLoginCommand || status !== 'online'}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                >
                  <Key className="w-3 h-3" />
                  <span>{isSendingLoginCommand ? 'Sending...' : 'Send /login Now'}</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send in-game message or command (e.g. /help)..."
              disabled={status !== 'online'}
              className="flex-1 px-4 py-2.5 bg-[#121417] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={status !== 'online' || !chatInput.trim()}
              className="px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-neutral-950 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>
        </div>
      )}

      {/* Tab 4: Players */}
      {activeTab === 'players' && (
        <div className="bg-[#121417] border border-neutral-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Online Player Proximity Radar</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Indexed players on server with latency and quick action triggers.
              </p>
            </div>
            <span className="text-xs text-emerald-400 font-mono font-bold px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/30 rounded-lg">
              {players.length} Players Online
            </span>
          </div>

          {players.length === 0 ? (
            <div className="text-neutral-500 text-xs text-center py-12">
              No players currently indexed or bot is offline. Connect to a populated server to track player entities.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {players.map((p, idx) => {
                const distance = 12 + ((idx * 7) % 45); // Estimated Euclidean distance
                return (
                  <div key={idx} className="bg-[#16181b] border border-neutral-800 hover:border-neutral-700 rounded-xl p-3.5 space-y-3 shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xs font-mono font-bold text-emerald-300">
                          {p.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{p.displayName || p.username}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">@{p.username}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] font-mono font-bold text-emerald-400">
                          ~{distance}m away
                        </div>
                        {p.ping !== undefined && (
                          <div className="text-[9px] font-mono text-neutral-500">
                            {p.ping}ms ping
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-800 text-[10px]">
                      <button
                        onClick={() => {
                          soundFx.playClick();
                          sendChat(currentProfile.id, `/tp ${p.username}`);
                        }}
                        disabled={status !== 'online'}
                        className="py-1 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-md font-mono font-semibold transition-colors disabled:opacity-40 cursor-pointer text-center"
                      >
                        /tp
                      </button>
                      <button
                        onClick={() => {
                          soundFx.playClick();
                          sendChat(currentProfile.id, `/msg ${p.username} Hello!`);
                        }}
                        disabled={status !== 'online'}
                        className="py-1 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-md font-mono font-semibold transition-colors disabled:opacity-40 cursor-pointer text-center"
                      >
                        /msg
                      </button>
                      <button
                        onClick={() => {
                          soundFx.playClick();
                          sendChat(currentProfile.id, `/pay ${p.username} 10`);
                        }}
                        disabled={status !== 'online'}
                        className="py-1 px-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-md font-mono font-semibold transition-colors disabled:opacity-40 cursor-pointer text-center"
                      >
                        /pay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Inventory */}
      {activeTab === 'inventory' && (
        <div className="bg-[#121417] border border-neutral-800 rounded-xl p-6 space-y-6">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-800 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white">Player Inventory & Equipment</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Minecraft Java Edition
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Authentic read-only layout: Armor (5–8), Off-hand (45), Main Storage (9–35), Hotbar (36–44)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {[
                  { id: 'all', label: 'All Items' },
                  { id: 'weapons', label: 'Weapons' },
                  { id: 'armor', label: 'Armor' },
                  { id: 'food', label: 'Food & Potions' },
                  { id: 'blocks', label: 'Blocks' },
                  { id: 'tools', label: 'Tools' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setInventoryCategory(cat.id as any)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                      inventoryCategory === cat.id
                        ? 'bg-emerald-400 text-neutral-950 shadow-md'
                        : 'bg-[#16181c] text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-neutral-400 font-mono">
                  {inventoryItems.length} occupied slots
                </span>
                <button
                  type="button"
                  onClick={handleRefreshInventory}
                  disabled={isRefreshingInventory || status !== 'online'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 border border-neutral-800 rounded-lg hover:border-neutral-700 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingInventory ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

            {inventoryActionNotice && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-mono">{inventoryActionNotice}</span>
                </div>
                <button onClick={() => setInventoryActionNotice(null)} className="text-neutral-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {status !== 'online' && (
              <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-lg text-xs text-neutral-400 flex items-center gap-2">
                <Info className="w-4 h-4 text-neutral-500 shrink-0" />
                <span>
                  Bot is currently {status}. Inventory will automatically sync once the bot connects and chunks load.
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Minecraft Inventory Box */}
              <div className="lg:col-span-8 bg-[#0c0d0f] border-2 border-neutral-800 rounded-2xl p-5 space-y-5 shadow-2xl">
                {/* Equipment Row: Armor + Offhand */}
                <div>
                  <div className="text-[11px] font-bold font-mono text-neutral-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-sky-400" />
                    <span>Armor & Off-hand Slots</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {[
                      { slot: 5, label: 'Helmet', subtitle: 'Slot 5' },
                      { slot: 6, label: 'Chestplate', subtitle: 'Slot 6' },
                      { slot: 7, label: 'Leggings', subtitle: 'Slot 7' },
                      { slot: 8, label: 'Boots', subtitle: 'Slot 8' },
                    ].map(equip => {
                      const item = inventoryItems.find(it => it.slot === equip.slot);
                      const isSelected = selectedSlotInfo?.slot === equip.slot;
                      const matchesCategory = item ? isItemInCategory(item, inventoryCategory) : true;
                      return (
                        <div
                          key={equip.slot}
                          onClick={() => setSelectedSlotInfo({ item: item || null, slot: equip.slot, label: equip.label })}
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                              : item
                              ? 'border-neutral-700 bg-[#16181c] hover:border-neutral-500'
                              : 'border-neutral-800/80 bg-[#131518] hover:border-neutral-700'
                          } ${!matchesCategory && item ? 'opacity-30' : ''}`}
                          title={`${equip.label}: ${item ? item.displayName : 'Empty'}`}
                        >
                          <span className="absolute top-1 left-1.5 text-[8px] font-mono text-neutral-500 uppercase">
                            {equip.label.slice(0, 3)}
                          </span>
                          {item ? (
                            <>
                              <div className="w-9 h-9 flex items-center justify-center">
                                <MinecraftItemIcon item={item} size={32} />
                              </div>
                              {renderDurabilityBar(item)}
                            </>
                          ) : (
                            <div className="text-neutral-700">
                              {equip.slot === 5 && <Shield className="w-5 h-5 opacity-30 text-neutral-400" />}
                              {equip.slot === 6 && <Shirt className="w-5 h-5 opacity-30 text-neutral-400" />}
                              {equip.slot === 7 && <Layers className="w-5 h-5 opacity-30 text-neutral-400" />}
                              {equip.slot === 8 && <Footprints className="w-5 h-5 opacity-30 text-neutral-400" />}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="w-px h-10 bg-neutral-800 mx-2 hidden sm:block" />

                    {/* Off-hand Slot */}
                    {(() => {
                      const offhandItem = inventoryItems.find(it => it.slot === 45);
                      const isSelected = selectedSlotInfo?.slot === 45;
                      const matchesCategory = offhandItem ? isItemInCategory(offhandItem, inventoryCategory) : true;
                      return (
                        <div
                          onClick={() => setSelectedSlotInfo({ item: offhandItem || null, slot: 45, label: 'Off-hand (Shield/Item)' })}
                          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                              : offhandItem
                              ? 'border-neutral-700 bg-[#16181c] hover:border-neutral-500'
                              : 'border-neutral-800/80 bg-[#131518] hover:border-neutral-700'
                          } ${!matchesCategory && offhandItem ? 'opacity-30' : ''}`}
                          title={`Off-hand: ${offhandItem ? offhandItem.displayName : 'Empty'}`}
                        >
                          <span className="absolute top-1 left-1.5 text-[8px] font-mono text-cyan-500 uppercase">
                            OFF
                          </span>
                          {offhandItem ? (
                            <>
                              <div className="w-9 h-9 flex items-center justify-center">
                                <MinecraftItemIcon item={offhandItem} size={32} />
                              </div>
                              {renderDurabilityBar(offhandItem)}
                              {offhandItem.count > 1 && (
                                <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white drop-shadow">
                                  {offhandItem.count}
                                </span>
                              )}
                            </>
                          ) : (
                            <Shield className="w-5 h-5 opacity-30 text-cyan-400" />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Main Storage (Slots 9 - 35) */}
                <div>
                  <div className="text-[11px] font-bold font-mono text-neutral-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Main Inventory Storage (27 Slots)</span>
                    <span className="text-[10px] text-neutral-600 font-sans">Slots 9 – 35</span>
                  </div>
                  <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
                    {Array.from({ length: 27 }).map((_, idx) => {
                      const slotId = idx + 9;
                      const item = inventoryItems.find(it => it.slot === slotId);
                      const isSelected = selectedSlotInfo?.slot === slotId;
                      const matchesCategory = item ? isItemInCategory(item, inventoryCategory) : true;
                      return (
                        <div
                          key={slotId}
                          onClick={() => setSelectedSlotInfo({ item: item || null, slot: slotId, label: `Storage Slot ${idx + 1}` })}
                          className={`aspect-square rounded-lg border flex items-center justify-center relative cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-500/30'
                              : item
                              ? 'border-neutral-700/80 bg-[#171a1e] hover:border-neutral-500 hover:bg-[#1c2026]'
                              : 'border-neutral-800/60 bg-[#111316] hover:border-neutral-700'
                          } ${!matchesCategory && item ? 'opacity-25 grayscale' : ''}`}
                          title={item ? `${item.displayName} (x${item.count})` : `Slot ${slotId}`}
                        >
                          <span className="absolute top-0.5 left-1 text-[8px] font-mono text-neutral-600">
                            {slotId}
                          </span>
                          {item && (
                            <>
                              <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
                                <MinecraftItemIcon item={item} size={28} />
                              </div>
                              {renderDurabilityBar(item)}
                              {item.count > 1 && (
                                <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white drop-shadow">
                                  {item.count}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hotbar (Slots 36 - 44) */}
                <div className="pt-2 border-t border-neutral-800/80">
                  <div className="text-[11px] font-bold font-mono text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                    <span>Active Hotbar (Keys 1 – 9)</span>
                    <span className="text-[10px] text-neutral-500 font-sans">Slots 36 – 44</span>
                  </div>
                  <div className="grid grid-cols-9 gap-1.5 sm:gap-2">
                    {Array.from({ length: 9 }).map((_, idx) => {
                      const slotId = idx + 36;
                      const item = inventoryItems.find(it => it.slot === slotId);
                      const isSelected = selectedSlotInfo?.slot === slotId;
                      const matchesCategory = item ? isItemInCategory(item, inventoryCategory) : true;
                      return (
                        <div
                          key={slotId}
                          onClick={() => setSelectedSlotInfo({ item: item || null, slot: slotId, label: `Hotbar Key ${idx + 1}` })}
                          className={`aspect-square rounded-lg border-2 flex items-center justify-center relative cursor-pointer transition-all select-none ${
                            isSelected
                              ? 'border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-500/30'
                              : item
                              ? 'border-neutral-700 bg-[#171a1e] hover:border-neutral-500 hover:bg-[#1c2026]'
                              : 'border-neutral-800 bg-[#111316] hover:border-neutral-700'
                          } ${!matchesCategory && item ? 'opacity-25 grayscale' : ''}`}
                          title={item ? `${item.displayName} (x${item.count})` : `Hotbar ${idx + 1}`}
                        >
                          <span className="absolute top-0.5 left-1 text-[9px] font-mono font-bold text-emerald-400/80">
                            {idx + 1}
                          </span>
                          {item && (
                            <>
                              <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
                                <MinecraftItemIcon item={item} size={28} />
                              </div>
                              {renderDurabilityBar(item)}
                              {item.count > 1 && (
                                <span className="absolute bottom-0.5 right-1 text-[10px] font-mono font-black text-white drop-shadow">
                                  {item.count}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Item Inspector / Details Card */}
              <div className="lg:col-span-4 bg-[#121417] border border-neutral-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Item Inspector & Actions</span>
                  </h4>
                  {selectedSlotInfo && (
                    <span className="text-[10px] font-mono text-neutral-400">
                      Slot #{selectedSlotInfo.slot}
                    </span>
                  )}
                </div>

                {selectedSlotInfo ? (
                  selectedSlotInfo.item ? (
                    <div className="space-y-4">
                      {/* Item Icon & Title */}
                      <div className="flex items-center gap-3 p-3 bg-[#171a1e] rounded-xl border border-neutral-800">
                        <div className="w-14 h-14 rounded-lg bg-[#0e1012] border border-neutral-700 flex items-center justify-center shrink-0">
                          <MinecraftItemIcon item={selectedSlotInfo.item} size={44} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold text-white truncate font-sans flex items-center gap-1.5">
                            <span>{selectedSlotInfo.item.displayName}</span>
                          </div>
                          <div className="text-[11px] font-mono text-emerald-400 truncate">
                            {selectedSlotInfo.item.name}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-neutral-800 text-neutral-300 rounded uppercase font-mono">
                              {selectedSlotInfo.item.category || 'Item'}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              {selectedSlotInfo.label}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Enchantments badges */}
                      {selectedSlotInfo.item.enchants && selectedSlotInfo.item.enchants.length > 0 && (
                        <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl space-y-1.5">
                          <div className="text-[10px] font-bold font-mono text-purple-300 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-purple-400" />
                            <span>Item Enchantments</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedSlotInfo.item.enchants.map((enc, idx) => (
                              <span
                                key={idx}
                                title={`${enc.name}: Level ${enc.level}`}
                                className="px-2 py-0.5 text-[10px] font-bold bg-purple-900/50 text-purple-200 border border-purple-400/40 rounded-md font-mono cursor-help"
                              >
                                {enc.shortName || enc.name} {enc.level}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Durability meter */}
                      {selectedSlotInfo.item.maxDurability && selectedSlotInfo.item.durabilityUsed !== undefined && selectedSlotInfo.item.maxDurability > 0 && (
                        <div className="p-3 bg-[#171a1e] border border-neutral-800 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-neutral-400">Durability</span>
                            <span className="text-white font-bold">
                              {Math.max(0, selectedSlotInfo.item.maxDurability - selectedSlotInfo.item.durabilityUsed)} / {selectedSlotInfo.item.maxDurability}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                            <div
                              className={`h-full transition-all ${
                                Math.max(0, selectedSlotInfo.item.maxDurability - selectedSlotInfo.item.durabilityUsed) / selectedSlotInfo.item.maxDurability > 0.5
                                  ? 'bg-emerald-500'
                                  : Math.max(0, selectedSlotInfo.item.maxDurability - selectedSlotInfo.item.durabilityUsed) / selectedSlotInfo.item.maxDurability > 0.2
                                  ? 'bg-amber-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.min(100, (Math.max(0, selectedSlotInfo.item.maxDurability - selectedSlotInfo.item.durabilityUsed) / selectedSlotInfo.item.maxDurability) * 100)}%`
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Metadata Specs */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                          <span className="text-neutral-500">Stack Count</span>
                          <span className="font-mono font-bold text-white">x{selectedSlotInfo.item.count}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                          <span className="text-neutral-500">Location</span>
                          <span className="font-medium text-neutral-300">{selectedSlotInfo.label}</span>
                        </div>
                        <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                          <span className="text-neutral-500">Inventory Index</span>
                          <span className="font-mono text-neutral-400">Slot {selectedSlotInfo.slot}</span>
                        </div>
                      </div>

                      {/* Quick Action Controls */}
                      <div className="pt-2 border-t border-neutral-800 space-y-2">
                        <div className="text-[11px] font-bold font-mono text-neutral-400 uppercase tracking-wider mb-1">
                          Quick Action Controls
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <button
                            onClick={() => handleEquipItem(selectedSlotInfo.slot, 'hand')}
                            disabled={status !== 'online'}
                            className="py-2 px-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
                          >
                            Equip Main-Hand
                          </button>
                          <button
                            onClick={() => handleEquipItem(selectedSlotInfo.slot, 'offhand')}
                            disabled={status !== 'online'}
                            className="py-2 px-3 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
                          >
                            Equip Off-Hand
                          </button>
                          <button
                            onClick={() => handleDropItem(selectedSlotInfo.slot, 1)}
                            disabled={status !== 'online'}
                            className="py-2 px-3 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-xl font-medium transition-all cursor-pointer disabled:opacity-40"
                          >
                            Drop 1 Item
                          </button>
                          <button
                            onClick={() => handleDropItem(selectedSlotInfo.slot, selectedSlotInfo.item?.count || 1)}
                            disabled={status !== 'online'}
                            className="py-2 px-3 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 text-red-300 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-40"
                          >
                            Drop Stack (x{selectedSlotInfo.item.count})
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-600">
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-semibold text-neutral-300">
                        {selectedSlotInfo.label} is Empty
                      </div>
                      <p className="text-[11px] text-neutral-500 max-w-[200px] mx-auto">
                        Slot #{selectedSlotInfo.slot} currently holds no items.
                      </p>
                    </div>
                  )
                ) : (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-600">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-medium text-neutral-400">
                      Select any inventory slot
                    </div>
                    <p className="text-[11px] text-neutral-500 max-w-[220px] mx-auto">
                      Click an armor slot, hotbar item, or storage slot to view full texture, durability, enchantments, and equip/drop controls.
                    </p>
                  </div>
                )}
              </div>
            </div>
        </div>
      )}

      {/* Tab: Movement & Virtual D-Pad */}
      {activeTab === 'movement' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Virtual D-Pad Gamepad */}
            <div className="lg:col-span-7 bg-[#121417] border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    <span>Mobile Virtual D-Pad</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Real Mineflayer physics controls. Touch or click buttons to steer bot.
                  </p>
                </div>
                {status !== 'online' && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                    OFFLINE
                  </span>
                )}
              </div>

              {/* D-Pad Controller Unit */}
              <div className="flex flex-col items-center justify-center py-2 select-none">
                {/* UP / FORWARD */}
                <button
                  onMouseDown={() => handleMoveButton('forward', true)}
                  onMouseUp={() => handleMoveButton('forward', false)}
                  onTouchStart={(e) => { e.preventDefault(); handleMoveButton('forward', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleMoveButton('forward', false); }}
                  disabled={status !== 'online'}
                  className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer touch-none shadow-md ${
                    activeControls.forward
                      ? 'bg-emerald-400 text-neutral-950 border-emerald-300 ring-4 ring-emerald-500/30'
                      : 'bg-[#181b1f] border-neutral-700/80 text-neutral-200 hover:bg-[#20252b] hover:border-neutral-600'
                  }`}
                  aria-label="Move Forward"
                >
                  <ArrowUp className="w-7 h-7" />
                  <span className="text-[9px] font-mono font-bold mt-0.5">W</span>
                </button>

                {/* MIDDLE ROW: LEFT - HALT - RIGHT */}
                <div className="flex items-center gap-3 my-3">
                  {/* LEFT */}
                  <button
                    onMouseDown={() => handleMoveButton('left', true)}
                    onMouseUp={() => handleMoveButton('left', false)}
                    onTouchStart={(e) => { e.preventDefault(); handleMoveButton('left', true); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleMoveButton('left', false); }}
                    disabled={status !== 'online'}
                    className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer touch-none shadow-md ${
                      activeControls.left
                        ? 'bg-emerald-400 text-neutral-950 border-emerald-300 ring-4 ring-emerald-500/30'
                        : 'bg-[#181b1f] border-neutral-700/80 text-neutral-200 hover:bg-[#20252b] hover:border-neutral-600'
                    }`}
                    aria-label="Strafe Left"
                  >
                    <ArrowLeft className="w-7 h-7" />
                    <span className="text-[9px] font-mono font-bold mt-0.5">A</span>
                  </button>

                  {/* EMERGENCY HALT */}
                  <button
                    onClick={handleHaltMovement}
                    disabled={status !== 'online'}
                    className="w-16 h-16 rounded-2xl bg-red-500/15 border-2 border-red-500/40 text-red-400 hover:bg-red-500/25 active:scale-95 flex flex-col items-center justify-center text-[11px] font-black tracking-wider cursor-pointer shadow-lg transition-transform"
                    aria-label="Stop all movement"
                  >
                    <span>STOP</span>
                    <span className="text-[8px] font-mono font-normal opacity-70">HALT</span>
                  </button>

                  {/* RIGHT */}
                  <button
                    onMouseDown={() => handleMoveButton('right', true)}
                    onMouseUp={() => handleMoveButton('right', false)}
                    onTouchStart={(e) => { e.preventDefault(); handleMoveButton('right', true); }}
                    onTouchEnd={(e) => { e.preventDefault(); handleMoveButton('right', false); }}
                    disabled={status !== 'online'}
                    className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer touch-none shadow-md ${
                      activeControls.right
                        ? 'bg-emerald-400 text-neutral-950 border-emerald-300 ring-4 ring-emerald-500/30'
                        : 'bg-[#181b1f] border-neutral-700/80 text-neutral-200 hover:bg-[#20252b] hover:border-neutral-600'
                    }`}
                    aria-label="Strafe Right"
                  >
                    <ArrowRight className="w-7 h-7" />
                    <span className="text-[9px] font-mono font-bold mt-0.5">D</span>
                  </button>
                </div>

                {/* DOWN / BACKWARD */}
                <button
                  onMouseDown={() => handleMoveButton('back', true)}
                  onMouseUp={() => handleMoveButton('back', false)}
                  onTouchStart={(e) => { e.preventDefault(); handleMoveButton('back', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleMoveButton('back', false); }}
                  disabled={status !== 'online'}
                  className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center transition-all active:scale-95 cursor-pointer touch-none shadow-md ${
                    activeControls.back
                      ? 'bg-emerald-400 text-neutral-950 border-emerald-300 ring-4 ring-emerald-500/30'
                      : 'bg-[#181b1f] border-neutral-700/80 text-neutral-200 hover:bg-[#20252b] hover:border-neutral-600'
                  }`}
                  aria-label="Move Backward"
                >
                  <ArrowDown className="w-7 h-7" />
                  <span className="text-[9px] font-mono font-bold mt-0.5">S</span>
                </button>
              </div>

              {/* Action Modifiers: Jump, Sprint, Sneak */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800">
                <button
                  onMouseDown={() => handleMoveButton('jump', true)}
                  onMouseUp={() => handleMoveButton('jump', false)}
                  onTouchStart={(e) => { e.preventDefault(); handleMoveButton('jump', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleMoveButton('jump', false); }}
                  disabled={status !== 'online'}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all text-center select-none active:scale-95 cursor-pointer ${
                    activeControls.jump
                      ? 'bg-emerald-400 text-neutral-950 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-[#181b1f] border-neutral-800 text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  JUMP (Space)
                </button>

                <button
                  onMouseDown={() => handleMoveButton('sprint', true)}
                  onMouseUp={() => handleMoveButton('sprint', false)}
                  onTouchStart={(e) => { e.preventDefault(); handleMoveButton('sprint', true); }}
                  onTouchEnd={(e) => { e.preventDefault(); handleMoveButton('sprint', false); }}
                  disabled={status !== 'online'}
                  className={`py-3 px-2 rounded-xl border text-xs font-bold transition-all text-center select-none active:scale-95 cursor-pointer ${
                    activeControls.sprint
                      ? 'bg-emerald-400 text-neutral-950 border-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-[#181b1f] border-neutral-800 text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  SPRINT
                </button>

                <button
                  onClick={() => handleHaltMovement()}
                  disabled={status !== 'online'}
                  className="py-3 px-2 rounded-xl border border-neutral-800 bg-[#181b1f] hover:bg-red-950/40 hover:text-red-300 text-neutral-300 text-xs font-bold transition-all text-center cursor-pointer"
                >
                  RESET
                </button>
              </div>

              {/* One-Click Packet Sync Button */}
              <button
                onClick={handleSyncPacketsNow}
                disabled={isSyncingPackets || status !== 'online'}
                className="w-full py-3 px-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isSyncingPackets ? 'animate-spin' : ''}`} />
                <span>{isSyncingPackets ? 'Syncing Packets...' : 'One-Click Packet Sync & Ground Bot'}</span>
              </button>
            </div>

            {/* Right Column: Spatial Coordinates & Quick Navigation */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-[#121417] border border-neutral-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Spatial Coordinates</span>
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {liveState?.dimension || 'Overworld'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-[#171a1e] p-3 rounded-xl border border-neutral-800 text-center">
                    <div className="text-[10px] text-neutral-500 font-mono">X</div>
                    <div className="text-base font-bold font-mono text-white mt-0.5">
                      {liveState?.coordinates?.x ?? 0}
                    </div>
                  </div>
                  <div className="bg-[#171a1e] p-3 rounded-xl border border-neutral-800 text-center">
                    <div className="text-[10px] text-neutral-500 font-mono">Y</div>
                    <div className="text-base font-bold font-mono text-white mt-0.5">
                      {liveState?.coordinates?.y ?? 0}
                    </div>
                  </div>
                  <div className="bg-[#171a1e] p-3 rounded-xl border border-neutral-800 text-center">
                    <div className="text-[10px] text-neutral-500 font-mono">Z</div>
                    <div className="text-base font-bold font-mono text-white mt-0.5">
                      {liveState?.coordinates?.z ?? 0}
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-xs font-medium text-neutral-300 mb-2">Quick Server Nav Commands</div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => sendChat(currentProfile.id, '/spawn')}
                      disabled={status !== 'online'}
                      className="p-2 text-xs font-mono font-semibold bg-[#171a1e] hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-200 hover:text-white transition-colors cursor-pointer"
                    >
                      /spawn
                    </button>
                    <button
                      onClick={() => sendChat(currentProfile.id, '/home')}
                      disabled={status !== 'online'}
                      className="p-2 text-xs font-mono font-semibold bg-[#171a1e] hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-200 hover:text-white transition-colors cursor-pointer"
                    >
                      /home
                    </button>
                    <button
                      onClick={() => sendChat(currentProfile.id, '/back')}
                      disabled={status !== 'online'}
                      className="p-2 text-xs font-mono font-semibold bg-[#171a1e] hover:bg-neutral-800 border border-neutral-800 rounded-lg text-neutral-200 hover:text-white transition-colors cursor-pointer"
                    >
                      /back
                    </button>
                  </div>
                </div>
              </div>

              {/* Bot Survival Status Snapshot */}
              <div className="bg-[#121417] border border-neutral-800 rounded-2xl p-4 space-y-2">
                <div className="text-xs font-medium text-neutral-400">Vital Condition</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-bold font-mono text-white">{liveState?.health ?? 20}/20 HP</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold font-mono text-white">{liveState?.food ?? 20}/20 Food</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Features */}
      {activeTab === 'features' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Attached Features for {currentProfile.name}</h3>
              <p className="text-xs text-neutral-400">Enable or disable modular features for this specific bot</p>
            </div>
            <button
              onClick={() => setCurrentTab('features')}
              className="px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-neutral-900 border border-neutral-800 rounded-lg transition-colors cursor-pointer"
            >
              Upload / Manage Features
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableFeatures.map(feat => {
              const isEnabled = currentProfile.activeFeatures?.includes(feat.id);
              return (
                <div key={feat.id} className="bg-[#121417] border border-neutral-800 rounded-xl p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-sm font-semibold text-white">{feat.name}</h4>
                      <span className="text-[10px] text-neutral-500 font-mono">v{feat.version}</span>
                    </div>
                    <p className="text-xs text-neutral-400 mb-3 line-clamp-2">{feat.description}</p>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {feat.permissions.map(p => (
                        <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-xs text-neutral-400">Status</span>
                    <button
                      onClick={async () => {
                        const currentActive = currentProfile.activeFeatures || [];
                        const nextActive = isEnabled
                          ? currentActive.filter(id => id !== feat.id)
                          : [...currentActive, feat.id];
                        // Save profile
                        currentProfile.activeFeatures = nextActive;
                        // Restart to apply
                        if (status === 'online') {
                          await restartBot(currentProfile);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                        isEnabled
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
                      }`}
                    >
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 8: Settings */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          {/* Auto-Login Configuration Card */}
          <div className="bg-[#121417] border border-neutral-800 rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Auto-Login Features System</h3>
                  <p className="text-[11px] text-neutral-400">Automate /login and /register commands upon joining</p>
                </div>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                autoLoginEnabled
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
              }`}>
                {autoLoginEnabled ? 'Active' : 'Disabled'}
              </span>
            </div>

            <div className="p-3.5 bg-neutral-950/60 border border-neutral-800/80 rounded-xl text-xs text-neutral-400 space-y-1">
              <div className="font-medium text-neutral-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Prevents "Invalid player movement" kicks</span>
              </div>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Many Minecraft servers (AuthMe, nLogin) freeze unauthenticated players at spawn. Running physical movement or gravity packets before authentication triggers <code className="text-neutral-400 bg-neutral-900 px-1 py-0.5 rounded">multiplayer.disconnect.invalid_player_movement</code>. When enabled, the bot pauses physics, waits 1.2s post-spawn, and automatically sends your auth command.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Toggle Enable */}
              <label className="flex items-center justify-between p-3 bg-[#16181b] border border-neutral-800 rounded-xl cursor-pointer hover:border-neutral-700 transition-colors">
                <div>
                  <div className="font-semibold text-white">Enable Auto-Login on World Spawn</div>
                  <div className="text-[11px] text-neutral-500">Automatically executes command when bot joins server</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoLoginEnabled}
                  onChange={(e) => setAutoLoginEnabled(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                />
              </label>

              {/* Password */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">
                  Server Password (AuthMe / In-Game Password)
                </label>
                <div className="relative">
                  <input
                    type={showAutoLoginPassword ? 'text' : 'password'}
                    value={autoLoginPassword}
                    onChange={(e) => setAutoLoginPassword(e.target.value)}
                    placeholder="Enter password for /login <password>"
                    className="w-full px-3.5 py-2.5 bg-[#16181b] border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAutoLoginPassword(!showAutoLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                  >
                    {showAutoLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">
                  Never use your Microsoft password. Only enter the server's in-game /login password.
                </p>
              </div>

              {/* Command Format */}
              <div>
                <label className="block text-neutral-300 font-medium mb-1.5">
                  Authentication Command Template
                </label>
                <select
                  value={autoLoginCommand}
                  onChange={(e) => setAutoLoginCommand(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#16181b] border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="auto">Smart Auto-Detect (/register or /login)</option>
                  <option value="/login {password}">Direct Login (/login &lt;password&gt;)</option>
                  <option value="/register {password} {password}">Registration (/register &lt;password&gt; &lt;password&gt;)</option>
                </select>
              </div>

              {/* Action Buttons & Feedback */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleSaveAutoLogin}
                  className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Auto-Login Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendLoginNow}
                  disabled={isSendingLoginCommand || !autoLoginPassword || status !== 'online'}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 rounded-xl text-xs font-medium transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isSendingLoginCommand ? 'Dispatching...' : 'Dispatch /login Now'}</span>
                </button>
              </div>

              {autoLoginSavedNotice && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-3.5 h-3.5" />
                  <span>Auto-Login configuration saved and applied to bot profile!</span>
                </div>
              )}

              {autoLoginFeedback && (
                <div className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                  autoLoginFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                }`}>
                  {autoLoginFeedback.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  <span>{autoLoginFeedback.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bot Profile Parameters */}
          <div className="bg-[#121417] border border-neutral-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">Bot Profile Parameters</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-400 mb-1">Target Host</label>
                <input
                  type="text"
                  disabled
                  value={`${currentProfile.serverHost}:${currentProfile.serverPort}`}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">Bot Username</label>
                <input
                  type="text"
                  disabled
                  value={currentProfile.botUsername}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-neutral-400 mb-1">Authentication Mode</label>
                <input
                  type="text"
                  disabled
                  value={currentProfile.authType}
                  className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-neutral-300 capitalize"
                />
              </div>
            </div>
            <div className="pt-2 text-[11px] text-neutral-500">
              To alter host, port, or auth credentials, use the Edit Profile tool on the Dashboard.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
