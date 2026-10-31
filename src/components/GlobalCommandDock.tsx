import React from 'react';
import { motion } from 'framer-motion';
import { Play, Square, RefreshCw, Zap } from 'lucide-react';

interface GlobalCommandDockProps {
  onStartAll: () => void;
  onStopAll: () => void;
  onSyncAll: () => void;
  runningCount: number;
  totalCount: number;
}

export function GlobalCommandDock({ onStartAll, onStopAll, onSyncAll, runningCount, totalCount }: GlobalCommandDockProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:w-max bg-[#121417]/90 backdrop-blur-md border border-neutral-800 rounded-2xl p-3 shadow-2xl flex items-center gap-2 z-50"
    >
      <div className="px-3 border-r border-neutral-800 hidden md:block">
        <div className="text-[10px] text-neutral-500 font-bold uppercase">System</div>
        <div className="text-xs font-bold text-white font-mono">{runningCount} / {totalCount} Online</div>
      </div>
      
      <button onClick={onStartAll} className="p-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all cursor-pointer" title="Start All Online">
        <Play className="w-4 h-4" />
      </button>
      <button onClick={onStopAll} className="p-2.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all cursor-pointer" title="Stop All Active">
        <Square className="w-4 h-4" />
      </button>
      <button onClick={onSyncAll} className="p-2.5 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 rounded-xl transition-all cursor-pointer" title="Sync All">
        <RefreshCw className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
