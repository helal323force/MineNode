import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { BotProvider } from './context/BotContext.js';
import { Navbar } from './components/Navbar.js';
import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { BotControlPanel } from './pages/BotControlPanel.js';
import { FeaturesPage } from './pages/FeaturesPage.js';
import { AdminDashboard } from './pages/AdminDashboard.js';
import { DocumentationPage } from './pages/DocumentationPage.js';
import { MobileBottomNav } from './components/MobileBottomNav.js';

function MainApp() {
  const { currentUser, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('landing');

  // Once authenticated, if currently on landing, login or register, switch to dashboard
  useEffect(() => {
    if (currentUser && (currentTab === 'landing' || currentTab === 'login' || currentTab === 'register')) {
      setCurrentTab('dashboard');
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0d0e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-neutral-400">Loading MineNode...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0d0e] text-neutral-100 flex flex-col font-sans max-w-full overflow-x-hidden">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className={`flex-1 max-w-full overflow-x-hidden ${currentUser ? 'pb-20 md:pb-6' : ''}`}>
        {currentTab === 'landing' && <LandingPage setCurrentTab={setCurrentTab} />}
        {currentTab === 'login' && <LoginPage setCurrentTab={setCurrentTab} />}
        {currentTab === 'register' && <RegisterPage setCurrentTab={setCurrentTab} />}
        {currentTab === 'dashboard' && <DashboardPage setCurrentTab={setCurrentTab} />}
        {currentTab === 'control-panel' && <BotControlPanel setCurrentTab={setCurrentTab} />}
        {currentTab === 'features' && <FeaturesPage setCurrentTab={setCurrentTab} />}
        {currentTab === 'admin' && <AdminDashboard />}
        {currentTab === 'docs' && <DocumentationPage />}
      </main>

      <MobileBottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BotProvider>
        <MainApp />
      </BotProvider>
    </AuthProvider>
  );
}
