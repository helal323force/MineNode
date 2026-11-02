import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';
import { 
  BotProfile, 
  BotLiveState, 
  ConsoleLogMessage, 
  ChatMessage, 
  PlayerInfo, 
  InventoryItem,
  CustomFeature
} from '../types.js';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  updateDoc, 
  getDocs 
} from '../firebase.js';

interface BotContextType {
  profiles: BotProfile[];
  activeStates: Record<string, BotLiveState>;
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;
  createProfile: (profile: Omit<BotProfile, 'id' | 'userId'>) => Promise<string>;
  updateProfile: (profile: BotProfile) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  startBot: (profile: BotProfile) => Promise<{ success: boolean; message: string }>;
  stopBot: (profileId: string) => Promise<{ success: boolean; message: string }>;
  restartBot: (profile: BotProfile) => Promise<{ success: boolean; message: string }>;
  sendChat: (profileId: string, message: string) => Promise<{ success: boolean; message: string }>;
  sendMovement: (profileId: string, control: string, state: boolean) => Promise<{ success: boolean; message: string }>;
  stopMovement: (profileId: string) => Promise<{ success: boolean; message: string }>;
  clearConsole: (profileId: string) => Promise<void>;
  getInventory: (profileId: string) => Promise<InventoryItem[]>;
  updateBotAutomation: (profileId: string, automations: Partial<BotProfile>) => Promise<{ success: boolean; message?: string }>;
  syncPackets: (profileId: string) => Promise<{ success: boolean; message: string }>;
  consoleLogs: Record<string, ConsoleLogMessage[]>;
  chatMessages: Record<string, ChatMessage[]>;
  onlinePlayers: Record<string, PlayerInfo[]>;
  features: CustomFeature[];
  activeBotsCount: number;
}

const BotContext = createContext<BotContextType | null>(null);

export function BotProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, authFetch, refreshAccount } = useAuth();
  const [profiles, setProfiles] = useState<BotProfile[]>([]);
  const [activeStates, setActiveStates] = useState<Record<string, BotLiveState>>({});
  const [consoleLogs, setConsoleLogs] = useState<Record<string, ConsoleLogMessage[]>>({});
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({});
  const [onlinePlayers, setOnlinePlayers] = useState<Record<string, PlayerInfo[]>>({});
  const [features, setFeatures] = useState<CustomFeature[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Initialize Socket.io client
  useEffect(() => {
    const s = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });
    setSocket(s);

    s.on('bot:state', (state: BotLiveState) => {
      setActiveStates(prev => ({ ...prev, [state.profileId]: state }));
    });

    s.on('bot:log', (log: ConsoleLogMessage) => {
      setConsoleLogs(prev => {
        const existing = prev[log.profileId] || [];
        const updated = [...existing, log];
        return { ...prev, [log.profileId]: updated.slice(-300) };
      });
    });

    s.on('bot:logs:init', (logs: ConsoleLogMessage[]) => {
      if (logs.length > 0) {
        const pid = logs[0].profileId;
        setConsoleLogs(prev => ({ ...prev, [pid]: logs }));
      }
    });

    s.on('bot:chat', (chat: ChatMessage) => {
      setChatMessages(prev => {
        const existing = prev[chat.profileId] || [];
        return { ...prev, [chat.profileId]: [...existing, chat].slice(-200) };
      });
    });

    s.on('bot:players', (players: PlayerInfo[]) => {
      if (selectedProfileId) {
        setOnlinePlayers(prev => ({ ...prev, [selectedProfileId]: players }));
      }
    });

    s.on('bot:console:cleared', () => {
      if (selectedProfileId) {
        setConsoleLogs(prev => ({ ...prev, [selectedProfileId]: [] }));
      }
    });

    return () => {
      s.disconnect();
    };
  }, [selectedProfileId]);

  // Join selected bot socket room
  useEffect(() => {
    if (!socket || !selectedProfileId) return;
    socket.emit('join:bot', selectedProfileId);

    return () => {
      socket.emit('leave:bot', selectedProfileId);
    };
  }, [socket, selectedProfileId]);

  // Subscribe to user's bot profiles
  useEffect(() => {
    if (!currentUser) {
      setProfiles([]);
      return;
    }

    try {
      const q = query(collection(db, 'botProfiles'), where('userId', '==', currentUser.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: BotProfile[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          // Filter out any documents that might have a soft-delete flag, 
          // though we will shift to hard-delete.
          if (!data.deleted) {
            list.push({ id: docSnap.id, ...data } as BotProfile);
          }
        });
        
        // Sort by createdAt so the order remains consistent across browsers
        list.sort((a, b) => {
          const timeA = new Date(a.createdAt || 0).getTime();
          const timeB = new Date(b.createdAt || 0).getTime();
          return timeA - timeB;
        });

        setProfiles(list);
        saveProfilesLocal(list); // Keep cache updated for offline mode
        
        if (list.length > 0 && !selectedProfileId) {
          setSelectedProfileId(list[0].id);
        }
      }, async (error) => {
        console.warn('Firestore subscription error:', error);
        // Only load from local if we are truly disconnected or have permission issues
        loadLocalProfiles();
      });

      return () => unsubscribe();
    } catch (e) {
      loadLocalProfiles();
    }

    function loadLocalProfiles() {
      const stored = localStorage.getItem(`minename_profiles_${currentUser?.uid}`);
      if (stored) {
        try {
          const list = JSON.parse(stored);
          setProfiles(list);
          if (list.length > 0 && !selectedProfileId) {
            setSelectedProfileId(list[0].id);
          }
        } catch (e) {}
      }
    }
  }, [currentUser]);

  // Subscribe to custom features
  useEffect(() => {
    if (!currentUser) {
      setFeatures([]);
      return;
    }

    try {
      const q = query(collection(db, 'features'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const list: CustomFeature[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          // Show user's own features or approved public ones
          if (data.userId === currentUser.uid || (data.isPublic && data.status === 'approved')) {
            list.push({ id: docSnap.id, ...data } as CustomFeature);
          }
        });
        setFeatures(list);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('Features subscription error:', e);
    }
  }, [currentUser]);

  // Fetch active bot states on mount
  useEffect(() => {
    if (!currentUser) return;

    const checkActiveBots = async () => {
      try {
        const res = await authFetch('/api/bots');
        if (res.ok) {
          const bots = await res.json();
          const stateMap: Record<string, BotLiveState> = {};
          for (const b of bots) {
            stateMap[b.profileId] = {
              profileId: b.profileId,
              status: b.status,
              uptime: b.uptime,
              ping: 0,
              health: 20,
              maxHealth: 20,
              food: 20,
              coordinates: null,
              dimension: null,
            };
          }
          setActiveStates(stateMap);
        }
      } catch (err) {}
    };

    checkActiveBots();
    const interval = setInterval(checkActiveBots, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const saveProfilesLocal = (list: BotProfile[]) => {
    if (currentUser) {
      localStorage.setItem(`minename_profiles_${currentUser.uid}`, JSON.stringify(list));
    }
  };

  const createProfile = async (data: Omit<BotProfile, 'id' | 'userId'>): Promise<string> => {
    if (!currentUser) throw new Error('Authentication required');
    const newId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newProfile: BotProfile = {
      ...data,
      id: newId,
      userId: currentUser.uid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // We no longer update local state manually here. 
    // We let onSnapshot handle it when the document hits Firestore.
    // This prevents "flicker" and ensuring data is actually saved.
    await setDoc(doc(db, 'botProfiles', newId), newProfile);
    setSelectedProfileId(newId);
    return newId;
  };

  const updateProfile = async (updated: BotProfile): Promise<void> => {
    if (!currentUser) throw new Error('Authentication required');
    const toSave = { ...updated, updatedAt: new Date().toISOString() };
    
    // Optimistic update for UI speed, but Firestore is the source of truth
    setProfiles(prev => prev.map(p => p.id === updated.id ? toSave : p));
    
    await updateDoc(doc(db, 'botProfiles', updated.id), toSave as any);
  };

  const deleteProfile = async (id: string): Promise<void> => {
    if (!currentUser) throw new Error('Authentication required');
    
    // Stop if running
    try {
      await stopBot(id);
    } catch (e) {}

    // Firestore hard delete
    const { deleteDoc: firestoreDeleteDoc } = await import('../firebase.js');
    await firestoreDeleteDoc(doc(db, 'botProfiles', id));

    // Also clear from local cache to prevent reappearance on reload
    const stored = localStorage.getItem(`minename_profiles_${currentUser.uid}`);
    if (stored) {
      try {
        const list = JSON.parse(stored) as BotProfile[];
        const updated = list.filter(p => p.id !== id);
        localStorage.setItem(`minename_profiles_${currentUser.uid}`, JSON.stringify(updated));
      } catch (e) {}
    }

    if (selectedProfileId === id) {
      setSelectedProfileId(profiles.find(p => p.id !== id)?.id || null);
    }
  };


  const startBot = async (profile: BotProfile): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch('/api/bots/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to start bot' };
      }
      refreshAccount();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const stopBot = async (profileId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch('/api/bots/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to stop bot' };
      }
      refreshAccount();
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const restartBot = async (profile: BotProfile): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch('/api/bots/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to restart bot' };
      }
      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const sendChat = async (profileId: string, message: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch(`/api/bots/${profileId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Failed to send chat' };
      }
      return { success: true, message: 'Message sent' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const sendMovement = async (profileId: string, control: string, state: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch(`/api/bots/${profileId}/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ control, state }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error };
      return { success: true, message: 'Movement command accepted' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const stopMovement = async (profileId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch(`/api/bots/${profileId}/movement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stop: true }),
      });
      const data = await res.json();
      return { success: true, message: 'Movement halted' };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const clearConsole = async (profileId: string): Promise<void> => {
    try {
      await authFetch(`/api/bots/${profileId}/logs/clear`, { method: 'POST' });
      setConsoleLogs(prev => ({ ...prev, [profileId]: [] }));
    } catch (e) {}
  };

  const getInventory = async (profileId: string): Promise<InventoryItem[]> => {
    try {
      const res = await authFetch(`/api/bots/${profileId}/inventory`);
      if (res.ok) {
        return await res.json();
      }
      return [];
    } catch (e) {
      return [];
    }
  };

  const updateBotAutomation = async (profileId: string, automations: Partial<BotProfile>): Promise<{ success: boolean; message?: string }> => {
    try {
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, ...automations } : p));
      if (currentUser) {
        updateDoc(doc(db, 'botProfiles', profileId), {
          ...automations,
          updatedAt: new Date().toISOString(),
        }).catch(console.warn);
      }
      const res = await authFetch(`/api/bots/${profileId}/automation`, {
        method: 'POST',
        body: JSON.stringify(automations),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  };

  const syncPackets = async (profileId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch(`/api/bots/${profileId}/sync-packets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) return { success: false, message: data.error || 'Failed to sync packets' };
      return { success: true, message: data.message || 'Position packets resynced.' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Packet sync failed' };
    }
  };

  const activeBotsCount = Object.values(activeStates).filter(
    s => s.status === 'online' || s.status === 'connecting' || s.status === 'reconnecting'
  ).length;

  return (
    <BotContext.Provider
      value={{
        profiles,
        activeStates,
        selectedProfileId,
        setSelectedProfileId,
        createProfile,
        updateProfile,
        deleteProfile,
        startBot,
        stopBot,
        restartBot,
        sendChat,
        sendMovement,
        stopMovement,
        clearConsole,
        getInventory,
        updateBotAutomation,
        syncPackets,
        consoleLogs,
        chatMessages,
        onlinePlayers,
        features,
        activeBotsCount,
      }}
    >
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  const ctx = useContext(BotContext);
  if (!ctx) throw new Error('useBot must be used inside BotProvider');
  return ctx;
}
