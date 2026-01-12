
export interface Business {
  id: string;
  name: string;
  customName?: string; // New: User defined name
  type: 'retail' | 'transport' | 'industry' | 'service';
  baseCost: number;
  baseIncome: number;
  level: number;
  icon: string;
  owned: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  ownedAmount: number;
  history: Candle[]; // Changed to OHLC objects for Candlestick charts
}

export interface MiningFarm {
  gpuLevel: number;
  gpuCount: number;
  maxSlots: number;
  btcBalance: number;
  energyDebt: number; // New: Accumulated energy cost
}

export interface PromoCode {
  id: string;
  code: string;
  reward: number;
  maxActivations: number;
  usedByPlayerIds: string[];
  expiresAt: number | null;
}

export type TicketStatus = 'pending' | 'investigating' | 'resolved' | 'closed';

export interface ChatMessage {
    id: string;
    sender: 'user' | 'admin';
    text: string;
    timestamp: number;
}

export interface SupportTicket {
    id: string;
    playerId: string;
    playerUsername: string;
    title: string;
    description: string;
    status: TicketStatus;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}

// --- ASSETS SYSTEM TYPES (NEW) ---

export type AssetCategory = 'property' | 'transport' | 'luxury' | 'nft' | 'title';

export interface GameAsset {
    id: string;
    name: string;
    category: AssetCategory;
    subCategory?: 'land' | 'air' | 'water' | 'watch' | 'jewelry' | 'art'; // For filters/badges
    price: number;
    image: string; // URL to image
    description?: string;
    netWorthBonus?: number; // How much it adds to leaderboard value (usually price)
    titleColor?: string; // If it's a title
    effectType?: 'orbit' | 'pulse' | 'shine'; // Special visual effects for titles
}

// --- CLAN SYSTEM TYPES ---

export interface ClanRole {
    id: string;
    name: string;
    color: string; // Hex color for the role badge
    priority: number; // 0 = member, 100 = leader. Higher can manage lower.
    permissions: {
        canKick: boolean;
        canMute: boolean;
        canInvite: boolean;
        canManageRoles: boolean;
    };
}

export interface ClanMemberData {
    id: string;
    roleId: string;
    joinedAt: number;
    mutedUntil: number | null;
}

export interface ClanMessage {
    id: string;
    senderId: string;
    senderName: string;
    roleColor?: string; // Cache color for visuals
    text: string;
    timestamp: number;
}

export interface Clan {
    id: string;
    name: string;
    description: string;
    leaderId: string;
    
    // New Structure
    members: Record<string, ClanMemberData>; // Map playerId -> Data
    roles: ClanRole[];
    
    memberIds: string[]; // Keep for legacy/easy access, sync with members keys
    
    maxMembers: number;
    chatHistory: ClanMessage[];
    createdAt: number;
}

export interface ClanInvite {
    id: string;
    clanId: string;
    clanName: string;
    toPlayerId: string;
    timestamp: number;
}

// --- TRADE SYSTEM TYPES ---

export interface TradeOffer {
    money: number;
    businessIds: string[]; // IDs of businesses to transfer
}

export interface TradeSession {
    id: string;
    player1Id: string; // Initiator
    player2Id: string; // Receiver
    p1Offer: TradeOffer;
    p2Offer: TradeOffer;
    p1Ready: boolean;
    p2Ready: boolean;
    status: 'active' | 'completed' | 'cancelled';
    createdAt: number;
}

export interface TradeRequest {
    id: string;
    fromPlayerId: string;
    fromPlayerName: string;
    toPlayerId: string;
    status: 'pending' | 'rejected';
    timestamp: number;
}

export interface Player {
  id: string;
  username: string;
  passwordHash: string;
  registrationIp: string; // IP at creation
  lastLoginIp: string;    // IP at last login
  registrationDate: number; // Timestamp of registration
  avatarId: string; // New: Avatar ID
  playtime: number; // New: Total seconds played
  clanId?: string; // New: Clan ID
  logs: string[]; // Action logs
  isAdmin: boolean;
  balance: number;
  maxMoney: number; // Statistic: Max money ever reached
  clickLevel: number;
  clickExp: number;
  clickExpMax: number;
  bannedUntil: number | null; // null = active, -1 = perma ban, >0 = timestamp
  banReason?: string; // Reason for ban
  businesses: Business[];
  investments: Investment[];
  miningFarm: MiningFarm;
  // NEW FIELDS FOR SHOP
  ownedAssetIds: string[];
  activeTitleId?: string;
  
  lastLogin: number;
  lastMarketUpdate?: number;
}

export interface GameDatabase {
  players: Player[];
  promoCodes: PromoCode[];
  tickets: SupportTicket[]; // New: Support tickets
  tradeRequests: TradeRequest[]; // New: Pending requests
  activeTrades: TradeSession[]; // New: Active sessions
  clans: Clan[]; // New: Clans
  clanInvites: ClanInvite[]; // New: Clan Invites
  bannedIps: string[]; // List of banned IPs
  config: {
    version: string;
    globalMultiplier: number;
    taxRate: number;
    energyCostPerGpu: number;
    activeTrack: string; // Controlled by Admin
    isMusicEnabled: boolean; // Global Master Switch
    customTracks: { id: string, name: string, url: string, isHidden?: boolean }[]; // Admin added tracks
  };
}

export type Language = 'ru' | 'en';

export interface AppSettings {
  showChristmasVibe: boolean;
  enableMusic: boolean;
  musicVolume: number; // 0.0 to 1.0
  selectedTrack: string; // Legacy/Local override if needed, but mainly controlled by admin now
  language: Language;
}

export enum GameTab {
  MAIN = 'MAIN',
  BUSINESS = 'BUSINESS',
  MINING = 'MINING',
  INVEST = 'INVEST',
  ASSETS = 'ASSETS', // NEW TAB
  LEADERBOARD = 'LEADERBOARD',
  SETTINGS = 'SETTINGS',
  ADMIN = 'ADMIN'
}