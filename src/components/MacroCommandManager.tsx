import React, { useState } from 'react';
import { Send, Plus, Trash2, Play, Square, Clock, Terminal, Sparkles, Check, Bookmark } from 'lucide-react';
import { soundFx } from '../utils/audioEffects.js';

export interface ChatMacro {
  id: string;
  name: string;
  command: string;
  category: 'teleport' | 'combat' | 'economy' | 'utility' | 'chat';
  autoRepeat: boolean;
  repeatIntervalSec: number;
}

interface MacroCommandManagerProps {
  onExecuteMacro: (command: string) => Promise<void>;
  status: string;
}

const DEFAULT_MACROS: ChatMacro[] = [
  { id: 'm1', name: 'Spawn Teleport', command: '/spawn', category: 'teleport', autoRepeat: false, repeatIntervalSec: 0 },
  { id: 'm2', name: 'Home Teleport', command: '/home', category: 'teleport', autoRepeat: false, repeatIntervalSec: 0 },
  { id: 'm3', name: 'Sell All Items', command: '/sell all', category: 'economy', autoRepeat: false, repeatIntervalSec: 0 },
  { id: 'm4', name: 'Claim Daily Kit', command: '/kit claim', category: 'utility', autoRepeat: false, repeatIntervalSec: 0 },
  { id: 'm5', name: 'Feed & Heal', command: '/feed', category: 'utility', autoRepeat: false, repeatIntervalSec: 0 },
  { id: 'm6', name: 'Fix Armor & Tools', command: '/fix all', category: 'utility', autoRepeat: false, repeatIntervalSec: 0 },
];

export function MacroCommandManager({ onExecuteMacro, status }: MacroCommandManagerProps) {
  const [macros, setMacros] = useState<ChatMacro[]>(DEFAULT_MACROS);
  const [newMacroName, setNewMacroName] = useState('');
  const [newMacroCommand, setNewMacroCommand] = useState('');
  const [newMacroCategory, setNewMacroCategory] = useState<ChatMacro['category']>('utility');
  const [activeRepeatingMacroId, setActiveRepeatingMacroId] = useState<string | null>(null);
  const [repeatingTimer, setRepeatingTimer] = useState<any>(null);
  const [executionFeedback, setExecutionFeedback] = useState<string | null>(null);

  const handleAddMacro = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMacroName.trim() || !newMacroCommand.trim()) return;

    soundFx.playClick();
    const created: ChatMacro = {
      id: `macro-${Date.now()}`,
      name: newMacroName.trim(),
      command: newMacroCommand.trim().startsWith('/') ? newMacroCommand.trim() : `/${newMacroCommand.trim()}`,
      category: newMacroCategory,
      autoRepeat: false,
      repeatIntervalSec: 30,
    };

    setMacros(prev => [...prev, created]);
    setNewMacroName('');
    setNewMacroCommand('');
  };

  const handleDeleteMacro = (id: string) => {
    soundFx.playClick();
    setMacros(prev => prev.filter(m => m.id !== id));
    if (activeRepeatingMacroId === id && repeatingTimer) {
      clearInterval(repeatingTimer);
      setActiveRepeatingMacroId(null);
      setRepeatingTimer(null);
    }
  };

  const handleRunMacroNow = async (m: ChatMacro) => {
    soundFx.playClick();
    setExecutionFeedback(`Dispatched macro "${m.name}" (${m.command})`);
    await onExecuteMacro(m.command);
    setTimeout(() => setExecutionFeedback(null), 3000);
  };

  const handleToggleAutoRepeat = (m: ChatMacro) => {
    if (activeRepeatingMacroId === m.id) {
      soundFx.playToggle(false);
      clearInterval(repeatingTimer);
      setActiveRepeatingMacroId(null);
      setRepeatingTimer(null);
      setExecutionFeedback(`Stopped auto-repeat loop for "${m.name}"`);
    } else {
      if (repeatingTimer) clearInterval(repeatingTimer);
      soundFx.playToggle(true);
      setActiveRepeatingMacroId(m.id);
      setExecutionFeedback(`Started auto-repeat loop for "${m.name}" (Every 30s)`);

      // Fire immediately
      onExecuteMacro(m.command);

      const timer = setInterval(() => {
        onExecuteMacro(m.command);
      }, 30000);
      setRepeatingTimer(timer);
    }
    setTimeout(() => setExecutionFeedback(null), 4000);
  };

  return (
    <div className="bg-[#121417] border border-neutral-800 rounded-2xl p-5 space-y-5 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Bookmark className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Macro Command Book & Repeater</span>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                1-CLICK MACROS
              </span>
            </h3>
            <p className="text-xs text-neutral-400">
              Save custom server chat macros and trigger automated command loops with single clicks.
            </p>
          </div>
        </div>

        {activeRepeatingMacroId && (
          <span className="px-3 py-1 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold rounded-xl flex items-center gap-1.5 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Macro Loop Active</span>
          </span>
        )}
      </div>

      {executionFeedback && (
        <div className="p-2.5 bg-purple-950/60 border border-purple-500/40 rounded-xl text-xs text-purple-300 flex items-center gap-2 font-mono shadow-md">
          <Check className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{executionFeedback}</span>
        </div>
      )}

      {/* Grid of Saved Macros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {macros.map((m) => {
          const isRepeating = activeRepeatingMacroId === m.id;
          return (
            <div
              key={m.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                isRepeating
                  ? 'bg-purple-950/30 border-purple-500/60 shadow-lg ring-1 ring-purple-500/30'
                  : 'bg-[#171a1e] border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-bold text-white font-sans truncate">{m.name}</span>
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400">
                    {m.category}
                  </span>
                </div>
                <code className="text-[11px] font-mono text-emerald-400 block truncate bg-neutral-950 px-2 py-1 rounded border border-neutral-900">
                  {m.command}
                </code>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/60">
                <button
                  onClick={() => handleRunMacroNow(m)}
                  disabled={status !== 'online'}
                  className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Send className="w-3 h-3" />
                  <span>Run Now</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleAutoRepeat(m)}
                    disabled={status !== 'online'}
                    className={`p-1.5 rounded-lg border text-xs transition-all cursor-pointer disabled:opacity-40 ${
                      isRepeating
                        ? 'bg-purple-500 text-neutral-950 border-purple-400 font-bold'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                    }`}
                    title={isRepeating ? 'Stop Auto-Repeat Loop' : 'Start Auto-Repeat Loop (30s)'}
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteMacro(m.id)}
                    className="p-1.5 rounded-lg bg-neutral-900 text-neutral-500 hover:text-red-400 border border-neutral-800 transition-colors cursor-pointer"
                    title="Delete Macro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Macro Form */}
      <form onSubmit={handleAddMacro} className="p-4 bg-[#171a1e] border border-neutral-800 rounded-xl space-y-3">
        <div className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Custom Macro Command</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          <div className="sm:col-span-4">
            <input
              type="text"
              placeholder="Macro Title (e.g., Warp Shop)"
              value={newMacroName}
              onChange={(e) => setNewMacroName(e.target.value)}
              className="w-full px-3 py-2 bg-[#121417] border border-neutral-800 rounded-lg text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <div className="sm:col-span-5">
            <input
              type="text"
              placeholder="Chat Command (e.g., /warp shop)"
              value={newMacroCommand}
              onChange={(e) => setNewMacroCommand(e.target.value)}
              className="w-full px-3 py-2 bg-[#121417] border border-neutral-800 rounded-lg text-emerald-400 placeholder-neutral-600 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <select
              value={newMacroCategory}
              onChange={(e) => setNewMacroCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#121417] border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
            >
              <option value="utility">Utility</option>
              <option value="teleport">Teleport</option>
              <option value="economy">Economy</option>
              <option value="combat">Combat</option>
              <option value="chat">Chat Ad</option>
            </select>

            <button
              type="submit"
              disabled={!newMacroName.trim() || !newMacroCommand.trim()}
              className="px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-bold rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-40"
            >
              Save
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
