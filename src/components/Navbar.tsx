import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Shield, Terminal, LogOut, User, Menu, X, Cpu } from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export function Navbar({ currentTab, setCurrentTab }: NavbarProps) {
  const { currentUser, account, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', authOnly: true },
    { id: 'control-panel', label: 'Control Panel', authOnly: true },
    { id: 'features', label: 'Features', authOnly: true },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', authOnly: true }] : []),
    { id: 'docs', label: 'Documentation', authOnly: false },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0c0d0e]/90 backdrop-blur-md border-b border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <button
          onClick={() => setCurrentTab('landing')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:border-emerald-500/40 transition-colors">
            <Cpu className="w-4 h-4" />
          </div>
          <span className="text-base font-semibold tracking-tight text-neutral-100 whitespace-nowrap shrink-0">
            MineNode
          </span>
        </button>

        {/* Zone 2: 4-5 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            if (item.authOnly && !currentUser) return null;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                  isActive
                    ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-medium text-neutral-200 truncate max-w-[150px]">
                  {account?.displayName || currentUser.email?.split('@')[0]}
                </span>
                <span className="text-[11px] text-neutral-500 capitalize">
                  {isAdmin ? 'Administrator' : 'Bot Operator'}
                </span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTab('login')}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-300 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign In
              </button>
              <button
                onClick={() => setCurrentTab('register')}
                className="px-4 py-1.5 text-xs font-medium text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer font-semibold shadow-sm"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-neutral-400 hover:text-neutral-200 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-800 bg-[#0f1113] px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => {
            if (item.authOnly && !currentUser) return null;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors block ${
                  isActive
                    ? 'bg-neutral-800 text-emerald-400 font-semibold'
                    : 'text-neutral-300 hover:bg-neutral-800/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          {!currentUser && (
            <div className="pt-2 border-t border-neutral-800 flex gap-2">
              <button
                onClick={() => {
                  setCurrentTab('login');
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 text-center text-xs text-neutral-300 bg-neutral-800 rounded-lg"
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setCurrentTab('register');
                  setMobileMenuOpen(false);
                }}
                className="flex-1 py-2 text-center text-xs font-semibold text-neutral-950 bg-emerald-400 rounded-lg"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
