export type AuthType = 'offline' | 'microsoft';

export interface BotProfile {
  id: string;
  userId: string;
  name: string;
  serverHost: string;
  serverPort: number;
  botUsername: string;
  authType: AuthType;
  version?: string;
  autoReconnect: boolean;
  reconnectDelay: number;
  autoLogin?: boolean;
  loginPassword?: string;
  loginCommand?: string;
  // Automation settings
  autoEat?: boolean;
  autoArmor?: boolean;
  autoTotem?: boolean;
  afkAntiKick?: boolean;
  guardMode?: boolean;
  autoFish?: boolean;
  autoMinerTarget?: { x: number; y: number; z: number } | null;
  activeFeatures: string[];
  featureConfigs?: Record<string, Record<string, any>>;
  createdAt?: string;
  updatedAt?: string;
}

export type BotConnectionStatus = 
  | 'stopped'
  | 'connecting'
  | 'online'
  | 'reconnecting'
  | 'error'
  | 'kicked';

export interface BotLiveState {
  profileId: string;
  status: BotConnectionStatus;
  uptime: number; // in seconds
  ping: number;
  health: number;
  maxHealth: number;
  food: number;
  coordinates: { x: number; y: number; z: number } | null;
  dimension: string | null;
  errorMessage?: string;
  lastConnected?: string;
  activeAutomations?: {
    autoEat?: boolean;
    autoArmor?: boolean;
    autoTotem?: boolean;
    afkAntiKick?: boolean;
    guardMode?: boolean;
    autoFish?: boolean;
  };
  serverInfo?: {
    host: string;
    port: number;
    version?: string;
  };
}

export interface ConsoleLogMessage {
  id: string;
  profileId: string;
  type: 'info' | 'chat' | 'warn' | 'error' | 'system';
  message: string;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  profileId: string;
  sender: string;
  message: string;
  isBot: boolean;
  timestamp: string;
}

export interface PlayerInfo {
  username: string;
  displayName?: string;
  ping?: number;
  uuid?: string;
}

export interface InventoryItem {
  slot: number;
  name: string;
  displayName: string;
  count: number;
  stackSize?: number;
}

export interface FeatureManifest {
  name: string;
  description: string;
  version: string;
  entryPoint: string;
  botApiVersion: string;
  permissions: Array<'chat' | 'movement' | 'events' | 'status'>;
  configSchema?: Record<string, {
    type: 'string' | 'number' | 'boolean';
    label: string;
    default?: any;
    description?: string;
  }>;
}

export interface CustomFeature {
  id: string;
  userId: string;
  authorEmail: string;
  name: string;
  description: string;
  version: string;
  entryPoint: string;
  botApiVersion: string;
  permissions: string[];
  configSchema?: string; // serialized JSON
  code: string;
  isPublic: boolean;
  status: 'private' | 'pending' | 'approved' | 'rejected' | 'suspended';
  createdAt: string;
  updatedAt: string;
  activeCount?: number;
}

export interface UserAccount {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  botLimit: number;
  featureLimit: number;
  isSuspended: boolean;
  activeBotsCount?: number;
  createdAt?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  category: 'user' | 'admin' | 'bot' | 'feature' | 'security';
  details: string;
  timestamp: string;
}

export interface WorkerMetrics {
  cpuUsagePercent: number;
  ramUsageMb: number;
  totalRamMb: number;
  activeBots: number;
  workerUptime: number;
  status: 'healthy' | 'degraded' | 'critical';
  nodeVersion: string;
  platform: string;
}
