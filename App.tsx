import React, { useState, useEffect, useRef } from 'react';
import { GameService } from './services/gameDb';
import { Player, GameTab, AppSettings } from './types';
import Auth from './components/Auth';
import ClickerTab from './components/ClickerTab';
import BusinessTab from './components/BusinessTab';
import InvestTab from './components/InvestTab';
import AdminPanel from './components/AdminPanel';
import LeaderboardTab from './components/LeaderboardTab';
import SettingsTab from './components/SettingsTab';
import MiningTab from './components/MiningTab';
import AssetsTab from './components/AssetsTab';
import SnowOverlay from './components/SnowOverlay';
import { MousePointer2, Building2, TrendingUp, ShieldAlert, Settings, Server, Menu, Trophy, User, ShoppingBag } from 'lucide-react';
import { t } from './utils/translations';

export const TRACK_URLS: Record<string, string> = {
    'christmas': 'https://rus.hitmotop.com/get/music/20150903/Wham_-_Last_Christmas_28464045.mp3',
    'koshak': 'https://muzce.com/mp3/files/2025/12/28/koshak-obrygan.mp3',
    'tropical': 'https://www.chosic.com/wp-content/uploads/2022/03/Luke-Bergs-Tropical-Soulmp3(chosic.com).mp3',
    'sneaky': 'https://www.chosic.com/wp-content/uploads/2022/06/Sneaky-Snitch(chosic.com).mp3',
    'ohnonono': 'https://track.pinkamuz.pro/download/33313731b1b43432358f373135b334b2b034310100/70c62cfe0f19741b50c20851ec0be7cb/DJ%20KVNXD%20-%20OH%20NO%20NO%20NO%20FUNK.mp3',
    'babylaugh': 'https://ruo.morsmusic.org/load/2128882113/VHM4D_-_BABY_LAUGH_JERSEY_FUNK_(musmore.org).mp3'
};

const App: React.FC = () => {
  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentTab, setCurrentTab] = useState<GameTab>(GameTab.MAIN);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState<{reason?: string, until: number | null}>({ until: null });

  // App Settings State
  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
      const saved = localStorage.getItem('ft_app_settings');
      const defaults: AppSettings = { 
          showChristmasVibe: true, 
          enableMusic: true, 
          musicVolume: 0.5, // Default 50% volume
          selectedTrack: 'global', // Default to global radio
          language: 'ru' 
      };
      
      if (saved) {
          const parsed = JSON.parse(saved);
          // Ensure defaults for new fields
          return { ...defaults, ...parsed };
      }
      return defaults;
  });

  // Global Config State (Synced with DB)
  const [globalConfig, setGlobalConfig] = useState(GameService.loadDatabase().config);

  // Audio Reference
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Timers
  const loopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const marketTickRef = useRef<number>(0); // Counts seconds for market update

  // Auto-login on mount
  useEffect(() => {
      const savedPlayer = GameService.restoreSession();
      if (savedPlayer) {
          handleLogin(savedPlayer.id);
      }
  }, []);

  // Effect to apply settings & Music
  useEffect(() => {
      // Save local settings
      localStorage.setItem('ft_app_settings', JSON.stringify(appSettings));
      
      // Init Audio if needed
      if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.loop = true;
      }

      // 1. Determine which track SHOULD play based on settings
      let targetTrackKey: string | null = null;
      const isGlobalMode = !appSettings.selectedTrack || appSettings.selectedTrack === 'global';

      if (isGlobalMode) {
          // In Global Mode, we listen to Admin's choice
          if (globalConfig.isMusicEnabled) {
              targetTrackKey = globalConfig.activeTrack || 'christmas';
          } else {
              targetTrackKey = null; // Admin disabled radio
          }
      } else {
          // User selected a specific local track (overrides Admin disable)
          targetTrackKey = appSettings.selectedTrack;
      }

      // 2. Determine target URL
      // Check built-in tracks first, then custom tracks
      let targetSrc = '';
      if (targetTrackKey) {
          if (TRACK_URLS[targetTrackKey]) {
              targetSrc = TRACK_URLS[targetTrackKey];
          } else {
              // Look in custom tracks
              const custom = globalConfig.customTracks?.find(t => t.id === targetTrackKey);
              // CRITICAL CHECK: Ensure track exists AND is not hidden
              if (custom && !custom.isHidden) {
                  targetSrc = custom.url;
              }
          }
      }

      // 3. Handle Source Switching
      // If targetSrc is empty (track hidden/deleted), we stop playing.
      if (audioRef.current.src !== targetSrc) {
          if (!targetSrc) {
              // Stop if no valid track
              audioRef.current.pause();
              audioRef.current.src = ""; 
          } else {
              const wasPlaying = !audioRef.current.paused;
              audioRef.current.src = targetSrc;
              audioRef.current.volume = appSettings.musicVolume; 
              
              if (wasPlaying && appSettings.enableMusic) {
                  audioRef.current.play().catch(e => console.log("Playback error", e));
              }
          }
      }

      // 4. Apply Volume dynamically
      if (audioRef.current) {
          audioRef.current.volume = appSettings.musicVolume;
      }

      // 5. Play/Pause Logic
      // Plays ONLY if:
      // a. User is logged in
      // b. User's local mute is OFF (enableMusic = true)
      // c. We actually have a valid track selected (targetSrc is present)
      const shouldPlay = activePlayerId && appSettings.enableMusic && !!targetSrc;

      if (shouldPlay) {
          // Only call play if paused to avoid promise spam
          if (audioRef.current.paused) {
              audioRef.current.play().catch(e => {
                  console.log("Audio autoplay prevented", e);
              });
          }
      } else {
          if (!audioRef.current.paused) {
              audioRef.current.pause();
          }
      }

  }, [appSettings, activePlayerId, globalConfig]);

  const handleLogin = (id: string) => {
    const p = GameService.getPlayer(id);
    if (p) {
        // Check ban status: if until is -1 (perma) or > now
        if (p.bannedUntil && (p.bannedUntil === -1 || p.bannedUntil > Date.now())) {
            setIsBanned(true);
            setBanInfo({ reason: p.banReason, until: p.bannedUntil });
            setPlayer(p); 
            setActivePlayerId(id);
        } else {
            setIsBanned(false);
            if (p.bannedUntil) GameService.unbanUser(id); // Auto-unban if time expired
            setPlayer(p);
            setActivePlayerId(id);
            GameService.saveSession(id);
        }
    } else {
        alert("Ошибка входа: Не удалось загрузить данные пользователя.");
        GameService.clearSession();
    }
  };

  const handleLogout = () => {
    setActivePlayerId(null);
    setPlayer(null);
    setIsBanned(false);
    setCurrentTab(GameTab.MAIN);
    GameService.clearSession();
    // Stop music on logout
    if (audioRef.current) audioRef.current.pause();
  };

  const updatePlayerState = (newPlayer: Player) => {
    setPlayer(newPlayer);
    GameService.updatePlayer(newPlayer);
  };

  useEffect(() => {
    if (!activePlayerId || isBanned) return;

    loopRef.current = setInterval(() => {
        // --- READ GLOBAL CONFIG EVERY TICK TO SYNC ADMIN CHANGES ---
        // This ensures if Admin changes track, users update within 1s
        const db = GameService.loadDatabase();
        
        // Deep comparison optimization could go here, but for config object it's cheap enough
        // to just set it and let React reconcile or simple stringify check if needed.
        // We use JSON.stringify to avoid infinite loop in dependency array if object ref changes but content doesn't.
        setGlobalConfig(prev => {
            if (JSON.stringify(prev) !== JSON.stringify(db.config)) {
                return db.config;
            }
            return prev;
        });
        
        setPlayer(prev => {
            if (!prev) return null;
            
            // Check for DB consistency regarding bans (e.g. if banned by IP in another tab/action)
            const freshData = GameService.getPlayer(prev.id);
            if (freshData?.bannedUntil && (freshData.bannedUntil === -1 || freshData.bannedUntil > Date.now())) {
                 setIsBanned(true);
                 setBanInfo({ reason: freshData.banReason, until: freshData.bannedUntil });
                 return prev; 
            }

            // 1. Business Logic
            const { net: bizNet } = GameService.calculateBusinessIncome(prev);
            
            // 2. Mining Logic (Earn BTC, Accumulate Debt)
            const { btcIncome, energyCost: miningCost } = GameService.calculateMiningPerformance(prev);
            
            // 3. Balance Updates
            let newBalance = prev.balance + bizNet;
            
            const newBtcBalance = (prev.miningFarm.btcBalance || 0) + btcIncome;
            const newEnergyDebt = (prev.miningFarm.energyDebt || 0) + miningCost;
            
            // 3.1 Max Money Tracker
            let newMaxMoney = prev.maxMoney || 0;
            if (newBalance > newMaxMoney) newMaxMoney = newBalance;

            let updatedPlayer = { 
                ...prev, 
                balance: newBalance,
                maxMoney: newMaxMoney,
                miningFarm: {
                    ...prev.miningFarm,
                    btcBalance: newBtcBalance,
                    energyDebt: newEnergyDebt
                },
                playtime: (prev.playtime || 0) + 1 // Increment playtime every second
            };

            // 4. Market Update (Every 30 seconds)
            marketTickRef.current += 1;
            if (marketTickRef.current >= 30) {
                updatedPlayer = GameService.updateMarketPrices(updatedPlayer);
                marketTickRef.current = 0;
            }

            GameService.updatePlayer(updatedPlayer);
            return updatedPlayer;
        });
    }, 1000);

    return () => {
        if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [activePlayerId, isBanned]);

  if (!activePlayerId) return <Auth onLogin={handleLogin} christmasVibe={appSettings.showChristmasVibe} />;

  if (isBanned) {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-red-50 text-slate-800 p-8 text-center animate-fade-in">
            <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-red-200/50 border border-red-100 max-w-sm w-full">
                <ShieldAlert size={64} className="text-red-500 mb-6 mx-auto animate-pulse" />
                <h1 className="text-3xl font-black mb-2 text-slate-800">БАН</h1>
                <p className="text-slate-500 font-medium">Ваш аккаунт заблокирован.</p>
                
                {banInfo.reason && (
                    <div className="my-4 bg-red-50 p-3 rounded-xl border border-red-100 text-sm text-red-800 font-bold">
                        Причина: {banInfo.reason}
                    </div>
                )}
                
                <p className="text-xs text-slate-400 mb-6">
                    {banInfo.until === -1 ? 'Блокировка навсегда' : `До: ${new Date(banInfo.until || 0).toLocaleString()}`}
                </p>

                <button onClick={handleLogout} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold">Выйти</button>
            </div>
        </div>
    );
  }

  const lang = appSettings.language;

  return (
    <div className="flex flex-col h-full bg-[#f2f4f6] text-slate-800 font-sans relative transition-colors duration-300">
      
      {/* Snow Overlay - Conditional */}
      {appSettings.showChristmasVibe && <SnowOverlay />}

      {/* Dynamic Background Gradient Blob */}
      <div className="fixed top-[-20%] left-[-20%] w-[80%] h-[50%] bg-purple-200/30 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[40%] bg-teal-200/30 rounded-full blur-3xl pointer-events-none z-0"></div>

      {/* Main Content Viewport */}
      <div className="flex-1 overflow-hidden relative z-10 pb-[100px]">
        {currentTab === GameTab.MAIN && player && <ClickerTab player={player} onUpdate={updatePlayerState} christmasVibe={appSettings.showChristmasVibe} lang={lang} />}
        {currentTab === GameTab.BUSINESS && player && <BusinessTab player={player} onUpdate={updatePlayerState} christmasVibe={appSettings.showChristmasVibe} lang={lang} />}
        {currentTab === GameTab.MINING && player && <MiningTab player={player} onUpdate={updatePlayerState} christmasVibe={appSettings.showChristmasVibe} lang={lang} />}
        {currentTab === GameTab.INVEST && player && <InvestTab player={player} onUpdate={updatePlayerState} lang={lang} />}
        {currentTab === GameTab.ASSETS && player && <AssetsTab player={player} onUpdate={updatePlayerState} />}
        {currentTab === GameTab.LEADERBOARD && <LeaderboardTab lang={lang} />}
        {currentTab === GameTab.SETTINGS && player && (
            <SettingsTab 
                player={player} 
                onLogout={handleLogout} 
                onUpdate={updatePlayerState} 
                settings={appSettings}
                onUpdateSettings={setAppSettings}
                christmasVibe={appSettings.showChristmasVibe}
                globalConfig={globalConfig}
            />
        )}
        {currentTab === GameTab.ADMIN && player && <AdminPanel currentPlayer={player} onRefresh={() => setPlayer(GameService.getPlayer(player.id) || null)} />}
      </div>

      {/* Floating Navigation Dock */}
      <div className="fixed bottom-6 left-4 right-4 z-50">
        <div className="glass-nav rounded-2xl px-2 py-3 flex justify-between items-center shadow-2xl shadow-slate-300/50 border border-white/60 overflow-x-auto no-scrollbar gap-1">
            <NavButton 
                active={currentTab === GameTab.MAIN} 
                onClick={() => setCurrentTab(GameTab.MAIN)} 
                icon={<MousePointer2 />} 
                label={t('nav.tap', lang)} 
            />
            <NavButton 
                active={currentTab === GameTab.BUSINESS} 
                onClick={() => setCurrentTab(GameTab.BUSINESS)} 
                icon={<Building2 />} 
                label={t('nav.business', lang)} 
            />
            <NavButton 
                active={currentTab === GameTab.MINING} 
                onClick={() => setCurrentTab(GameTab.MINING)} 
                icon={<Server />} 
                label={t('nav.farm', lang)} 
            />
             <NavButton 
                active={currentTab === GameTab.INVEST} 
                onClick={() => setCurrentTab(GameTab.INVEST)} 
                icon={<TrendingUp />} 
                label={t('nav.market', lang)} 
            />
            <NavButton 
                active={currentTab === GameTab.ASSETS} 
                onClick={() => setCurrentTab(GameTab.ASSETS)} 
                icon={<ShoppingBag />} 
                label={t('nav.shop', lang)} 
            />
            <NavButton 
                active={currentTab === GameTab.LEADERBOARD} 
                onClick={() => setCurrentTab(GameTab.LEADERBOARD)} 
                icon={<Trophy />} 
                label={t('nav.top', lang)} 
            />
            
            {player?.isAdmin && (
                <NavButton 
                    active={currentTab === GameTab.ADMIN} 
                    onClick={() => setCurrentTab(GameTab.ADMIN)} 
                    icon={<ShieldAlert />} 
                    label={t('nav.admin', lang)} 
                    isSpecial
                />
            )}
            
             <NavButton 
                active={currentTab === GameTab.SETTINGS} 
                onClick={() => setCurrentTab(GameTab.SETTINGS)} 
                icon={<Menu />} 
                label={player.isAdmin ? t('nav.profile', lang) : t('nav.menu', lang)} 
            />
        </div>
      </div>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, onClick: () => void, icon: React.ReactNode, label: string, isSpecial?: boolean}> = ({ active, onClick, icon, label, isSpecial }) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex flex-col items-center justify-center relative group transition-all duration-300 min-w-10`}
    >
        <div className={`
            p-2 rounded-xl transition-all duration-300 relative
            ${active 
                ? (isSpecial ? 'bg-red-500 text-white shadow-lg shadow-red-300' : 'bg-slate-900 text-white shadow-lg shadow-slate-300 translate-y-[-5px]') 
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }
        `}>
            {React.cloneElement(icon as React.ReactElement<any>, { size: 18, strokeWidth: 2.5 })}
        </div>
        <span className={`text-[9px] font-bold mt-1 transition-colors duration-300 truncate w-full text-center ${active ? 'text-slate-900' : 'text-slate-400'}`}>
            {label}
        </span>
    </button>
);

export default App;