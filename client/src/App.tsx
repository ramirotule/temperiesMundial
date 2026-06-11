import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Save, 
  Check, 
  Clock, 
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import type { Match, Prediction, User, UserState } from './types';
import { TEAMS } from './data/db';

// Tailwind glassmorphism styles helper using CSS theme variables
const CARD_STYLE = "bg-bg-card backdrop-blur-xl border border-border-color rounded-2xl shadow-xl p-6 transition-all duration-200";
const MINI_CARD_STYLE = "bg-bg-card backdrop-blur-xl border border-border-color rounded-2xl p-4 text-center transition-all duration-200 shadow-md";
const INPUT_STYLE = "w-12 h-10 text-center bg-bg-input border border-border-color rounded-lg text-lg font-bold text-text-primary focus:outline-none focus:border-indigo-500 transition-colors";
const BTN_SECONDARY = "px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold rounded-xl transition-all active:scale-98 cursor-pointer";

// Standard scoring engine
function calculatePoints(match: Match, prediction: Prediction | undefined): { points: number; type: 'exact' | 'diff' | 'outcome' | 'none' } {
  if (!prediction || match.homeScore === null || match.awayScore === null) {
    return { points: 0, type: 'none' };
  }

  const { homeScore: rHome, awayScore: rAway } = match;
  const { homeScore: pHome, awayScore: pAway } = prediction;

  // 1. Exact Match
  if (rHome === pHome && rAway === pAway) {
    return { points: 5, type: 'exact' };
  }

  const rDiff = rHome - rAway;
  const pDiff = pHome - pAway;
  const rSign = Math.sign(rDiff);
  const pSign = Math.sign(pDiff);

  // 2. Winner and Goal Difference
  if (rDiff === pDiff && rSign === pSign) {
    return { points: 3, type: 'diff' };
  }

  // 3. Winner/Draw Outcome Only
  if (rSign === pSign) {
    return { points: 2, type: 'outcome' };
  }

  return { points: 0, type: 'none' };
}

// Helper for avatar background color based on name
function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    'from-pink-500 to-rose-500',
    'from-purple-500 to-indigo-500',
    'from-blue-500 to-cyan-500',
    'from-teal-500 to-emerald-500',
    'from-amber-500 to-orange-500',
    'from-fuchsia-500 to-pink-600',
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('prode_theme');
    if (saved) return saved === 'dark';
    return true; // Default to dark mode for premium feel
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('prode_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('prode_theme', 'light');
    }
  }, [darkMode]);

  // API URL
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  // Initialize States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('prode_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, Prediction>>>({});
  const [users, setUsers] = useState<User[]>([]);

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // Fetch initial data from Express server API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [resUsers, resMatches, resPredictions] = await Promise.all([
          fetch(`${API_BASE_URL}/api/users`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/matches`).then(r => r.json()),
          fetch(`${API_BASE_URL}/api/predictions`).then(r => r.json())
        ]);
        setUsers(resUsers);
        setMatches(resMatches);
        setPredictions(resPredictions);
      } catch (error) {
        console.error("Error fetching data from API:", error);
      }
    };
    fetchInitialData();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!selectedUserId) {
      setLoginError('Seleccioná tu usuario.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Error de credenciales.');
        return;
      }
      handleLogin(data);
      setPasswordInput('');
      setSelectedUserId('');
    } catch (error) {
      setLoginError('Error de conexión con el servidor.');
    }
  };

  // View tabs: 'matches' | 'leaderboard' | 'admin'
  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard' | 'admin'>('matches');

  // Filters for matches
  const [groupFilter, setGroupFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showTodayOnly, setShowTodayOnly] = useState<boolean>(false);

  const isTodayArgentina = (dateStr: string) => {
    try {
      const matchDate = new Date(dateStr);
      const today = new Date();
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      });
      return formatter.format(matchDate) === formatter.format(today);
    } catch (e) {
      return false;
    }
  };

  // Search filter for leaderboard
  const [searchQuery, setSearchQuery] = useState('');

  // Selected user for detailed predictions modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // States for matching editing (Admin)
  const [adminEdits, setAdminEdits] = useState<Record<string, { homeScore: string; awayScore: string; status: Match['status'] }>>({});

  // States for employee predictions editing
  const [predEdits, setPredEdits] = useState<Record<string, { homeScore: string; awayScore: string }>>({});

  // Auth helper
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('prode_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('prode_current_user');
  };

  // Scoreboard calculation
  const leaderboard = useMemo(() => {
    return users
      .filter(u => u.role !== 'admin')
      .map(user => {
        const userPredictions = predictions[user.id] || {};
        let points = 0;
        let exactMatches = 0;
        let diffMatches = 0;
        let outcomeMatches = 0;
        let predictionsCount = 0;

        matches.forEach(match => {
          const pred = userPredictions[match.id];
          if (pred && match.homeScore !== null && match.awayScore !== null) {
            predictionsCount++;
            const res = calculatePoints(match, pred);
            points += res.points;
            if (res.type === 'exact') exactMatches++;
            else if (res.type === 'diff') diffMatches++;
            else if (res.type === 'outcome') outcomeMatches++;
          }
        });

        return {
          user,
          stats: { points, exactMatches, diffMatches, outcomeMatches, predictionsCount } as UserState
        };
      })
      .sort((a, b) => b.stats.points - a.stats.points || b.stats.exactMatches - a.stats.exactMatches);
  }, [users, matches, predictions]);

  // Prediction stats for current user
  const currentUserStats = useMemo(() => {
    if (!currentUser) return null;
    return leaderboard.find(l => l.user.id === currentUser.id)?.stats || {
      points: 0,
      exactMatches: 0,
      diffMatches: 0,
      outcomeMatches: 0,
      predictionsCount: 0
    };
  }, [leaderboard, currentUser]);

  // Handle saving user prediction
  const savePrediction = async (matchId: string) => {
    if (!currentUser) return;

    const match = matches.find(m => m.id === matchId);
    if (match) {
      if (match.status !== 'scheduled' || new Date() >= new Date(match.date)) {
        alert("No se permite guardar pronósticos una vez comenzado o finalizado el partido.");
        return;
      }
    }

    const edit = predEdits[matchId];
    if (!edit) return;

    const homeScore = parseInt(edit.homeScore);
    const awayScore = parseInt(edit.awayScore);

    if (isNaN(homeScore) || homeScore < 0 || isNaN(awayScore) || awayScore < 0) {
      alert("Por favor ingresá un resultado válido (goles válidos).");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/predictions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, matchId, homeScore, awayScore })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al guardar el pronóstico.');
        return;
      }

      setPredictions(prev => {
        const userPreds = prev[currentUser.id] || {};
        return {
          ...prev,
          [currentUser.id]: {
            ...userPreds,
            [matchId]: {
              homeScore,
              awayScore,
              createdAt: new Date().toISOString()
            }
          }
        };
      });

      // Clear edit state
      setPredEdits(prev => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
    } catch (error) {
      alert('Error de conexión al guardar pronóstico.');
    }
  };

  // Handle saving match real score (Admin)
  const saveMatchResult = async (matchId: string) => {
    const edit = adminEdits[matchId];
    if (!edit) return;

    const homeScore = edit.homeScore === "" ? null : parseInt(edit.homeScore);
    const awayScore = edit.awayScore === "" ? null : parseInt(edit.awayScore);

    if (edit.status === 'finished' && (homeScore === null || awayScore === null)) {
      alert("Para finalizar el partido, debés cargar un resultado real.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeScore, awayScore, status: edit.status })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al guardar resultado del partido.');
        return;
      }

      setMatches(prev => 
        prev.map(m => m.id === matchId ? {
          ...m,
          homeScore,
          awayScore,
          status: edit.status
        } : m)
      );

      setAdminEdits(prev => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
    } catch (error) {
      alert('Error de conexión al guardar resultado.');
    }
  };


  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans select-none pb-12 transition-colors duration-200">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-bg-header backdrop-blur-md border-b border-border-header px-6 py-4 flex items-center justify-between transition-colors duration-200">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Temperies Prode Mundial 2026" className="h-10 sm:h-12 w-auto object-contain" />
        </div>

        <div className="flex items-center gap-3">
          {/* Light/Dark Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 border border-border-color rounded-xl text-text-secondary transition-colors cursor-pointer"
            title={darkMode ? "Modo Claro" : "Modo Oscuro"}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>

          {currentUser && (
            <>
              {/* User Info */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-semibold text-sm text-text-secondary">{currentUser.name}</span>
                <span className="text-xs text-text-muted font-mono">
                  {currentUser.role === 'admin' ? 'Administrador' : `${currentUserStats?.points || 0} pts`}
                </span>
              </div>
              
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(currentUser.name)} flex items-center justify-center font-bold text-white text-sm shadow-md`}>
                {currentUser.name.charAt(0)}
              </div>

              <button 
                onClick={handleLogout} 
                className="p-2 bg-slate-200 dark:bg-slate-900 hover:bg-red-950/40 hover:text-red-400 text-slate-600 dark:text-slate-400 border border-border-color rounded-xl transition-colors cursor-pointer"
                title="Cerrar Sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 mt-8 flex-1">
        {!currentUser ? (
          /* Login Screen */
          <div className="max-w-md mx-auto mt-12 sm:mt-20">
            <div className={`${CARD_STYLE} border-indigo-500/20 shadow-indigo-500/10`}>
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-border-color rounded-2xl flex items-center justify-center mx-auto shadow-xl mb-4">
                  <span className="text-3xl">🇦🇷</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight text-text-primary">Ingresá a tu Prode</h2>
                <p className="text-text-muted text-sm mt-1">Ingresá tus credenciales para acceder</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                    Usuario / Empleado
                  </label>
                  <select 
                    className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-indigo-500 transition-colors"
                    value={selectedUserId}
                    onChange={(e) => {
                      setSelectedUserId(e.target.value);
                      setLoginError('');
                    }}
                  >
                    <option value="" disabled>Seleccioná tu nombre...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} {user.role === 'admin' ? '(Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                    Contraseña
                  </label>
                  <input 
                    type="password"
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setLoginError('');
                    }}
                    className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-text-primary focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                  />
                </div>

                {loginError && (
                  <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                    <span>⚠️</span> {loginError}
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 cursor-pointer text-sm"
                >
                  Ingresar
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-[10px] text-text-muted font-mono">
                  Contraseña default para empleados: <span className="text-text-secondary font-bold">1234</span>
                </p>
                <p className="text-[10px] text-text-muted font-mono mt-1">
                  Contraseña para administrador: <span className="text-text-secondary font-bold">admin</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Dashboard Dashboard */
          <div className="space-y-6">
            
            {/* Stats Dashboard Mini Banner */}
            {currentUser.role !== 'admin' && currentUserStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className={MINI_CARD_STYLE}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Puntaje Total</span>
                  <span className="text-3xl font-black mt-1 bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-indigo-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {currentUserStats.points}
                  </span>
                </div>
                <div className={MINI_CARD_STYLE}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Acierto Exacto</span>
                  <span className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{currentUserStats.exactMatches}</span>
                  <span className="text-text-muted text-[10px] block font-semibold">(5 pts c/u)</span>
                </div>
                <div className={MINI_CARD_STYLE}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Diferencia</span>
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{currentUserStats.diffMatches}</span>
                  <span className="text-text-muted text-[10px] block font-semibold">(3 pts c/u)</span>
                </div>
                <div className={MINI_CARD_STYLE}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Resultado</span>
                  <span className="text-3xl font-black text-teal-600 dark:text-teal-400 mt-1">{currentUserStats.outcomeMatches}</span>
                  <span className="text-text-muted text-[10px] block font-semibold">(2 pts c/u)</span>
                </div>
                <div className={`${MINI_CARD_STYLE} col-span-2 md:col-span-1`}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">Pronosticados</span>
                  <span className="text-3xl font-black text-text-primary mt-1">{currentUserStats.predictionsCount} / {matches.length}</span>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-color pb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'matches'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color'
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Partidos
                </button>
                
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'leaderboard'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color'
                  }`}
                >
                  <Users className="w-4 h-4" /> Tabla de Posiciones
                </button>

                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'admin'
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                        : 'text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color'
                    }`}
                  >
                    <Settings className="w-4 h-4" /> Panel Admin
                  </button>
                )}
              </div>


            </div>

            {/* TAB CONTENTS */}
            {activeTab === 'matches' && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-card border border-border-color rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Grupo:</span>
                      <select 
                        className="bg-bg-input border border-border-color rounded-lg px-3 py-1.5 text-xs font-bold text-text-primary focus:outline-none focus:border-indigo-500"
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                      >
                        <option value="All">Todos los Grupos</option>
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(g => (
                          <option key={g} value={g}>Grupo {g}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Estado:</span>
                      <select 
                        className="bg-bg-input border border-border-color rounded-lg px-3 py-1.5 text-xs font-bold text-text-primary focus:outline-none focus:border-indigo-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="All">Todos</option>
                        <option value="scheduled">Pendientes</option>
                        <option value="live">En Vivo</option>
                        <option value="finished">Finalizados</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowTodayOnly(prev => !prev)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                      showTodayOnly 
                        ? 'bg-rose-600/15 border-rose-500 text-rose-600 dark:text-rose-400 font-extrabold shadow-md shadow-rose-500/5' 
                        : 'bg-bg-input border-border-color text-text-secondary hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    📅 Partidos de Hoy
                  </button>
                </div>

                {/* Matches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches
                    .filter(m => groupFilter === 'All' || m.group === groupFilter)
                    .filter(m => statusFilter === 'All' || m.status === statusFilter)
                    .filter(m => !showTodayOnly || isTodayArgentina(m.date))
                    .map(match => {
                      const homeTeam = TEAMS.find(t => t.code === match.homeTeam);
                      const awayTeam = TEAMS.find(t => t.code === match.awayTeam);
                      const userPred = predictions[currentUser.id]?.[match.id];
                      
                      // Check if there is an active local edit state
                      const localEdit = predEdits[match.id] || {
                        homeScore: userPred ? userPred.homeScore.toString() : '',
                        awayScore: userPred ? userPred.awayScore.toString() : ''
                      };

                      const isMatchLocked = match.status === 'finished' || match.status === 'live' || new Date() >= new Date(match.date);
                      
                      // Calculate potential/earned points for this match card
                      const pointsEarned = match.status === 'finished' ? calculatePoints(match, userPred) : null;

                      return (
                        <div key={match.id} className={`${CARD_STYLE} relative flex flex-col justify-between overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 ${!isMatchLocked && !userPred ? '!border-rose-500/40 dark:!border-rose-500/30 ring-1 ring-rose-500/10 shadow-rose-500/5 shadow-md' : ''}`}>
                          
                          {/* Top Status Indicators */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-bold tracking-widest text-text-muted uppercase">
                              Grupo {match.group}
                            </span>
                            
                            {/* Badges */}
                            {match.status === 'live' && (
                              <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                ● EN VIVO
                              </span>
                            )}
                            {match.status === 'finished' && (
                              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Finalizado
                              </span>
                            )}
                            {match.status === 'scheduled' && (
                              <span className="bg-bg-input border border-border-color text-text-muted font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Pendiente
                              </span>
                            )}
                          </div>

                          {/* Flag and Scores Layout */}
                          <div className="flex items-center justify-between my-2">
                            {/* Home Team */}
                            <div className="flex flex-col items-center gap-2 flex-1">
                              <img 
                                src={`https://flagcdn.com/w80/${match.homeTeam}.png`} 
                                alt={homeTeam?.name} 
                                className="w-12 h-8 object-cover rounded-lg shadow-md border border-border-color"
                                onError={(e) => {
                                  // Fallback flag
                                  (e.target as HTMLImageElement).src = "https://flagcdn.com/w80/un.png";
                                }}
                              />
                              <span className="text-xs font-bold text-center text-text-secondary w-24 truncate">
                                {homeScoreReplacement(homeTeam?.name || match.homeTeam)}
                              </span>
                            </div>

                            {/* Scores Container */}
                            <div className="flex items-center gap-2">
                              {isMatchLocked ? (
                                /* Locked Scores Display (Live or Finished) */
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-black text-text-primary w-8 text-center bg-bg-input rounded-lg py-1 border border-border-color">
                                    {match.homeScore ?? '-'}
                                  </span>
                                  <span className="text-text-muted font-bold">:</span>
                                  <span className="text-2xl font-black text-text-primary w-8 text-center bg-bg-input rounded-lg py-1 border border-border-color">
                                    {match.awayScore ?? '-'}
                                  </span>
                                </div>
                              ) : (
                                /* Editable Score Predictions */
                                <div className="flex items-center gap-1.5">
                                  <input 
                                    type="number"
                                    min="0"
                                    placeholder="-"
                                    value={localEdit.homeScore}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPredEdits(prev => ({
                                        ...prev,
                                        [match.id]: { ...(prev[match.id] || { homeScore: '', awayScore: localEdit.awayScore }), homeScore: val }
                                      }));
                                    }}
                                    className={INPUT_STYLE}
                                  />
                                  <span className="text-text-muted font-bold">:</span>
                                  <input 
                                    type="number"
                                    min="0"
                                    placeholder="-"
                                    value={localEdit.awayScore}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setPredEdits(prev => ({
                                        ...prev,
                                        [match.id]: { ...(prev[match.id] || { homeScore: localEdit.homeScore, awayScore: '' }), awayScore: val }
                                      }));
                                    }}
                                    className={INPUT_STYLE}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Away Team */}
                            <div className="flex flex-col items-center gap-2 flex-1">
                              <img 
                                src={`https://flagcdn.com/w80/${match.awayTeam}.png`} 
                                alt={awayTeam?.name} 
                                className="w-12 h-8 object-cover rounded-lg shadow-md border border-border-color"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "https://flagcdn.com/w80/un.png";
                                }}
                              />
                              <span className="text-xs font-bold text-center text-text-secondary w-24 truncate">
                                {homeScoreReplacement(awayTeam?.name || match.awayTeam)}
                              </span>
                            </div>
                          </div>

                          {/* Save & Prediction Status Bar */}
                          <div className="mt-4 pt-3 border-t border-border-color flex flex-col gap-2">
                            {/* Date/Time and Stadium info */}
                            <div className="text-xs text-text-muted font-medium flex items-start justify-between gap-2">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-text-secondary text-xs sm:text-sm">
                                  🇦🇷 {new Date(match.date).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} hs
                                </span>
                                <span className="text-[10px] sm:text-xs text-text-muted">
                                  🇪🇸 {new Date(match.date).toLocaleString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })} hs
                                </span>
                              </div>
                              <span className="truncate max-w-[120px] text-[10px] sm:text-xs self-start text-right">{match.stadium}</span>
                            </div>

                            {/* Prediction status / Save Action */}
                            <div className="flex items-center justify-between mt-1 min-h-[36px]">
                              {/* Prediction Status Badge */}
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-text-muted uppercase">Tu Pronóstico</span>
                                {userPred ? (
                                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    Predijo: {userPred.homeScore} - {userPred.awayScore}
                                  </span>
                                ) : !isMatchLocked ? (
                                  <span className="text-xs font-black text-rose-500 dark:text-rose-400 flex items-center gap-1 animate-pulse">
                                    ⚠️ Falta Pronosticar
                                  </span>
                                ) : (
                                  <span className="text-xs text-text-muted italic">Sin Pronosticar</span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              {isMatchLocked ? (
                                /* Result Points breakdown if finished */
                                pointsEarned && (
                                  <div className={`px-2.5 py-1 rounded-lg border font-bold text-xs flex items-center gap-1 ${
                                    pointsEarned.points === 5 
                                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400' 
                                      : pointsEarned.points === 3 
                                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' 
                                      : pointsEarned.points === 2 
                                      ? 'bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400' 
                                      : 'bg-slate-100 dark:bg-slate-900 border-border-color text-text-muted'
                                  }`}>
                                    {pointsEarned.points > 0 ? (
                                      <>🎉 +{pointsEarned.points} pts</>
                                    ) : (
                                      <>❌ 0 pts</>
                                    )}
                                  </div>
                                )
                              ) : (
                                /* Save Button */
                                predEdits[match.id] && (
                                  <button
                                    onClick={() => savePrediction(match.id)}
                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Save className="w-3.5 h-3.5" /> Guardar
                                  </button>
                                )
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB: LEADERBOARD */}
            {activeTab === 'leaderboard' && (
              <div className={`${CARD_STYLE} overflow-hidden`}>
                
                {/* Header Table Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-border-color pb-4">
                  <div>
                    <h3 className="text-lg font-black text-text-primary">Ranking de la Oficina</h3>
                    <p className="text-xs text-text-muted mt-0.5">Competencia entre los 40 empleados</p>
                  </div>
                  
                  {/* Search bar */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Buscar empleado..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-bg-input border border-border-color rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Table Layout */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border-color text-text-muted text-xs font-bold uppercase tracking-wider">
                        <th className="py-3 px-4 text-center w-12">Pos</th>
                        <th className="py-3 px-4">Empleado</th>
                        <th className="py-3 px-4 text-center">Pronosticados</th>
                        <th className="py-3 px-4 text-center hidden md:table-cell">Acierto Exacto</th>
                        <th className="py-3 px-4 text-center hidden md:table-cell">Dif. Goles</th>
                        <th className="py-3 px-4 text-center hidden md:table-cell">Resultado</th>
                        <th className="py-3 px-4 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color/40">
                      {leaderboard
                        .filter(row => row.user.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((row, index) => {
                          const isCurrentUser = row.user.id === currentUser.id;
                          const rank = index + 1;

                          return (
                            <tr 
                              key={row.user.id}
                              onClick={() => setSelectedUser(row.user)}
                              className={`group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-colors ${
                                isCurrentUser ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500' : ''
                              }`}
                            >
                              {/* Position */}
                              <td className="py-3.5 px-4 text-center font-bold font-mono">
                                {rank === 1 ? (
                                  <span className="text-xl">🥇</span>
                                ) : rank === 2 ? (
                                  <span className="text-xl">🥈</span>
                                ) : rank === 3 ? (
                                  <span className="text-xl">🥉</span>
                                ) : (
                                  <span className="text-slate-400 text-sm">{rank}</span>
                                )}
                              </td>

                              {/* Employee name / Avatar */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(row.user.name)} flex items-center justify-center font-bold text-white text-xs shadow-sm`}>
                                    {row.user.name.charAt(0)}
                                  </div>
                                  <div>
                                    <span className={`text-sm font-bold block ${isCurrentUser ? 'text-indigo-400' : 'text-slate-200'}`}>
                                      {row.user.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">@{row.user.username}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Predicted counts */}
                              <td className="py-3.5 px-4 text-center text-sm font-semibold text-slate-300 font-mono">
                                {row.stats.predictionsCount}
                              </td>

                              {/* Hits breakdowns */}
                              <td className="py-3.5 px-4 text-center hidden md:table-cell">
                                <span className="text-amber-600 dark:text-amber-500 bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                                  {row.stats.exactMatches}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center hidden md:table-cell">
                                <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 border border-indigo-500/20 px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                                  {row.stats.diffMatches}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center hidden md:table-cell">
                                <span className="text-teal-600 dark:text-teal-400 bg-teal-500/15 border border-teal-500/20 px-2 py-0.5 rounded-md text-xs font-bold font-mono">
                                  {row.stats.outcomeMatches}
                                </span>
                              </td>

                              {/* Points */}
                              <td className="py-3.5 px-4 text-right">
                                <span className="text-base font-extrabold bg-gradient-to-r from-amber-600 to-indigo-600 dark:from-amber-400 dark:to-indigo-400 bg-clip-text text-transparent group-hover:scale-105 transition-transform inline-block pr-2 font-mono">
                                  {row.stats.points}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB: ADMIN PANEL */}
            {activeTab === 'admin' && currentUser.role === 'admin' && (
              <div className="space-y-6">
                <div className={`${CARD_STYLE} bg-amber-500/10 border border-amber-500/25`}>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                    <div>
                      <h3 className="text-md font-bold text-amber-700 dark:text-amber-400">Consola de Control de Resultados</h3>
                      <p className="text-xs text-text-secondary">
                        Como Administrador podés simular o cargar los resultados reales del mundial. Al cargar los marcadores reales y marcar el estado como "Finalizado", el sistema recalculará instantáneamente los puntajes de los 40 empleados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`${CARD_STYLE}`}>
                  <h3 className="text-lg font-black text-text-primary mb-6">Cargar Resultados Reales</h3>
                  
                  <div className="divide-y divide-border-color/50 space-y-4">
                    {matches.map((match) => {
                      const homeTeam = TEAMS.find(t => t.code === match.homeTeam);
                      const awayTeam = TEAMS.find(t => t.code === match.awayTeam);
                      
                      const editState = adminEdits[match.id] || {
                        homeScore: match.homeScore !== null ? match.homeScore.toString() : '',
                        awayScore: match.awayScore !== null ? match.awayScore.toString() : '',
                        status: match.status
                      };

                      return (
                        <div key={match.id} className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                          {/* Match Info */}
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-mono text-xs text-text-muted font-bold bg-bg-input px-2 py-1 rounded border border-border-color">{match.id}</span>
                            <div className="flex items-center gap-2">
                              <img src={`https://flagcdn.com/w40/${match.homeTeam}.png`} className="w-6 h-4 object-cover rounded" alt="" />
                              <span className="font-bold text-sm text-text-secondary">{homeScoreReplacement(homeTeam?.name || match.homeTeam)}</span>
                              <span className="text-text-muted text-xs">vs</span>
                              <img src={`https://flagcdn.com/w40/${match.awayTeam}.png`} className="w-6 h-4 object-cover rounded" alt="" />
                              <span className="font-bold text-sm text-text-secondary">{homeScoreReplacement(awayTeam?.name || match.awayTeam)}</span>
                            </div>
                          </div>

                          {/* Form inputs & status */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <input 
                                type="number" 
                                placeholder="Goles L"
                                value={editState.homeScore}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAdminEdits(prev => ({
                                    ...prev,
                                    [match.id]: { ...(prev[match.id] || { homeScore: '', awayScore: editState.awayScore, status: editState.status }), homeScore: val }
                                  }));
                                }}
                                className="w-14 h-9 text-center bg-bg-input border border-border-color rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-amber-500"
                              />
                              <span className="text-text-muted">:</span>
                              <input 
                                type="number" 
                                placeholder="Goles V"
                                value={editState.awayScore}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAdminEdits(prev => ({
                                    ...prev,
                                    [match.id]: { ...(prev[match.id] || { homeScore: editState.homeScore, awayScore: '', status: editState.status }), awayScore: val }
                                  }));
                                }}
                                className="w-14 h-9 text-center bg-bg-input border border-border-color rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-amber-500"
                              />
                            </div>

                            {/* Status selector */}
                            <select
                              value={editState.status}
                              onChange={(e) => {
                                const val = e.target.value as Match['status'];
                                setAdminEdits(prev => ({
                                  ...prev,
                                  [match.id]: { ...(prev[match.id] || { homeScore: editState.homeScore, awayScore: editState.awayScore, status: 'scheduled' }), status: val }
                                }));
                              }}
                              className="bg-bg-input border border-border-color rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none text-text-secondary"
                            >
                              <option value="scheduled">Pendiente</option>
                              <option value="live">En Vivo</option>
                              <option value="finished">Finalizado</option>
                            </select>

                            {/* Action Save */}
                            {adminEdits[match.id] && (
                              <button
                                onClick={() => saveMatchResult(match.id)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check className="w-3.5 h-3.5" /> Guardar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* DETAIL MODAL FOR EMPLOYEE PREDICTIONS */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-color rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border-color flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(selectedUser.name)} flex items-center justify-center font-bold text-white text-sm shadow-md`}>
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-text-primary">{selectedUser.name}</h3>
                  <span className="text-xs text-text-muted font-mono">@{selectedUser.username}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-text-muted hover:text-text-primary rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Historial de Predicciones</h4>
              
              <div className="space-y-3">
                {matches.map((match) => {
                  const homeTeam = TEAMS.find(t => t.code === match.homeTeam);
                  const awayTeam = TEAMS.find(t => t.code === match.awayTeam);
                  const userPred = predictions[selectedUser.id]?.[match.id];
                  
                  const pointsEarned = match.status === 'finished' ? calculatePoints(match, userPred) : null;

                  return (
                    <div key={match.id} className="bg-bg-input border border-border-color rounded-xl p-3.5 flex items-center justify-between gap-4">
                      {/* Teams Info */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img src={`https://flagcdn.com/w40/${match.homeTeam}.png`} className="w-6 h-4 object-cover rounded" alt="" />
                        <span className="font-bold text-xs text-text-secondary truncate">{homeScoreReplacement(homeTeam?.name || match.homeTeam)}</span>
                        <span className="text-text-muted text-[10px]">vs</span>
                        <img src={`https://flagcdn.com/w40/${match.awayTeam}.png`} className="w-6 h-4 object-cover rounded" alt="" />
                        <span className="font-bold text-xs text-text-secondary truncate">{homeScoreReplacement(awayTeam?.name || match.awayTeam)}</span>
                      </div>

                      {/* Predictions vs Actual Real Results */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-text-muted uppercase">Predijo</span>
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/20 mt-0.5">
                            {userPred ? `${userPred.homeScore} - ${userPred.awayScore}` : '-'}
                          </span>
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-text-muted uppercase">Real</span>
                          <span className="font-mono text-xs font-bold text-text-primary bg-bg-card px-2 py-0.5 rounded-md border border-border-color mt-0.5">
                            {match.homeScore !== null ? `${match.homeScore} - ${match.awayScore}` : 'Pte'}
                          </span>
                        </div>

                        {/* Points badge */}
                        <div className="w-16 flex justify-end">
                          {pointsEarned ? (
                            <span className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold text-center w-full block ${
                              pointsEarned.points === 5 
                                ? 'bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400' 
                                : pointsEarned.points === 3 
                                ? 'bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                                : pointsEarned.points === 2 
                                ? 'bg-teal-500/15 border border-teal-500/20 text-teal-600 dark:text-teal-400' 
                                : 'bg-slate-100 dark:bg-slate-900 text-text-muted border border-border-color'
                            }`}>
                              {pointsEarned.points > 0 ? `+${pointsEarned.points} pts` : '0 pts'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">Pendiente</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-6 py-4 bg-bg-input border-t border-border-color flex justify-end">
              <button 
                onClick={() => setSelectedUser(null)} 
                className={BTN_SECONDARY}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple country name formatting helper to shorten long names for layout responsiveness
function homeScoreReplacement(name: string) {
  const replacements: Record<string, string> = {
    'Bosnia y Herzegovina': 'Bosnia',
    'Estados Unidos': 'EE.UU.',
    'Costa de Marfil': 'C. Marfil',
    'Corea del Sur': 'Corea Sur',
    'Arabia Saudita': 'A. Saudita',
    'República Checa': 'Chequia',
    'Nueva Zelanda': 'N. Zelanda',
    'Países Bajos': 'Holanda'
  };
  return replacements[name] || name;
}
