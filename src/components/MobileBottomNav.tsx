import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useBot } from '../context/BotContext.js';
import { LayoutDashboard, Sliders, Puzzle, ShieldAlert, BookOpen } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export function MobileBottomNav({ currentTab, setCurrentTab }: MobileBottomNavProps) {
  const { currentUser, isAdmin } = useAuth();
  const { activeBotsCount } = useBot();

  // If user is not logged in, don't show the bottom app nav
  if (!currentUser) return null;

  const items = [
    {
      id: 'dashboard',
      label: 'Servers',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'control-panel',
      label: 'Control',
      icon: Sliders,
      badge: activeBotsCount > 0 ? activeBotsCount : null,
    },
    {
      id: 'features',
      label: 'Features',
      icon: Puzzle,
      badge: null,
    },
    ...(isAdmin ? [{
      id: 'admin',
      label: 'Admin',
      icon: ShieldAlert,
      badge: null,
    }] : []),
    {
      id: 'docs',
      label: 'Docs',
      icon: BookOpen,
      badge: null,
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0c0d0e]/95 backdrop-blur-xl border-t border-neutral-800/90 px-1 py-1 flex items-center justify-around h-16 shadow-[0_-8px_20px_rgba(0,0,0,0.5)]">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id)}
            className={`relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all duration-150 select-none cursor-pointer ${
              isActive
                ? 'text-emerald-400 font-semibold scale-105'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : ''}`} />
              {typeof item.badge === 'number' && (
                <span className="absolute -top-1 -right-2.5 px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500 text-neutral-950 rounded-full min-w-[15px] text-center shadow">
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-1 tracking-tight truncate max-w-[64px] ${isActive ? 'text-emerald-300 font-medium' : 'text-neutral-400'}`}>
              {item.label}
            </span>
            {isActive && (
              <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
