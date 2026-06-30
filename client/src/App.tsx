import { useState, useEffect, useMemo } from "react";
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
  Moon,
  BookOpen,
  Trophy,
  Medal,
  Award,
  BarChart2,
  X,
} from "lucide-react";
import type { Match, Prediction, User, UserState } from "./types";
import { TEAMS } from "./data/db";
import {
  authenticate,
  fetchUsers,
  fetchMatches,
  fetchPredictions,
  upsertPrediction,
  updateMatch,
  clearPredictions,
  resetMatches,
  downloadBackup,
  fetchAdminPredictions,
} from "./lib/api";

// Tailwind glassmorphism styles helper using CSS theme variables
const CARD_STYLE =
  "bg-bg-card backdrop-blur-xl border border-border-color rounded-2xl shadow-xl p-6 transition-all duration-200";
const MINI_CARD_STYLE =
  "bg-bg-card backdrop-blur-xl border border-border-color rounded-2xl p-4 text-center transition-all duration-200 shadow-md";
const INPUT_STYLE =
  "w-12 h-10 text-center bg-bg-input border border-border-color rounded-lg text-lg font-bold text-text-primary focus:outline-none focus:border-indigo-500 transition-colors";
const BTN_SECONDARY =
  "px-6 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 font-semibold rounded-xl transition-all active:scale-98 cursor-pointer";

const KNOCKOUT_PHASES: Record<string, string> = {
  R16: '16avos de Final',
  R8: 'Octavos de Final',
  QF: 'Cuartos de Final',
  SF: 'Semifinal',
  '3P': 'Tercer Puesto',
  FIN: 'Final',
};

const GROUP_CODES = ['A','B','C','D','E','F','G','H','I','J','K','L'];

// Full bracket: R16 pairs → Octavos → Cuartos → Semi → Final
// Each pair: [matchA, matchB] → winners play each other in Octavos
const BRACKET_OCTAVOS: [string, string][] = [
  ['M75', 'M78'], // Oct 1: Alemania/Paraguay vs Francia/Suecia
  ['M73', 'M76'], // Oct 2: Canadá/Sudáfrica vs Holanda/Marruecos
  ['M84', 'M83'], // Oct 3: Portugal/Croacia vs España/Austria
  ['M82', 'M81'], // Oct 4: EEUU/Bosnia vs Bélgica/Senegal
  ['M74', 'M77'], // Oct 5: Brasil/Japón vs C.Marfil/Noruega
  ['M79', 'M80'], // Oct 6: México/Ecuador vs Inglaterra/RD Congo
  ['M87', 'M86'], // Oct 7: Argentina/C.Verde vs Australia/Egipto
  ['M85', 'M88'], // Oct 8: Suiza/Argelia vs Colombia/Ghana
];

// Bracket sides for display

// World Cup group standings calculation & simulation engine


// Standard scoring engine
function calculatePoints(
  match: Match,
  prediction: Prediction | undefined,
): { points: number; type: "exact" | "penalty" | "diff" | "outcome" | "none" } {
  if (!prediction || match.homeScore === null || match.awayScore === null) {
    return { points: 0, type: "none" };
  }

  const { homeScore: rHome, awayScore: rAway } = match;
  const { homeScore: pHome, awayScore: pAway } = prediction;

  const isKnockout = !GROUP_CODES.includes(match.group);
  const matchIsDraw = rHome === rAway;
  const predIsDraw = pHome === pAway;

  // Knockout draw branch — must run before existing logic
  if (isKnockout && matchIsDraw && match.penaltyWinner) {
    if (predIsDraw) {
      // User predicted a draw: correct penalty winner = 5, wrong = 0
      if (prediction.penaltyWinner === match.penaltyWinner) {
        return { points: 5, type: "penalty" };
      }
      return { points: 0, type: "none" };
    }
    // User predicted a decisive result in a match that ended in a draw via penalties
    return { points: 0, type: "none" };
  }

  // Knockout: if match ended decisively but user predicted a draw → 0
  if (isKnockout && !matchIsDraw && predIsDraw) {
    return { points: 0, type: "none" };
  }

  // 1. Exact Match
  if (rHome === pHome && rAway === pAway) {
    return { points: 5, type: "exact" };
  }

  const rDiff = rHome - rAway;
  const pDiff = pHome - pAway;
  const rSign = Math.sign(rDiff);
  const pSign = Math.sign(pDiff);

  // 2. Winner and Goal Difference
  if (rDiff === pDiff && rSign === pSign) {
    return { points: 3, type: "diff" };
  }

  // 3. Winner/Draw Outcome Only
  if (rSign === pSign) {
    return { points: 2, type: "outcome" };
  }

  return { points: 0, type: "none" };
}

// Helper for avatar background color based on name
function getAvatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "from-pink-500 to-rose-500",
    "from-purple-500 to-indigo-500",
    "from-blue-500 to-cyan-500",
    "from-teal-500 to-emerald-500",
    "from-amber-500 to-orange-500",
    "from-fuchsia-500 to-pink-600",
  ];
  return colors[Math.abs(hash) % colors.length];
}

function getMatchWinner(match: Match): string | null {
  if (match.status !== 'finished' || match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return match.homeTeam;
  if (match.awayScore > match.homeScore) return match.awayTeam;
  // Knockout draw resolved via penalties
  if (match.homeScore === match.awayScore && !GROUP_CODES.includes(match.group) && match.penaltyWinner) {
    return match.penaltyWinner === 'home' ? match.homeTeam : match.awayTeam;
  }
  return null;
}

function mapMatchStatus(match: Match): Match {
  if (match.status === "finished" || (match.homeScore !== null && match.awayScore !== null)) {
    return { ...match, status: "finished" };
  }
  const now = new Date();
  const matchDate = new Date(match.date);
  const diffMinutes = (now.getTime() - matchDate.getTime()) / (1000 * 60);
  
  let status: Match["status"] = "scheduled";
  if (diffMinutes >= 110) {
    status = "finished";
  } else if (diffMinutes >= 0) {
    status = "live";
  }
  return { ...match, status };
}

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("prode_theme");
    if (saved) return saved === "dark";
    return true; // Default to dark mode for premium feel
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("prode_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("prode_theme", "light");
    }
  }, [darkMode]);

  // Initialize States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("prode_current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<
    Record<string, Record<string, Prediction>>
  >({});
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("prode_users_cache");
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isHoveringLoginLogo, setIsHoveringLoginLogo] = useState(false);
  const confettiParticles = useMemo(() => {
    if (!isHoveringLoginLogo) return [];
    return Array.from({ length: 50 }).map((_, i) => {
      const isCeleste = Math.random() > 0.5;
      return {
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 2.5,
        size: 7 + Math.random() * 8,
        color: isCeleste ? "#75AADB" : "#FFFFFF",
        rotation: Math.random() * 360,
      };
    });
  }, [isHoveringLoginLogo]);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");
  const [showLoginForm, setShowLoginForm] = useState<boolean>(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showPenaltyModal, setShowPenaltyModal] = useState<boolean>(false);

  useEffect(() => {
    if (currentUser) {
      const hasSeen = localStorage.getItem(`prode_seen_penalty_warning_${currentUser.id}`);
      if (!hasSeen) {
        setShowPenaltyModal(true);
      }
    }
  }, [currentUser]);

  // Fetch users list (always needed, but updates in background if cache exists)
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
        localStorage.setItem("prode_users_cache", JSON.stringify(data));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    loadUsers();
  }, []);

  // Fetch matches and predictions only when a user is logged in
  useEffect(() => {
    if (!currentUser) {
      setMatches([]);
      setPredictions({});
      return;
    }

    const loadDashboardData = async () => {
      try {
        const [resMatches, resPredictions] = await Promise.all([
          fetchMatches(),
          fetchPredictions(currentUser.id),
        ]);
        setMatches(resMatches.map(mapMatchStatus));
        setPredictions(resPredictions);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };
    loadDashboardData();
  }, [currentUser]);


  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!selectedUserId) {
      setLoginError("Seleccioná tu usuario.");
      return;
    }
    try {
      const user = await authenticate(selectedUserId, passwordInput);
      if (!user) {
        setLoginError("Usuario o contraseña incorrectos.");
        return;
      }
      handleLogin(user);
      setPasswordInput("");
      setSelectedUserId("");
    } catch (error) {
      setLoginError("Error de conexión con el servidor.");
    }
  };

  // View tabs: 'matches' | 'leaderboard' | 'rules' | 'groupStandings' | 'admin'
  const [activeTab, setActiveTab] = useState<
    "matches" | "leaderboard" | "rules" | "groupStandings" | "admin"
  >("matches");

  type StatModalType = "puntos" | "exacto" | "diferencia" | "resultado" | "pronosticados" | null;
  const [activeStatModal, setActiveStatModal] = useState<StatModalType>(null);

  // Filters for matches
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showTodayOnly, setShowTodayOnly] = useState<boolean>(false);
  const [showFinished, setShowFinished] = useState<boolean>(false);
  const [teamSearch, setTeamSearch] = useState<string>("");

  const isTodayArgentina = (dateStr: string) => {
    try {
      const matchDate = new Date(dateStr);
      const today = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Argentina/Buenos_Aires",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
      return formatter.format(matchDate) === formatter.format(today);
    } catch (e) {
      return false;
    }
  };

  // Search filter for leaderboard
  const [searchQuery, setSearchQuery] = useState("");

  // Selected user for detailed predictions modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Auto-scroll predictions modal to first pending match
  useEffect(() => {
    if (!selectedUser) return;
    const timer = setTimeout(() => {
      const container = document.getElementById("predictions-modal-scroll");
      const firstPending = container?.querySelector("[data-first-pending]");
      if (firstPending && container) {
        firstPending.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedUser]);

  // Custom error modal state
  const [errorModalMsg, setErrorModalMsg] = useState<string | null>(null);

  // States for matching editing (Admin)
  const [adminEdits, setAdminEdits] = useState<
    Record<
      string,
      { homeScore: string; awayScore: string; status: Match["status"]; penaltyWinner?: string | null }
    >
  >({});
  const [editingFinishedMatches, setEditingFinishedMatches] = useState<Record<string, boolean>>({});

  // States for matching date editing (Admin)
  const [adminDateEdits, setAdminDateEdits] = useState<Record<string, string>>({});
  const [editingDateMatches, setEditingDateMatches] = useState<Record<string, boolean>>({});

  // States for employee predictions editing
  const [predEdits, setPredEdits] = useState<
    Record<string, { homeScore: string; awayScore: string; penaltyWinner?: string | null }>
  >({});

  // Auth helper
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("prode_current_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("prode_current_user");
  };

  const handleExportMyData = async () => {
    if (!currentUser) return;

    if (currentUser.role === "admin") {
      // BACKUP GLOBAL PARA EL ADMIN
      try {
        // Fetch unfiltered predictions (includes future matches with real values)
        const allPredictions = await fetchAdminPredictions();

        const exportData = {
          fecha_exportacion: new Date().toISOString(),
          tipo: "Backup Global Completo",
          tabla_posiciones: leaderboard.map((u, index) => ({
            posicion: index + 1,
            empleado: u.user.name,
            usuario: u.user.username,
            puntos: u.stats.points,
            exactos: u.stats.exactMatches,
            diferencia: u.stats.diffMatches,
            resultado: u.stats.outcomeMatches
          })),
          todos_los_pronosticos: users.filter(u => u.role !== "admin").map(u => {
            return {
              empleado: u.name,
              pronosticos: Object.entries(allPredictions[u.id] || {}).map(([matchId, pred]: [string, any]) => {
                const match = matches.find(m => m.id === matchId);
                return {
                  partido: `${match?.homeTeam} vs ${match?.awayTeam}`,
                  grupo: match?.group || null,
                  fecha_partido: match?.date,
                  estado: match?.status,
                  pronostico: pred.homeScore !== null && pred.awayScore !== null
                    ? `${pred.homeScore} - ${pred.awayScore}`
                    : "Sin pronóstico",
                  resultadoReal: match?.status === 'finished' ? `${match.homeScore} - ${match.awayScore}` : "Pendiente"
                };
              })
            };
          })
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `backup_global_prode_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        setErrorModalMsg("Error al generar el backup global.");
      }
      return;
    }

    const myPredictionsList = Object.entries(predictions[currentUser.id] || {}).map(([matchId, pred]) => {
      const match = matches.find(m => m.id === matchId);
      return {
        partido: `${match?.homeTeam} vs ${match?.awayTeam}`,
        fecha: match?.date,
        miPronostico: pred.isBlocked ? "Oculto" : `${pred.homeScore} - ${pred.awayScore}`,
        resultadoReal: match?.status === 'finished' ? `${match.homeScore} - ${match.awayScore}` : "Pendiente"
      };
    });

    // Encontrar stats del user actual
    const myStats = users
      .filter((u) => u.role !== "admin")
      .map((user) => {
        const userPredictions = predictions[user.id] || {};
        let exactMatches = user.legacyExactMatches || 0;
        let diffMatches = user.legacyDiffMatches || 0;
        let outcomeMatches = user.legacyOutcomeMatches || 0;
        let points = (exactMatches * 5) + (diffMatches * 3) + (outcomeMatches * 2);

        matches.forEach((match) => {
          const matchDate = new Date(match.date);
          const isJune15 = matchDate >= new Date("2026-06-15T00:00:00-03:00") && matchDate < new Date("2026-06-16T00:00:00-03:00");
          if (isJune15) return;

          if (match.status === "finished") {
            const pred = userPredictions[match.id];
            if (pred && pred.homeScore !== null && pred.awayScore !== null) {
              const res = calculatePoints(match, pred);
              points += res.points;
              if (res.type === "exact") exactMatches++;
              else if (res.type === "diff") diffMatches++;
              else if (res.type === "outcome") outcomeMatches++;
              // "penalty" type: points counted but not tracked as exactMatch
            }
          }
        });
        return { id: user.id, points, exactMatches, diffMatches, outcomeMatches };
      })
      .sort((a, b) => b.points - a.points || b.exactMatches - a.exactMatches || b.diffMatches - a.diffMatches || b.outcomeMatches - a.outcomeMatches)
      .map((u, index) => ({ ...u, rank: index + 1 }))
      .find(u => u.id === currentUser.id);

    const exportData = {
      empleado: currentUser.name,
      posicion_en_tabla: myStats?.rank || "?",
      puntos_totales: myStats?.points || 0,
      estadisticas: {
        aciertos_exactos: myStats?.exactMatches || 0,
        aciertos_diferencia: myStats?.diffMatches || 0,
        aciertos_resultado: myStats?.outcomeMatches || 0,
      },
      mis_pronosticos: myPredictionsList,
      fecha_exportacion: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mis_pronosticos_${currentUser.username}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  // Scoreboard calculation
  const leaderboard = useMemo(() => {
    return users
      .filter((u) => u.role !== "admin")
      .map((user) => {
        const userPredictions = predictions[user.id] || {};
        let exactMatches = user.legacyExactMatches || 0;
        let diffMatches = user.legacyDiffMatches || 0;
        let outcomeMatches = user.legacyOutcomeMatches || 0;
        let points = (exactMatches * 5) + (diffMatches * 3) + (outcomeMatches * 2);
        let predictionsCount = (exactMatches + diffMatches + outcomeMatches); // Optional: give them their past matches as predictionsCount base

        matches.forEach((match) => {
          // Ignore matches played on June 15 due to DB wipe and holiday
          const matchDate = new Date(match.date);
          const isJune15 = matchDate >= new Date("2026-06-15T00:00:00-03:00") && matchDate < new Date("2026-06-16T00:00:00-03:00");
          if (isJune15) return;

          const pred = userPredictions[match.id];
          if (pred) {
            predictionsCount++;
            if (match.homeScore !== null && match.awayScore !== null) {
              const res = calculatePoints(match, pred);
              points += res.points;
              if (res.type === "exact") exactMatches++;
              else if (res.type === "penalty") { /* penalty win: points counted, not an exactMatch */ }
              else if (res.type === "diff") diffMatches++;
              else if (res.type === "outcome") outcomeMatches++;
            }
          } else {
            // Penalty of -1 if the match is finished and starts from tomorrow (June 16, 2026 ART onwards to bypass wipe)
            const matchDate = new Date(match.date);
            const cutoffDate = new Date("2026-06-16T00:00:00-03:00");
            if (match.status === "finished" && matchDate >= cutoffDate) {
              points -= 1;
            }
          }
        });

        return {
          user,
          stats: {
            points,
            exactMatches,
            diffMatches,
            outcomeMatches,
            predictionsCount,
          } as UserState,
        };
      })
      .sort(
        (a, b) =>
          b.stats.points - a.stats.points ||
          b.stats.exactMatches - a.stats.exactMatches,
      );
  }, [users, matches, predictions]);

  // Prediction stats for current user
  const currentUserStats = useMemo(() => {
    if (!currentUser) return null;
    return (
      leaderboard.find((l) => l.user.id === currentUser.id)?.stats || {
        points: 0,
        exactMatches: 0,
        diffMatches: 0,
        outcomeMatches: 0,
        predictionsCount: 0,
      }
    );
  }, [leaderboard, currentUser]);

  // Handle saving user prediction
  const savePrediction = async (matchId: string) => {
    if (!currentUser) return;

    const match = matches.find((m) => m.id === matchId);
    if (match) {
      const matchDate = new Date(match.date);
      const isJune15 = matchDate >= new Date("2026-06-15T00:00:00-03:00") && matchDate < new Date("2026-06-16T00:00:00-03:00");
      
      if (isJune15) {
        setErrorModalMsg(
          "Para evitar inconvenientes por el problema en la base de datos, los pronósticos para los partidos del 15 de Junio se encuentran excepcionalmente deshabilitados."
        );
        return;
      }
      if (match.status !== "scheduled" || new Date() >= new Date(match.date)) {
        setErrorModalMsg(
          "No se permite guardar pronósticos una vez comenzado o finalizado el partido.",
        );
        return;
      }
    }

    const edit = predEdits[matchId];
    if (!edit) return;

    const homeScore = parseInt(edit.homeScore);
    const awayScore = parseInt(edit.awayScore);

    if (
      isNaN(homeScore) ||
      homeScore < 0 ||
      isNaN(awayScore) ||
      awayScore < 0
    ) {
      setErrorModalMsg(
        "Por favor ingresá un resultado válido (goles válidos).",
      );
      return;
    }

    const isKnockout = !GROUP_CODES.includes(match?.group ?? '');
    const scoresAreEqual = homeScore === awayScore;
    if (isKnockout && scoresAreEqual && !edit.penaltyWinner) {
      setErrorModalMsg(
        "En partidos de eliminación directa con empate, debés seleccionar el ganador por penales.",
      );
      return;
    }

    const penaltyWinner = isKnockout && scoresAreEqual
      ? (edit.penaltyWinner as 'home' | 'away' | null | undefined)
      : null;

    try {
      await upsertPrediction({
        userId: currentUser.id,
        matchId,
        homeScore,
        awayScore,
        penaltyWinner,
      });

      setPredictions((prev) => {
        const userPreds = prev[currentUser.id] || {};
        return {
          ...prev,
          [currentUser.id]: {
            ...userPreds,
            [matchId]: {
              homeScore,
              awayScore,
              createdAt: new Date().toISOString(),
              penaltyWinner: penaltyWinner ?? null,
            },
          },
        };
      });

      // Clear edit state
      setPredEdits((prev) => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
    } catch (error) {
      setErrorModalMsg("Error de conexión al guardar pronóstico.");
    }
  };

  // Handle saving match real score (Admin)
  const saveMatchResult = async (matchId: string) => {
    const edit = adminEdits[matchId];
    if (!edit) return;

    const homeScore = edit.homeScore === "" ? null : parseInt(edit.homeScore);
    const awayScore = edit.awayScore === "" ? null : parseInt(edit.awayScore);

    if (
      edit.status === "finished" &&
      (homeScore === null || awayScore === null)
    ) {
      setErrorModalMsg(
        "Para finalizar el partido, debés cargar un resultado real.",
      );
      return;
    }

    const isKnockout = !GROUP_CODES.includes(matches.find(m => m.id === matchId)?.group ?? '');
    const scoresAreEqual = homeScore !== null && awayScore !== null && homeScore === awayScore;

    if (isKnockout && scoresAreEqual && !edit.penaltyWinner) {
      setErrorModalMsg(
        "En partidos de eliminación directa con empate, debés seleccionar el ganador por penales.",
      );
      return;
    }

    try {
      const penaltyWinner = isKnockout && scoresAreEqual
        ? (edit.penaltyWinner as 'home' | 'away' | null | undefined)
        : null;

      await updateMatch(matchId, { homeScore, awayScore, status: edit.status, penaltyWinner });

      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? mapMatchStatus({
                ...m,
                homeScore,
                awayScore,
                status: edit.status,
                penaltyWinner: penaltyWinner ?? null,
              })
            : m,
        ),
      );

      setAdminEdits((prev) => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
      setEditingFinishedMatches((prev) => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
    } catch (error) {
      setErrorModalMsg("Error de conexión al guardar resultado.");
    }
  };

  const saveMatchDate = async (matchId: string) => {
    const newDateStr = adminDateEdits[matchId];
    if (!newDateStr) return;
    
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    try {
      const updated = await updateMatch(matchId, {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        date: new Date(newDateStr).toISOString(),
      });

      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? mapMatchStatus({
                ...m,
                date: updated.date,
              })
            : m,
        ),
      );

      setAdminDateEdits((prev) => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
      setEditingDateMatches((prev) => {
        const copy = { ...prev };
        delete copy[matchId];
        return copy;
      });
    } catch (error) {
      setErrorModalMsg("Error de conexión al guardar la fecha.");
    }
  };

  const handleClearPredictions = async () => {
    if (!window.confirm("¿Estás seguro de que querés eliminar todos los pronósticos? Esto reseteará los puntajes de los participantes a 0.")) return;
    try {
      await clearPredictions();
      setPredictions({});
      alert("Pronósticos eliminados y resultados reseteados a 0 con éxito.");
    } catch (error) {
      setErrorModalMsg("Error de conexión al resetear pronósticos.");
    }
  };

  const handleDownloadBackup = async () => {
    try {
      const backupData = await downloadBackup();
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: "application/json",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `temperies_backup_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setErrorModalMsg("Error de conexión al descargar backup.");
    }
  };

  const handleResetMatches = async () => {
    if (!window.confirm("¿Estás seguro de que querés restablecer todos los partidos a pendientes sin goles?")) return;
    try {
      await resetMatches();
      setMatches((prev) =>
        prev.map((m) =>
          mapMatchStatus({
            ...m,
            homeScore: null,
            awayScore: null,
            status: "scheduled",
          })
        )
      );
      alert("Partidos restablecidos con éxito.");
    } catch (error) {
      setErrorModalMsg("Error de conexión al restablecer partidos.");
    }
  };


  const statMatches = useMemo(() => {
    if (!currentUser || !activeStatModal) return null;
    const userPredictions = predictions[currentUser.id] || {};
    
    let list: Array<{ match: Match; pred: Prediction | null; points: number }> = [];
    
    matches.forEach(match => {
      const pred = userPredictions[match.id];
      const matchDate = new Date(match.date);
      const isJune15 = matchDate >= new Date("2026-06-15T00:00:00-03:00") && matchDate < new Date("2026-06-16T00:00:00-03:00");
      
      if (pred) {
        if (activeStatModal === "pronosticados") {
          list.push({ match, pred, points: 0 });
        } else if (match.status === "finished" && !isJune15 && match.homeScore !== null && match.awayScore !== null) {
          const res = calculatePoints(match, pred);
          if (activeStatModal === "puntos" && res.points > 0) {
            list.push({ match, pred, points: res.points });
          } else if (activeStatModal === "exacto" && res.type === "exact") {
            list.push({ match, pred, points: res.points });
          } else if (activeStatModal === "diferencia" && res.type === "diff") {
            list.push({ match, pred, points: res.points });
          } else if (activeStatModal === "resultado" && res.type === "outcome") {
            list.push({ match, pred, points: res.points });
          }
        }
      } else {
        if (activeStatModal === "pronosticados" && match.status !== "finished" && !isJune15) {
          list.push({ match, pred: null, points: 0 });
        }
      }
    });

    if (activeStatModal === "pronosticados") {
      list.sort((a, b) => {
        if (!a.pred && b.pred) return -1;
        if (a.pred && !b.pred) return 1;
        return new Date(a.match.date).getTime() - new Date(b.match.date).getTime();
      });
    } else {
      list.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return new Date(a.match.date).getTime() - new Date(b.match.date).getTime();
      });
    }

    return list;
  }, [currentUser, activeStatModal, matches, predictions]);

  return (
    <div
      className="min-h-screen bg-bg-primary text-text-primary flex flex-col font-sans select-none pb-12 transition-colors duration-200"
      style={
        !currentUser
          ? showLoginForm
            ? {
                backgroundImage:
                  "linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.45)), url(/login.png)",
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundColor: "#030612",
                backgroundAttachment: "fixed",
              }
            : { backgroundColor: "#030612" }
          : undefined
      }
    >
      {/* Top Header */}
      <header
        className="sticky top-0 z-40 bg-bg-header backdrop-blur-md border-b border-border-header px-6 py-4 flex items-center justify-between transition-colors duration-200"
        style={
          !currentUser
            ? {
                backgroundColor: "#090E1D",
                borderColor: "rgba(30, 41, 59, 0.4)",
              }
            : undefined
        }
      >
        <div className="flex items-center gap-3">
          {currentUser && (
            <div
              onClick={() => {
                setActiveTab("matches");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200"
              title="Ir a Partidos y subir"
            >
              {darkMode ? (
                <img
                  src="/logo-dark.png"
                  alt="Temperies Prode Mundial 2026"
                  className="h-14 sm:h-18 w-auto object-contain"
                />
              ) : (
                <div className="bg-white px-2 py-1 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center h-14 sm:h-18">
                  <img
                    src="/logo.png"
                    alt="Temperies Prode Mundial 2026"
                    className="h-12 sm:h-16 w-auto object-contain"
                  />
                </div>
              )}
            </div>
          )}
          {currentUser && (
            <div className="flex items-center gap-2 bg-sky-500/10 dark:bg-sky-500/20 border border-sky-400/30 dark:border-sky-400/20 px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-black text-sky-600 dark:text-sky-300 shadow-sm uppercase tracking-wider select-none hover:scale-105 transition-transform duration-200">
              <img src="https://flagcdn.com/w20/ar.png" className="w-4 h-3 object-cover rounded-xs border border-sky-400/30" alt="AR" />
              <span>¡Vamos Argentina!</span>
              <img src="https://flagcdn.com/w20/ar.png" className="w-4 h-3 object-cover rounded-xs border border-sky-400/30" alt="AR" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Light/Dark Toggle */}
          {currentUser && (
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 border border-border-color rounded-xl text-text-secondary transition-colors cursor-pointer"
              title={darkMode ? "Modo Claro" : "Modo Oscuro"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>
          )}

          {currentUser && (
            <>
              {/* User Info */}
              <div className="hidden sm:flex flex-col items-end">
                <span className="font-semibold text-sm text-text-secondary">
                  {currentUser.name}
                </span>
                <span className="text-xs text-text-muted font-mono">
                  {currentUser.role === "admin"
                    ? "Administrador"
                    : (
                      <span>
                        <span className="font-bold text-indigo-500 dark:text-indigo-400">Pos {leaderboard.findIndex((l) => l.user.id === currentUser?.id) + 1}</span>
                        <span className="mx-1.5 opacity-50">|</span>
                        {currentUserStats?.points || 0} pts
                      </span>
                    )}
                </span>
              </div>

              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(currentUser.name)} flex items-center justify-center font-bold text-white text-sm shadow-md`}
              >
                {currentUser.name.charAt(0)}
              </div>

              <button
                onClick={handleExportMyData}
                className="p-2 bg-slate-200 dark:bg-slate-900 hover:bg-indigo-950/40 hover:text-indigo-500 text-slate-600 dark:text-slate-400 border border-border-color rounded-xl transition-colors cursor-pointer"
                title={currentUser.role === "admin" ? "Descargar Backup Global" : "Descargar mi Backup Personal"}
              >
                <Save className="w-4 h-4" />
              </button>
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
      <main
        className={`max-w-7xl mx-auto w-full px-4 sm:px-6 mt-8 flex-1 ${!currentUser && showLoginForm ? "flex items-center justify-center min-h-[calc(100vh-160px)]" : ""}`}
      >
        {!currentUser ? (
          showLoginForm ? (
            /* Login Screen */
            <div className="max-w-md w-full mx-auto my-auto animate-fade-in">
              <div
                className={`${CARD_STYLE} border-indigo-500/20 shadow-indigo-500/10`}
              >
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-border-color rounded-2xl flex items-center justify-center mx-auto shadow-xl mb-4">
                    <img src="https://flagcdn.com/w40/ar.png" className="w-10 h-7 object-cover rounded-xs border border-border-color/30" alt="AR" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-text-primary">
                    Ingresá a tu Prode
                  </h2>
                  <p className="text-text-muted text-sm mt-1">
                    Ingresá tus credenciales para acceder
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-5">
                  <div>
                   <div className="relative">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                      Usuario / Empleado
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserDropdownOpen((prev) => !prev);
                        setUserSearchQuery("");
                      }}
                      className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-left text-text-primary focus:outline-none focus:border-indigo-500 transition-colors flex items-center justify-between text-sm font-semibold"
                    >
                      <span className={selectedUserId ? "text-text-primary font-bold" : "text-text-muted/65"}>
                        {selectedUserId
                          ? users.find((u) => u.id === selectedUserId)?.name
                          : "Seleccioná tu nombre..."}
                      </span>
                      <span className="text-text-muted text-[10px] transition-transform duration-200" style={{ transform: isUserDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                        ▼
                      </span>
                    </button>

                    {isUserDropdownOpen && (
                      <div
                        className="absolute z-50 left-0 right-0 mt-2 border border-slate-400/30 rounded-2xl shadow-2xl p-3 space-y-2 max-h-[160px] overflow-y-auto animate-fade-in backdrop-blur-xl"
                        style={{ backgroundColor: "#ffffff" }}
                      >
                        <input
                          type="text"
                          placeholder="Buscar tu nombre..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="space-y-1">
                          {users
                            .filter((user) =>
                              user.name.toLowerCase().includes(userSearchQuery.toLowerCase())
                            )
                            .map((user) => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setSelectedUserId(user.id);
                                  setLoginError("");
                                  setIsUserDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between ${
                                  selectedUserId === user.id
                                    ? "bg-indigo-600 text-white font-bold"
                                    : "text-slate-900 hover:bg-slate-100 hover:text-black font-semibold"
                                }`}
                              >
                                <span>
                                  {user.name} {user.role === "admin" ? "(Admin)" : ""}
                                </span>
                                {selectedUserId === user.id && <span>✓</span>}
                              </button>
                            ))}
                          {users.filter((user) =>
                            user.name.toLowerCase().includes(userSearchQuery.toLowerCase())
                          ).length === 0 && (
                            <p className="text-[10px] text-slate-700 text-center py-2 font-medium">
                              No se encontraron empleados
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
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
                        setLoginError("");
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
                  <p className="text-[10px] text-text-muted font-mono mt-1">
                    SOLICITAR contraseña por discord a Ramiro Toulemonde{" "}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 w-full">
              <div
                className="relative aspect-square w-full max-w-[min(90vw,70vh)] mx-auto mt-4 bg-cover bg-center bg-no-repeat shadow-2xl rounded-2xl animate-fade-in"
                style={{ backgroundImage: "url(/login.png)" }}
              >
                {/* Clickable zone for the eye logo mark at the top center of the background image */}
                <button
                  onClick={() => {
                    setShowLoginForm(true);
                  }}
                  onMouseEnter={() => {
                    setIsHoveringLoginLogo(true);
                  }}
                  onMouseLeave={() => setIsHoveringLoginLogo(false)}
                  className="absolute top-[2%] left-[32%] w-[36%] h-[20%] rounded-full cursor-pointer transition-all duration-300 border border-transparent flex items-center justify-center arg-heartbeat-hover active:scale-95"
                  title="Hacé click en el logo para ingresar"
                >
                  <span className="sr-only">Ingresar</span>
                </button>
              </div>
              <p className="text-xs font-semibold tracking-wider text-slate-300/80 select-none animate-pulse text-center max-w-xs mt-2 bg-slate-950/70 border border-white/10 px-4 py-2 rounded-full backdrop-blur-sm shadow-xl">
                💡 Tip: Pasá el mouse por el logo de Temperies para ingresar
              </p>

              {/* Falling confetti and idols overlay */}
              {isHoveringLoginLogo && (
                <>
                  <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {confettiParticles.map((p) => (
                      <div
                        key={p.id}
                        className="absolute top-0 animate-confetti-fall"
                        style={{
                          left: `${p.left}%`,
                          width: `${p.size}px`,
                          height: `${p.size * 1.5}px`,
                          backgroundColor: p.color,
                          animationDelay: `${p.delay}s`,
                          animationDuration: `${p.duration}s`,
                          transform: `rotate(${p.rotation}deg)`,
                          opacity: 0.8,
                          borderRadius: "2px",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                        }}
                      />
                    ))}
                  </div>

                  {/* Maradona (Left) and Messi (Right) Idols */}
                  <img
                    src="/maradona.png"
                    alt="Diego Maradona"
                    className="fixed top-1/2 left-4 sm:left-8 md:left-16 w-[180px] h-[180px] sm:w-[280px] sm:h-[280px] md:w-[380px] md:h-[380px] rounded-full object-contain bg-[#75AADB] backdrop-blur-xs border-4 border-sky-400/40 shadow-[0_0_30px_rgba(56,189,248,0.3)] pointer-events-none z-40 animate-slide-left-idol"
                  />
                  <img
                    src="/messi.png"
                    alt="Lionel Messi"
                    className="fixed top-1/2 right-4 sm:right-8 md:right-16 w-[180px] h-[180px] sm:w-[280px] sm:h-[280px] md:w-[380px] md:h-[380px] rounded-full object-contain bg-[#75AADB] backdrop-blur-xs border-4 border-sky-400/40 shadow-[0_0_30px_rgba(56,189,248,0.3)] pointer-events-none z-40 animate-slide-right-idol"
                  />

                  {/* Pulsing Argentina Banner */}
                  <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 flex flex-col items-center justify-center animate-argentina-banner whitespace-nowrap">
                    <span className="text-4xl sm:text-7xl font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-white to-sky-400 drop-shadow-[0_5px_15px_rgba(56,189,248,0.6)]">
                      ¡VAMOS ARGENTINA!
                    </span>
                    <div className="flex items-center gap-3 sm:gap-5 mt-4">
                      <span className="text-3xl sm:text-5xl">🎺</span>
                      <img src="https://flagcdn.com/w80/ar.png" className="w-12 h-8 sm:w-16 sm:h-11 object-cover rounded-md shadow-lg border-2 border-white/20" alt="AR" />
                      <span className="text-3xl sm:text-5xl">🎺</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        ) : (
          /* Dashboard Dashboard */
          <div className="space-y-6">


            {/* Stats Dashboard Mini Banner */}
            {currentUser.role !== "admin" && currentUserStats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <button onClick={() => setActiveStatModal("puntos")} className={`${MINI_CARD_STYLE} hover:scale-105 transition-transform cursor-pointer shadow-sm hover:shadow-md text-left`}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Puntaje Total
                  </span>
                  <span className="text-3xl font-black mt-1 bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-indigo-400 dark:to-pink-400 bg-clip-text text-transparent">
                    {currentUserStats.points}
                  </span>
                </button>
                <button onClick={() => setActiveStatModal("exacto")} className={`${MINI_CARD_STYLE} hover:scale-105 transition-transform cursor-pointer shadow-sm hover:shadow-md text-left`}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Acierto Exacto
                  </span>
                  <span className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">
                    {currentUserStats.exactMatches}
                  </span>
                  <span className="text-text-muted text-[10px] block font-semibold">
                    (5 pts c/u)
                  </span>
                </button>
                <button onClick={() => setActiveStatModal("diferencia")} className={`${MINI_CARD_STYLE} hover:scale-105 transition-transform cursor-pointer shadow-sm hover:shadow-md text-left`}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Diferencia
                  </span>
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                    {currentUserStats.diffMatches}
                  </span>
                  <span className="text-text-muted text-[10px] block font-semibold">
                    (3 pts c/u)
                  </span>
                </button>
                <button onClick={() => setActiveStatModal("resultado")} className={`${MINI_CARD_STYLE} hover:scale-105 transition-transform cursor-pointer shadow-sm hover:shadow-md text-left`}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Resultado
                  </span>
                  <span className="text-3xl font-black text-teal-600 dark:text-teal-400 mt-1">
                    {currentUserStats.outcomeMatches}
                  </span>
                  <span className="text-text-muted text-[10px] block font-semibold">
                    (2 pts c/u)
                  </span>
                </button>
                <button onClick={() => setActiveStatModal("pronosticados")} className={`${MINI_CARD_STYLE} col-span-2 md:col-span-1 hover:scale-105 transition-transform cursor-pointer shadow-sm hover:shadow-md text-left`}>
                  <span className="block text-xs font-semibold text-text-muted uppercase tracking-wider">
                    Pronosticados
                  </span>
                  <span className="text-3xl font-black text-text-primary mt-1">
                    {currentUserStats.predictionsCount} / {matches.length}
                  </span>
                </button>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-color pb-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("matches")}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "matches"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color"
                  }`}
                >
                  <Award className="w-4 h-4" /> Partidos
                </button>

                <button
                  onClick={() => setActiveTab("groupStandings")}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "groupStandings"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color"
                  }`}
                >
                  <Trophy className="w-4 h-4" /> Llaves del Mundial
                </button>

                <button
                  onClick={() => setActiveTab("leaderboard")}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "leaderboard"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color"
                  }`}
                >
                  <Users className="w-4 h-4" /> Tabla de Posiciones de la T
                </button>

                <button
                  onClick={() => setActiveTab("rules")}
                  className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === "rules"
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color"
                  }`}
                >
                  <BookOpen className="w-4 h-4" /> Reglamento & Premios
                </button>

                {currentUser.role === "admin" && (
                  <button
                    onClick={() => setActiveTab("admin")}
                    className={`px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === "admin"
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                        : "text-text-muted hover:text-text-primary hover:bg-bg-card border border-transparent hover:border-border-color"
                    }`}
                  >
                    <Settings className="w-4 h-4" /> Panel Admin
                  </button>
                )}
              </div>
            </div>

            {/* TAB CONTENTS */}
            {activeTab === "matches" && (
              <div className="space-y-6">
                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-bg-card border border-border-color rounded-2xl p-4 shadow-sm">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Estado:
                      </span>
                      <select
                        className="bg-bg-input border border-border-color rounded-lg px-3 py-1.5 text-xs font-bold text-text-primary focus:outline-none focus:border-indigo-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="All">Todos</option>
                        <option value="scheduled">Pendientes</option>
                        <option value="live">En Vivo</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                        Buscar equipo:
                      </span>
                      <input
                        type="text"
                        placeholder="Ej: Argentina..."
                        value={teamSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTeamSearch(val);
                          if (val.trim()) {
                            setShowTodayOnly(false);
                          }
                        }}
                        className="bg-bg-input border border-border-color rounded-lg px-3 py-1.5 text-xs font-bold text-text-primary focus:outline-none focus:border-indigo-500 placeholder-text-muted/40 w-36 sm:w-44 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        if (!showFinished) {
                          setShowTodayOnly(false);
                        }
                        setShowFinished((prev) => !prev);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                        showFinished
                          ? "bg-indigo-600/15 border-indigo-500 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-md shadow-indigo-500/5 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 dark:hover:text-white"
                          : "bg-bg-input border-border-color text-text-secondary hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    >
                      ✅ Ver Finalizados
                    </button>
                    <button
                      onClick={() => {
                        if (!showTodayOnly) {
                          setShowFinished(false);
                        }
                        setShowTodayOnly((prev) => !prev);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 border ${
                        showTodayOnly
                          ? "bg-rose-600/15 border-rose-500 text-rose-600 dark:text-rose-400 font-extrabold shadow-md shadow-rose-500/5 hover:bg-rose-600 hover:text-white dark:hover:bg-rose-500 dark:hover:text-white"
                          : "bg-bg-input border-border-color text-text-secondary hover:bg-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                      }`}
                    >
                      📅 Partidos de Hoy
                    </button>
                  </div>
                </div>

                {/* Matches Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {matches
                    .filter((m) => !GROUP_CODES.includes(m.group))
                    .filter(
                      (m) =>
                        statusFilter === "All" || m.status === statusFilter,
                    )
                    .filter((m) => !showTodayOnly || isTodayArgentina(m.date))
                    .filter((m) => {
                      if (showFinished) return m.status === "finished";
                      return statusFilter === "finished" || m.status !== "finished" || teamSearch.trim() !== "";
                    })
                    .filter((m) => {
                      if (!teamSearch.trim()) return true;
                      const searchLower = teamSearch.toLowerCase();
                      const homeTeamName =
                        TEAMS.find(
                          (t) => t.code === m.homeTeam,
                        )?.name.toLowerCase() || "";
                      const awayTeamName =
                        TEAMS.find(
                          (t) => t.code === m.awayTeam,
                        )?.name.toLowerCase() || "";
                      return (
                        homeTeamName.includes(searchLower) ||
                        awayTeamName.includes(searchLower) ||
                        m.homeTeam.toLowerCase().includes(searchLower) ||
                        m.awayTeam.toLowerCase().includes(searchLower)
                      );
                    })
                    .map((match) => {
                      const homeTeam = TEAMS.find(
                        (t) => t.code === match.homeTeam,
                      );
                      const awayTeam = TEAMS.find(
                        (t) => t.code === match.awayTeam,
                      );
                      const userPred = predictions[currentUser.id]?.[match.id];

                      // Check if there is an active local edit state
                      const localEdit = predEdits[match.id] || {
                        homeScore: userPred
                          ? userPred.homeScore.toString()
                          : "",
                        awayScore: userPred
                          ? userPred.awayScore.toString()
                          : "",
                      };

                      const isMatchLocked =
                        match.status === "finished" ||
                        match.status === "live" ||
                        new Date() >= new Date(match.date);

                      // Calculate potential/earned points for this match card
                      const pointsEarned =
                        match.status === "finished"
                          ? userPred
                            ? calculatePoints(match, userPred)
                            : { points: new Date(match.date) >= new Date("2026-06-16T00:00:00-03:00") ? -1 : 0, type: "none" as const }
                          : null;

                      return (
                        <div
                          key={match.id}
                          className={`${CARD_STYLE} relative flex flex-col justify-between overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 ${!isMatchLocked && !userPred ? "!border-rose-500/40 dark:!border-rose-500/30 ring-1 ring-rose-500/10 shadow-rose-500/5 shadow-md" : ""}`}
                        >
                          {/* Top Status Indicators */}
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[11px] font-bold tracking-widest text-indigo-500 uppercase">
                              {KNOCKOUT_PHASES[match.group] || match.group}
                            </span>

                            {/* Badges */}
                            {match.status === "live" && (
                              <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                ● EN VIVO
                              </span>
                            )}
                            {match.status === "finished" && (
                              <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Finalizado
                              </span>
                            )}
                            {match.status === "scheduled" && (
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
                                  (e.target as HTMLImageElement).src =
                                    "https://flagcdn.com/w80/un.png";
                                }}
                              />
                              <span className="text-xs font-bold text-center text-text-secondary w-24 truncate">
                                {homeScoreReplacement(
                                  homeTeam?.name || match.homeTeam,
                                )}
                              </span>
                            </div>

                            {/* Scores Container */}
                            <div className="flex items-center gap-2">
                              {isMatchLocked ? (
                                /* Locked Scores Display (Live or Finished) */
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-black text-text-primary w-8 text-center bg-bg-input rounded-lg py-1 border border-border-color">
                                    {match.homeScore ?? "-"}
                                  </span>
                                  <span className="text-text-muted font-bold">
                                    :
                                  </span>
                                  <span className="text-2xl font-black text-text-primary w-8 text-center bg-bg-input rounded-lg py-1 border border-border-color">
                                    {match.awayScore ?? "-"}
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
                                      const newHome = parseInt(val);
                                      const currentAway = parseInt(localEdit.awayScore);
                                      const scoresWillDiverge = !isNaN(newHome) && !isNaN(currentAway) && newHome !== currentAway;
                                      setPredEdits((prev) => ({
                                        ...prev,
                                        [match.id]: {
                                          ...(prev[match.id] || {
                                            homeScore: "",
                                            awayScore: localEdit.awayScore,
                                          }),
                                          homeScore: val,
                                          penaltyWinner: scoresWillDiverge ? null : prev[match.id]?.penaltyWinner,
                                        },
                                      }));
                                    }}
                                    className={INPUT_STYLE}
                                  />
                                  <span className="text-text-muted font-bold">
                                    :
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    placeholder="-"
                                    value={localEdit.awayScore}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const newAway = parseInt(val);
                                      const currentHome = parseInt(localEdit.homeScore);
                                      const scoresWillDiverge = !isNaN(newAway) && !isNaN(currentHome) && currentHome !== newAway;
                                      setPredEdits((prev) => ({
                                        ...prev,
                                        [match.id]: {
                                          ...(prev[match.id] || {
                                            homeScore: localEdit.homeScore,
                                            awayScore: "",
                                          }),
                                          awayScore: val,
                                          penaltyWinner: scoresWillDiverge ? null : prev[match.id]?.penaltyWinner,
                                        },
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
                                  (e.target as HTMLImageElement).src =
                                    "https://flagcdn.com/w80/un.png";
                                }}
                              />
                              <span className="text-xs font-bold text-center text-text-secondary w-24 truncate">
                                {homeScoreReplacement(
                                  awayTeam?.name || match.awayTeam,
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Penalty winner display for finished knockout draws */}
                          {match.status === "finished" && match.penaltyWinner &&
                            match.homeScore === match.awayScore &&
                            !GROUP_CODES.includes(match.group) && (
                            <div className="flex justify-center mt-1 mb-1">
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                                Pen. {match.penaltyWinner === 'home' ? homeTeam?.name || match.homeTeam : awayTeam?.name || match.awayTeam}
                              </span>
                            </div>
                          )}

                          {/* Penalty radio for prediction — knockout draw only */}
                          {!isMatchLocked && !GROUP_CODES.includes(match.group) &&
                            localEdit.homeScore !== "" && localEdit.awayScore !== "" &&
                            parseInt(localEdit.homeScore) === parseInt(localEdit.awayScore) &&
                            !isNaN(parseInt(localEdit.homeScore)) && (
                            <div className="flex flex-col items-center gap-1.5 mt-2 mb-1">
                              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                Ganador por Penales
                              </span>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`penalty-pred-${match.id}`}
                                    value="home"
                                    checked={localEdit.penaltyWinner === 'home'}
                                    onChange={() => setPredEdits((prev) => ({
                                      ...prev,
                                      [match.id]: { ...(prev[match.id] || { homeScore: localEdit.homeScore, awayScore: localEdit.awayScore }), penaltyWinner: 'home' },
                                    }))}
                                    className="accent-amber-500"
                                  />
                                  <span className="text-xs font-bold text-text-secondary">
                                    {homeTeam?.name || match.homeTeam}
                                  </span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="radio"
                                    name={`penalty-pred-${match.id}`}
                                    value="away"
                                    checked={localEdit.penaltyWinner === 'away'}
                                    onChange={() => setPredEdits((prev) => ({
                                      ...prev,
                                      [match.id]: { ...(prev[match.id] || { homeScore: localEdit.homeScore, awayScore: localEdit.awayScore }), penaltyWinner: 'away' },
                                    }))}
                                    className="accent-amber-500"
                                  />
                                  <span className="text-xs font-bold text-text-secondary">
                                    {awayTeam?.name || match.awayTeam}
                                  </span>
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Save & Prediction Status Bar */}
                          <div className="mt-4 pt-3 border-t border-border-color flex flex-col gap-2">
                            {/* Date/Time and Stadium info */}
                            <div className="text-xs text-text-muted font-medium flex items-start justify-between gap-2">
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-text-secondary text-xs sm:text-sm flex items-center gap-1.5">
                                  <img src="https://flagcdn.com/w20/ar.png" className="w-4 h-3 object-cover rounded-xs border border-slate-200/20 shadow-xs" alt="AR" />
                                  <span>
                                    {new Date(match.date).toLocaleString(
                                      "es-AR",
                                      {
                                        timeZone:
                                          "America/Argentina/Buenos_Aires",
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                      },
                                    )}{" "}
                                    hs
                                  </span>
                                </span>
                                <span className="text-[10px] sm:text-xs text-text-muted flex items-center gap-1.5">
                                  <img src="https://flagcdn.com/w20/es.png" className="w-4 h-3 object-cover rounded-xs border border-slate-200/20 shadow-xs" alt="ES" />
                                  <span>
                                    {new Date(match.date).toLocaleString(
                                      "es-ES",
                                      {
                                        timeZone: "Europe/Madrid",
                                        day: "numeric",
                                        month: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                      },
                                    )}{" "}
                                    hs
                                  </span>
                                </span>
                              </div>
                              <span className="truncate max-w-[120px] text-[10px] sm:text-xs self-start text-right">
                                {match.stadium}
                              </span>
                            </div>

                            {/* Prediction status / Save Action */}
                            <div className="flex items-center justify-between mt-1 min-h-[36px]">
                              {/* Prediction Status Badge */}
                              <div className="flex flex-col">
                                <span className="text-[9px] font-bold text-text-muted uppercase">
                                  Tu Pronóstico
                                </span>
                                {userPred ? (
                                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                    Predijo: {userPred.homeScore} -{" "}
                                    {userPred.awayScore}
                                  </span>
                                ) : !isMatchLocked ? (
                                  <span className="text-xs font-black text-rose-500 dark:text-rose-400 flex items-center gap-1 animate-pulse">
                                    ⚠️ Falta Pronosticar
                                  </span>
                                ) : (
                                  <span className="text-xs text-text-muted italic">
                                    Sin Pronosticar
                                  </span>
                                )}
                              </div>

                              {/* Action Buttons */}
                              {isMatchLocked
                                ? /* Result Points breakdown if finished */
                                  pointsEarned && (
                                    <div
                                      className={`px-2.5 py-1 rounded-lg border font-bold text-xs flex items-center gap-1 ${
                                        pointsEarned.points === 5
                                          ? "bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400"
                                          : pointsEarned.points === 3
                                            ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
                                            : pointsEarned.points === 2
                                              ? "bg-teal-500/15 border-teal-500/30 text-teal-600 dark:text-teal-400"
                                              : pointsEarned.points === -1
                                                ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
                                                : "bg-slate-100 dark:bg-slate-900 border-border-color text-text-muted"
                                      }`}
                                    >
                                      {pointsEarned.type === "penalty" ? (
                                        <>⚽ +{pointsEarned.points} pts (pen.)</>
                                      ) : pointsEarned.points > 0 ? (
                                        <>🎉 +{pointsEarned.points} pts</>
                                      ) : pointsEarned.points === -1 ? (
                                        <>⚠️ -1 pt (No pronosticado)</>
                                      ) : (
                                        <>❌ 0 pts</>
                                      )}
                                    </div>
                                  )
                                : /* Save Button */
                                  predEdits[match.id] && (() => {
                                    const isKnockoutMatch = !GROUP_CODES.includes(match.group);
                                    const editHome = parseInt(predEdits[match.id]?.homeScore ?? '');
                                    const editAway = parseInt(predEdits[match.id]?.awayScore ?? '');
                                    const isKnockoutDraw = isKnockoutMatch && !isNaN(editHome) && !isNaN(editAway) && editHome === editAway;
                                    const penaltySelected = !!predEdits[match.id]?.penaltyWinner;
                                    const isSaveDisabled = isKnockoutDraw && !penaltySelected;
                                    return (
                                      <button
                                        onClick={() => savePrediction(match.id)}
                                        disabled={isSaveDisabled}
                                        className={`px-3 py-1.5 font-bold rounded-lg text-xs transition-all flex items-center gap-1 ${
                                          isSaveDisabled
                                            ? "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60"
                                            : "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                                        }`}
                                      >
                                        <Save className="w-3.5 h-3.5" />{" "}
                                        {userPred ? "Modificar" : "Guardar"}
                                      </button>
                                    );
                                  })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* TAB: RULES / REGLAMENTO */}
            {activeTab === "rules" && (
              <div className="space-y-6">
                <div
                  className={`${CARD_STYLE} relative overflow-hidden animate-fade-in`}
                >
                  <div className="flex items-center gap-3 border-b border-border-color pb-4 mb-6">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-400/20 rounded-xl text-indigo-500 dark:text-indigo-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-text-primary">
                        Reglamento del Prode Mundial 2026
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        Leé las reglas y entendé cómo funciona el sistema de
                        puntos
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: General Rules & Locking */}
                    <div className="space-y-6">
                      <div className="bg-slate-500/5 border border-border-color rounded-xl p-5">
                        <h4 className="font-bold text-sm text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          ⏰ Carga de Pronósticos
                        </h4>
                        <ul className="space-y-3 text-xs text-text-secondary leading-relaxed">
                          <li className="flex items-start gap-2.5">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>
                              <strong>Límite de tiempo:</strong> Todos los
                              pronósticos deben ser cargados y guardados{" "}
                              <strong>antes del silbatazo inicial</strong> de
                              cada partido.
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>
                              <strong>Bloqueo automático:</strong> Una vez
                              comenzado el partido (o al pasar la hora oficial),
                              el sistema deshabilitará la tarjeta
                              correspondiente del partido y ya no se podrán
                              realizar ni modificar predicciones.
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>
                              <strong>Guardado de datos:</strong> Asegurate de
                              presionar el botón <strong>"Guardar"</strong> en
                              cada partido para confirmar tus goles.
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-slate-500/5 border border-border-color rounded-xl p-5">
                        <h4 className="font-bold text-sm text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                          🏆 Reglas Básicas
                        </h4>
                        <ul className="space-y-3 text-xs text-text-secondary leading-relaxed">
                          <li className="flex items-start gap-2.5">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>
                              <strong>Transparencia:</strong> Todos los
                              empleados participan bajo las mismas condiciones.
                              Podés ver las predicciones de tus compañeros una
                              vez que empiece el partido para garantizar juego
                              limpio.
                            </span>
                          </li>
                          <li className="flex items-start gap-2.5">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>
                              <strong>Soporte:</strong> En caso de problemas
                              técnicos o si olvidaste tu contraseña, solicitá
                              asistencia al administrador vía Discord.
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Middle Column: Scoring System */}
                    <div className="bg-slate-500/5 border border-border-color rounded-xl p-5 space-y-4">
                      <h4 className="font-bold text-sm text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        📊 Sistema de Puntajes
                      </h4>
                      <p className="text-xs text-text-secondary leading-relaxed">
                        Los puntos se asignan al finalizar cada partido según el
                        grado de acierto de tu pronóstico:
                      </p>

                      <div className="space-y-3 mt-3">
                        {/* Exact match */}
                        <div className="bg-white/5 dark:bg-slate-950/40 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-3">
                          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                            +5 PTS
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-text-primary">
                              Acierto Exacto
                            </h5>
                            <p className="text-[11px] text-text-muted mt-1 leading-normal">
                              Le pegás al resultado exacto del partido. <br />
                              <span className="font-mono text-indigo-400/90">
                                Ej: Pronóstico: 2 - 1 | Real: 2 - 1
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Goal difference */}
                        <div className="bg-white/5 dark:bg-slate-950/40 border border-indigo-500/20 rounded-xl p-3.5 flex items-start gap-3">
                          <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-500 text-xs font-black px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                            +3 PTS
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-text-primary">
                              Diferencia de Goles
                            </h5>
                            <p className="text-[11px] text-text-muted mt-1 leading-normal">
                              Acertás al ganador (o empate) y también la
                              diferencia de goles, pero no el marcador exacto.{" "}
                              <br />
                              <span className="font-mono text-indigo-400/90">
                                Ej: Pronóstico: 3 - 1 (+2 dif) | Real: 2 - 0 (+2
                                dif)
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Winner/Draw Outcome */}
                        <div className="bg-white/5 dark:bg-slate-950/40 border border-teal-500/20 rounded-xl p-3.5 flex items-start gap-3">
                          <div className="bg-teal-500/10 border border-teal-500/30 text-teal-500 text-xs font-black px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                            +2 PTS
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-text-primary">
                              Resultado / Ganador Únicamente
                            </h5>
                            <p className="text-[11px] text-text-muted mt-1 leading-normal">
                              Acertás quién gana (o el empate) pero con otra
                              cantidad de goles y diferente margen. <br />
                              <span className="font-mono text-indigo-400/90">
                                Ej: Pronóstico: 1 - 0 | Real: 3 - 1
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* No match */}
                        <div className="bg-white/5 dark:bg-slate-950/40 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-3">
                          <div className="bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-black px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                            0 PTS
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-text-primary">
                              Sin Aciertos
                            </h5>
                            <p className="text-[11px] text-text-muted mt-1 leading-normal">
                              No le pegás al ganador ni al empate.
                            </p>
                          </div>
                        </div>

                        {/* Penalty for missing prediction */}
                        <div className="bg-red-500/10 dark:bg-red-950/20 border border-red-500/35 rounded-xl p-3.5 flex items-start gap-3 animate-pulse">
                          <div className="bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-400 text-xs font-black px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0">
                            -1 PT
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-red-700 dark:text-red-400">
                              ⚠️ Penalización por No Participar
                            </h5>
                            <p className="text-[11px] text-red-600/90 dark:text-red-300/95 mt-1 leading-normal">
                              Si un partido finaliza y <strong>no cargaste ningún pronóstico</strong>, se te restará <strong>1 punto (-1)</strong> de tu puntaje general.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Prizes / Premios */}
                    <div className="bg-slate-500/5 border border-border-color rounded-xl p-5 space-y-4 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                          🎁 Premios del Torneo
                        </h4>
                        <p className="text-xs text-text-secondary leading-relaxed mb-4">
                          ¡Esforzate al máximo! Estos son los premios oficiales para los tres mejores de la tabla de posiciones:
                        </p>

                        <div className="space-y-4">
                          {/* 1st Place */}
                          <div className="relative bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/35 rounded-2xl p-4 flex items-start gap-3.5 shadow-md shadow-amber-500/5 overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
                            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
                            
                            <div className="bg-amber-500/20 border border-amber-500/40 text-amber-500 p-2 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                              <Trophy className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                                🥇 1º Puesto
                              </span>
                              <h5 className="text-sm font-black text-text-primary mt-0.5 leading-snug">
                                Cena para Dos + Medio Día Libre Motiv
                              </h5>
                              <p className="text-[10px] text-text-muted mt-1 leading-normal">
                                ¡El gran campeón se lleva una cena gourmet premium y medio día de descanso absoluto!
                              </p>
                            </div>
                          </div>

                          {/* 2nd Place */}
                          <div className="relative bg-gradient-to-br from-slate-400/15 to-slate-500/5 border border-slate-400/35 rounded-2xl p-4 flex items-start gap-3.5 shadow-md shadow-slate-400/5 overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
                            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-slate-400/10 rounded-full blur-xl pointer-events-none"></div>

                            <div className="bg-slate-400/20 border border-slate-400/40 text-slate-500 dark:text-slate-400 p-2 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                              <Medal className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                                🥈 2º Puesto
                              </span>
                              <h5 className="text-sm font-black text-text-primary mt-0.5 leading-snug">
                                Medio Día Libre Motiv
                              </h5>
                              <p className="text-[10px] text-text-muted mt-1 leading-normal">
                                ¡Un gran desempeño merece una buena tarde libre para relajarte!
                              </p>
                            </div>
                          </div>

                          {/* 3rd Place */}
                          <div className="relative bg-gradient-to-br from-amber-700/10 to-amber-800/5 border border-amber-800/30 rounded-2xl p-4 flex items-start gap-3.5 shadow-md shadow-amber-800/5 overflow-hidden group hover:scale-[1.02] transition-transform duration-200">
                            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-amber-800/10 rounded-full blur-xl pointer-events-none"></div>

                            <div className="bg-amber-800/20 border border-amber-800/40 text-amber-700 dark:text-amber-500 p-2 rounded-xl flex items-center justify-center shadow-inner shrink-0">
                              <Award className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest">
                                🥉 3º Puesto
                              </span>
                              <h5 className="text-sm font-black text-text-primary mt-0.5 leading-snug">
                                Mitad de Puntos en Motiv
                              </h5>
                              <p className="text-[10px] text-text-muted mt-1 leading-normal">
                                ¡Sumás la mitad de los puntos necesarios en Motiv para canjear por un medio día libre!
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer/Motivation Badge */}
                      <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-3.5 flex items-center gap-2.5 mt-4">
                        <span className="text-base">🔥</span>
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold leading-normal">
                          ¡No dejes de cargar tus pronósticos! Cada punto cuenta para subir al podio.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: BRACKET / LLAVES */}
            {activeTab === "groupStandings" && (() => {
              // ── helpers scoped to this tab ──────────────────────────────────
              const getWinnerCode = (matchId: string): string | null => {
                const m = matches.find(x => x.id === matchId);
                return m ? getMatchWinner(m) : null;
              };

              // R16 match cell — both teams stacked, flag + name + score
              const R16Cell = ({ matchId, mirrored }: { matchId: string; mirrored?: boolean }) => {
                const m = matches.find(x => x.id === matchId);
                if (!m) return (
                  <div className="w-44 shrink-0 rounded-lg border border-border-color bg-bg-card/40 px-2 py-1.5 text-center">
                    <span className="text-[10px] text-text-muted italic">{matchId}</span>
                  </div>
                );
                const winner = getMatchWinner(m);
                const teams = [
                  { code: m.homeTeam, score: m.homeScore, team: TEAMS.find(t => t.code === m.homeTeam) },
                  { code: m.awayTeam, score: m.awayScore, team: TEAMS.find(t => t.code === m.awayTeam) },
                ];

                return (
                  <div className="w-44 shrink-0 rounded-lg border border-border-color bg-bg-card/60 overflow-hidden backdrop-blur-sm">
                    <div className={`px-2 py-0.5 flex items-center justify-between ${mirrored ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">{matchId}</span>
                      {m.status === 'live' && <span className="text-[9px] font-bold text-red-400 animate-pulse">● VIVO</span>}
                      {m.status === 'finished' && <span className="text-[9px] font-bold text-emerald-500/70">FIN</span>}
                    </div>
                    {teams.map(({ code, score, team }, i) => {
                      const isWinner = winner === code;
                      const isLoser = !!winner && !isWinner;
                      return (
                        <div key={code} className={`flex items-center gap-1.5 px-2 py-1 ${i === 0 ? 'border-b border-border-color/40' : ''} ${isWinner ? 'bg-emerald-500/10' : ''} ${mirrored ? 'flex-row-reverse' : ''}`}>
                          <img
                            src={`https://flagcdn.com/w20/${code}.png`}
                            className="w-5 h-3.5 object-cover rounded-sm border border-border-color/50 shrink-0"
                            alt=""
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://flagcdn.com/w20/un.png'; }}
                          />
                          <span className={`text-[11px] font-semibold flex-1 truncate ${isWinner ? 'text-emerald-400' : isLoser ? 'text-text-muted' : 'text-text-primary'} ${mirrored ? 'text-right' : ''}`}>
                            {homeScoreReplacement(team?.name || code)}
                          </span>
                          {m.status !== 'scheduled' && (
                            <span className={`text-[11px] font-black shrink-0 ${isWinner ? 'text-emerald-400' : 'text-text-muted'}`}>
                              {score ?? '-'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              };

              // A single slot for rounds beyond R16 (Octavos / Cuartos / Semi / Final)
              const RoundSlot = ({
                teamCode,
                label,
                accent = 'indigo',
                mirrored,
                isChampion,
              }: {
                teamCode: string | null;
                label: string;
                accent?: 'indigo' | 'amber' | 'purple' | 'emerald';
                mirrored?: boolean;
                isChampion?: boolean;
              }) => {
                const team = teamCode ? TEAMS.find(t => t.code === teamCode) : null;
                const accentMap: Record<string, string> = {
                  indigo: 'border-indigo-500/30 bg-indigo-500/5',
                  amber: 'border-amber-400/40 bg-amber-500/5',
                  purple: 'border-purple-500/30 bg-purple-500/5',
                  emerald: 'border-emerald-500/40 bg-emerald-500/8',
                };
                const labelMap: Record<string, string> = {
                  indigo: 'text-indigo-400',
                  amber: 'text-amber-400',
                  purple: 'text-purple-400',
                  emerald: 'text-emerald-400',
                };
                return (
                  <div className={`w-36 shrink-0 rounded-lg border ${accentMap[accent]} px-2 py-2 backdrop-blur-sm`}>
                    <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 ${labelMap[accent]} ${mirrored ? 'text-right' : ''}`}>{label}</div>
                    {team ? (
                      <div className={`flex items-center gap-1.5 ${mirrored ? 'flex-row-reverse' : ''}`}>
                        <img
                          src={`https://flagcdn.com/w20/${team.code}.png`}
                          className="w-5 h-3.5 object-cover rounded-sm border border-border-color/50 shrink-0"
                          alt=""
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://flagcdn.com/w20/un.png'; }}
                        />
                        <span className={`text-[11px] font-bold truncate ${isChampion ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {homeScoreReplacement(team.name)}
                        </span>
                      </div>
                    ) : (
                      <div className={`text-[11px] text-text-muted italic ${mirrored ? 'text-right' : ''}`}>Por definir</div>
                    )}
                  </div>
                );
              };

              // Bracket connector — the "]" / "[" lines between rounds
              const Connector = ({ top, mirrored }: { top?: boolean; mirrored?: boolean }) => (
                <div className="w-4 shrink-0 self-stretch flex flex-col">
                  <div className={`flex-1 border-indigo-500/40 ${mirrored
                    ? top ? 'border-b border-l' : 'border-t border-l'
                    : top ? 'border-b border-r' : 'border-t border-r'
                  }`} />
                </div>
              );

              // A pair of R16 matches connected to their Octavos slot
              const R16Pair = ({
                matchIds,
                octWinner,
                mirrored,
              }: {
                matchIds: [string, string];
                octWinner: string | null;
                mirrored?: boolean;
              }) => {
                const octLabel = mirrored ? 'Octavos ←' : 'Octavos →';
                return (
                  <div className={`flex items-center gap-0 ${mirrored ? 'flex-row-reverse' : ''}`}>
                    {/* R16 matches stacked */}
                    <div className="flex flex-col gap-2">
                      <R16Cell matchId={matchIds[0]} mirrored={mirrored} />
                      <R16Cell matchId={matchIds[1]} mirrored={mirrored} />
                    </div>
                    {/* connectors to octavos */}
                    <div className={`flex flex-col self-stretch ${mirrored ? 'flex-row-reverse' : ''}`}>
                      <Connector top mirrored={mirrored} />
                      <Connector mirrored={mirrored} />
                    </div>
                    {/* octavos slot */}
                    <RoundSlot teamCode={octWinner} label={octLabel} accent="indigo" mirrored={mirrored} />
                  </div>
                );
              };

              // Build octavos winners (R16 winners advance to octavos)
              const octWinners = BRACKET_OCTAVOS.map(([m1, m2]) => {
                const w1 = getWinnerCode(m1);
                const w2 = getWinnerCode(m2);
                // Both must be determined for octavos match to exist
                return { w1, w2 };
              });

              // For bracket display: octavos match winner is tracked via a future match
              // For now we display the two R16 winners as the octavos participants
              // and leave cuartos/semi/final as "Por definir" (no octavos/cuartos matches yet)

              // Left side: indices 0-3 → upper block (0,1) + lower block (2,3)
              // Right side: indices 4-7 → upper block (4,5) + lower block (6,7)

              const BracketHalf = ({ indices, mirrored }: { indices: [number, number, number, number]; mirrored?: boolean }) => {
                const [i0, i1, i2, i3] = indices;
                const oct0Winner = octWinners[i0];
                const oct1Winner = octWinners[i1];
                const oct2Winner = octWinners[i2];
                const oct3Winner = octWinners[i3];

                const qfLabel = mirrored ? 'Cuartos ←' : 'Cuartos →';
                const sfLabel = mirrored ? 'Semi ←' : 'Semi →';

                return (
                  <div className={`flex items-center gap-0 ${mirrored ? 'flex-row-reverse' : ''}`}>
                    {/* Upper + Lower R16 pairs → Octavos → Cuartos → Semi */}
                    <div className="flex flex-col gap-3">
                      {/* Upper block */}
                      <div className="flex flex-col gap-2">
                        <R16Pair matchIds={BRACKET_OCTAVOS[i0]} octWinner={oct0Winner.w1 && oct0Winner.w2 ? null : (oct0Winner.w1 ?? oct0Winner.w2)} mirrored={mirrored} />
                        <R16Pair matchIds={BRACKET_OCTAVOS[i1]} octWinner={oct1Winner.w1 && oct1Winner.w2 ? null : (oct1Winner.w1 ?? oct1Winner.w2)} mirrored={mirrored} />
                      </div>
                      {/* Lower block */}
                      <div className="flex flex-col gap-2">
                        <R16Pair matchIds={BRACKET_OCTAVOS[i2]} octWinner={oct2Winner.w1 && oct2Winner.w2 ? null : (oct2Winner.w1 ?? oct2Winner.w2)} mirrored={mirrored} />
                        <R16Pair matchIds={BRACKET_OCTAVOS[i3]} octWinner={oct3Winner.w1 && oct3Winner.w2 ? null : (oct3Winner.w1 ?? oct3Winner.w2)} mirrored={mirrored} />
                      </div>
                    </div>

                    {/* Connectors upper+lower octavos → cuartos */}
                    <div className="flex flex-col self-stretch">
                      <Connector top mirrored={mirrored} />
                      <Connector mirrored={mirrored} />
                    </div>

                    {/* Cuartos column: 2 slots */}
                    <div className="flex flex-col gap-3 justify-around self-stretch py-4">
                      <RoundSlot teamCode={null} label={qfLabel} accent="amber" mirrored={mirrored} />
                      <RoundSlot teamCode={null} label={qfLabel} accent="amber" mirrored={mirrored} />
                    </div>

                    {/* Connectors cuartos → semi */}
                    <div className="flex flex-col self-stretch">
                      <Connector top mirrored={mirrored} />
                      <Connector mirrored={mirrored} />
                    </div>

                    {/* Semi */}
                    <div className="flex flex-col justify-center self-stretch py-4">
                      <RoundSlot teamCode={null} label={sfLabel} accent="purple" mirrored={mirrored} />
                    </div>

                    {/* Connector semi → final */}
                    <div className="w-4 shrink-0 self-stretch border-t-0 border-b-0">
                      <div className={`h-full ${mirrored ? 'border-l' : 'border-r'} border-indigo-500/40`} />
                    </div>
                  </div>
                );
              };

              return (
                <div className="relative left-1/2 -translate-x-1/2 w-screen">
                  {/* Mobile hint */}
                  <p className="lg:hidden text-xs text-text-muted text-center mb-3 italic px-4">
                    Deslizá para ver el cuadro completo →
                  </p>

                  {/* Bracket container — breaks out of max-w-7xl */}
                  <div className="overflow-x-auto pb-4 px-4">
                    <div className="mx-auto" style={{ width: 'fit-content' }}>
                      {/* Title */}
                      <div className="flex items-center justify-center gap-3 mb-6">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <h2 className="text-xl font-black text-text-primary uppercase tracking-wider">Llaves del Mundial 2026</h2>
                        <Trophy className="w-6 h-6 text-amber-400" />
                      </div>

                      {/* Main bracket */}
                      <div className="flex items-center justify-center gap-0">
                        {/* Left bracket */}
                        <BracketHalf indices={[0, 1, 2, 3]} />

                        {/* Final */}
                        <div className="flex flex-col items-center justify-center px-2 self-stretch py-4">
                          <div className="w-36 shrink-0 rounded-xl border-2 border-amber-400/50 bg-amber-500/8 backdrop-blur-sm px-3 py-3 text-center shadow-lg shadow-amber-500/10">
                            <div className="flex items-center justify-center gap-1.5 mb-2">
                              <Trophy className="w-4 h-4 text-amber-400" />
                              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Final</span>
                            </div>
                            <div className="border-t border-amber-400/20 pt-2 mb-1.5">
                              <div className="text-[11px] text-text-muted italic">Por definir</div>
                            </div>
                            <div className="text-[10px] text-text-muted">vs</div>
                            <div className="mt-1.5">
                              <div className="text-[11px] text-text-muted italic">Por definir</div>
                            </div>
                          </div>
                        </div>

                        {/* Right bracket */}
                        <BracketHalf indices={[4, 5, 6, 7]} mirrored />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB: LEADERBOARD */}
            {activeTab === "leaderboard" && (
              <div className={`${CARD_STYLE} overflow-hidden`}>
                {/* Header Table Search */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-border-color pb-4">
                  <div>
                    <h3 className="text-lg font-black text-text-primary">
                      Ranking de la Oficina
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      Competencia entre los 40 empleados
                    </p>
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
                        <th className="py-3 px-4 text-center hidden md:table-cell">
                          Acierto Exacto
                        </th>
                        <th className="py-3 px-4 text-center hidden md:table-cell">
                          Dif. Goles
                        </th>
                        <th className="py-3 px-4 text-center hidden md:table-cell">
                          Resultado
                        </th>
                        <th className="py-3 px-4 text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color/40">
                      {leaderboard
                        .filter((row) =>
                          row.user.name
                            .toLowerCase()
                            .includes(searchQuery.toLowerCase()),
                        )
                        .map((row, index) => {
                          const isCurrentUser = row.user.id === currentUser.id;
                          const rank = index + 1;

                          return (
                            <tr
                              key={row.user.id}
                              onClick={() => setSelectedUser(row.user)}
                              className={`group cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/30 transition-colors ${
                                isCurrentUser
                                  ? "bg-indigo-500/10 border-l-2 border-l-indigo-500"
                                  : ""
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
                                  <span className="text-slate-500 dark:text-slate-400 text-sm">
                                    {rank}
                                  </span>
                                )}
                              </td>

                              {/* Employee name / Avatar */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getAvatarColor(row.user.name)} flex items-center justify-center font-bold text-white text-xs shadow-sm`}
                                  >
                                    {row.user.name.charAt(0)}
                                  </div>
                                  <div>
                                    <span
                                      className={`text-sm font-bold block ${isCurrentUser ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-slate-100"}`}
                                    >
                                      {row.user.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                                      @{row.user.username}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Predicted counts */}
                              <td className="py-3.5 px-4 text-center text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
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
            {activeTab === "admin" && currentUser.role === "admin" && (
              <div className="space-y-6">
                <div
                  className={`${CARD_STYLE} bg-amber-500/10 border border-amber-500/25`}
                >
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-500" />
                    <div>
                      <h3 className="text-md font-bold text-amber-700 dark:text-amber-400">
                        Consola de Control de Resultados
                      </h3>
                      <p className="text-xs text-text-secondary">
                        Como Administrador podés simular o cargar los resultados
                        reales del mundial. Al cargar los marcadores reales y
                        marcar el estado como "Finalizado", el sistema
                        recalculará instantáneamente los puntajes de los 40
                        empleados.
                      </p>
                    </div>
                  </div>
                </div>

                <div className={`${CARD_STYLE}`}>
                  <h3 className="text-lg font-black text-text-primary mb-6">
                    Cargar Resultados Reales
                  </h3>

                  <div className="divide-y divide-border-color/50 space-y-4">
                    {matches.filter((match) => match.homeScore === null || match.awayScore === null).map((match) => {
                      const homeTeam = TEAMS.find(
                        (t) => t.code === match.homeTeam,
                      );
                      const awayTeam = TEAMS.find(
                        (t) => t.code === match.awayTeam,
                      );

                      const editState = adminEdits[match.id] || {
                        homeScore:
                          match.homeScore !== null
                            ? match.homeScore.toString()
                            : "",
                        awayScore:
                          match.awayScore !== null
                            ? match.awayScore.toString()
                            : "",
                        status: match.status,
                        penaltyWinner: match.penaltyWinner ?? undefined,
                      };

                      return (
                        <div
                          key={match.id}
                          className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4"
                        >
                          {/* Match Info */}
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-mono text-xs text-text-muted font-bold bg-bg-input px-2 py-1 rounded border border-border-color">
                              {match.id}
                            </span>
                            <div className="flex items-center gap-2">
                              <img
                                src={`https://flagcdn.com/w40/${match.homeTeam}.png`}
                                className="w-6 h-4 object-cover rounded"
                                alt=""
                              />
                              <span className="font-bold text-sm text-text-secondary">
                                {homeScoreReplacement(
                                  homeTeam?.name || match.homeTeam,
                                )}
                              </span>
                              <span className="text-text-muted text-xs">
                                vs
                              </span>
                              <img
                                src={`https://flagcdn.com/w40/${match.awayTeam}.png`}
                                className="w-6 h-4 object-cover rounded"
                                alt=""
                              />
                              <span className="font-bold text-sm text-text-secondary">
                                {homeScoreReplacement(
                                  awayTeam?.name || match.awayTeam,
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Form inputs & status */}
                          {(() => {
                            const isFinished = match.status === "finished";
                            const isEditing = !isFinished || !!editingFinishedMatches[match.id];
                            
                            return (
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    placeholder="Goles"
                                    value={editState.homeScore}
                                    disabled={!isEditing}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const newHome = parseInt(val);
                                      const currentAway = parseInt(editState.awayScore);
                                      const scoresDiverge = !isNaN(newHome) && !isNaN(currentAway) && newHome !== currentAway;
                                      setAdminEdits((prev) => ({
                                        ...prev,
                                        [match.id]: {
                                          ...(prev[match.id] || {
                                            homeScore: "",
                                            awayScore: editState.awayScore,
                                            status: editState.status,
                                          }),
                                          homeScore: val,
                                          penaltyWinner: scoresDiverge ? null : prev[match.id]?.penaltyWinner,
                                        },
                                      }));
                                    }}
                                    className="w-14 h-9 text-center bg-bg-input border border-border-color rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-amber-500 placeholder:text-[9px] placeholder:text-center placeholder:font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span className="text-text-muted">:</span>
                                  <input
                                    type="number"
                                    placeholder="Goles"
                                    value={editState.awayScore}
                                    disabled={!isEditing}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const newAway = parseInt(val);
                                      const currentHome = parseInt(editState.homeScore);
                                      const scoresDiverge = !isNaN(newAway) && !isNaN(currentHome) && currentHome !== newAway;
                                      setAdminEdits((prev) => ({
                                        ...prev,
                                        [match.id]: {
                                          ...(prev[match.id] || {
                                            homeScore: editState.homeScore,
                                            awayScore: "",
                                            status: editState.status,
                                          }),
                                          awayScore: val,
                                          penaltyWinner: scoresDiverge ? null : prev[match.id]?.penaltyWinner,
                                        },
                                      }));
                                    }}
                                    className="w-14 h-9 text-center bg-bg-input border border-border-color rounded-lg text-sm font-bold text-text-primary focus:outline-none focus:border-amber-500 placeholder:text-[9px] placeholder:text-center placeholder:font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                </div>

                                {/* Penalty radio for admin — knockout draw only */}
                                {isEditing && !GROUP_CODES.includes(match.group) &&
                                  editState.homeScore !== "" && editState.awayScore !== "" &&
                                  parseInt(editState.homeScore) === parseInt(editState.awayScore) &&
                                  !isNaN(parseInt(editState.homeScore)) && (
                                  <div className="flex flex-col items-center gap-1">
                                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                      Penales
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`penalty-admin-${match.id}`}
                                          value="home"
                                          checked={editState.penaltyWinner === 'home'}
                                          onChange={() => setAdminEdits((prev) => ({
                                            ...prev,
                                            [match.id]: { ...(prev[match.id] || { homeScore: editState.homeScore, awayScore: editState.awayScore, status: editState.status }), penaltyWinner: 'home' },
                                          }))}
                                          className="accent-amber-500"
                                        />
                                        <span className="text-[10px] font-bold text-text-secondary">{homeTeam?.name || match.homeTeam}</span>
                                      </label>
                                      <label className="flex items-center gap-1 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`penalty-admin-${match.id}`}
                                          value="away"
                                          checked={editState.penaltyWinner === 'away'}
                                          onChange={() => setAdminEdits((prev) => ({
                                            ...prev,
                                            [match.id]: { ...(prev[match.id] || { homeScore: editState.homeScore, awayScore: editState.awayScore, status: editState.status }), penaltyWinner: 'away' },
                                          }))}
                                          className="accent-amber-500"
                                        />
                                        <span className="text-[10px] font-bold text-text-secondary">{awayTeam?.name || match.awayTeam}</span>
                                      </label>
                                    </div>
                                  </div>
                                )}

                                {/* Status selector */}
                                <select
                                  value={editState.status}
                                  disabled={!isEditing}
                                  onChange={(e) => {
                                    const val = e.target.value as Match["status"];
                                    setAdminEdits((prev) => ({
                                      ...prev,
                                      [match.id]: {
                                        ...(prev[match.id] || {
                                          homeScore: editState.homeScore,
                                          awayScore: editState.awayScore,
                                          status: "scheduled",
                                        }),
                                        status: val,
                                      },
                                    }));
                                  }}
                                  className="bg-bg-input border border-border-color rounded-lg text-xs font-bold px-2.5 py-1.5 focus:outline-none text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="scheduled">Pendiente</option>
                                  <option value="live">En Vivo</option>
                                  <option value="finished">Finalizado</option>
                                </select>

                                {/* Action Save/Edit */}
                                {isFinished ? (
                                  !editingFinishedMatches[match.id] ? (
                                    <button
                                      type="button"
                                      onClick={() => setEditingFinishedMatches((prev) => ({ ...prev, [match.id]: true }))}
                                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all active:scale-98 cursor-pointer flex items-center gap-1 shadow-sm"
                                    >
                                      Editar
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      {adminEdits[match.id] && (() => {
                                        const adminIsKnockout = !GROUP_CODES.includes(match.group);
                                        const adminHomeScore = parseInt(editState.homeScore);
                                        const adminAwayScore = parseInt(editState.awayScore);
                                        const adminIsKnockoutDraw = adminIsKnockout && !isNaN(adminHomeScore) && !isNaN(adminAwayScore) && adminHomeScore === adminAwayScore;
                                        const adminPenaltySelected = !!editState.penaltyWinner;
                                        const adminSaveDisabled = adminIsKnockoutDraw && !adminPenaltySelected;
                                        return (
                                          <button
                                            onClick={() => saveMatchResult(match.id)}
                                            disabled={adminSaveDisabled}
                                            className={`px-3 py-1.5 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-sm ${
                                              adminSaveDisabled
                                                ? "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60"
                                                : "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer active:scale-98"
                                            }`}
                                          >
                                            <Check className="w-3.5 h-3.5" /> Guardar
                                          </button>
                                        );
                                      })()}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setAdminEdits((prev) => {
                                            const copy = { ...prev };
                                            delete copy[match.id];
                                            return copy;
                                          });
                                          setEditingFinishedMatches((prev) => {
                                            const copy = { ...prev };
                                            delete copy[match.id];
                                            return copy;
                                          });
                                        }}
                                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg text-xs transition-all active:scale-98 cursor-pointer flex items-center gap-1 shadow-sm"
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  )
                                ) : (
                                  adminEdits[match.id] && (() => {
                                    const adminIsKnockout = !GROUP_CODES.includes(match.group);
                                    const adminHomeScore = parseInt(editState.homeScore);
                                    const adminAwayScore = parseInt(editState.awayScore);
                                    const adminIsKnockoutDraw = adminIsKnockout && !isNaN(adminHomeScore) && !isNaN(adminAwayScore) && adminHomeScore === adminAwayScore;
                                    const adminPenaltySelected = !!editState.penaltyWinner;
                                    const adminSaveDisabled = adminIsKnockoutDraw && !adminPenaltySelected;
                                    return (
                                      <button
                                        onClick={() => saveMatchResult(match.id)}
                                        disabled={adminSaveDisabled}
                                        className={`px-3 py-1.5 font-bold rounded-lg text-xs transition-all flex items-center gap-1 shadow-sm ${
                                          adminSaveDisabled
                                            ? "bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-60"
                                            : "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer active:scale-98"
                                        }`}
                                      >
                                        <Check className="w-3.5 h-3.5" /> Guardar
                                      </button>
                                    );
                                  })()
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`${CARD_STYLE}`}>
                  <h3 className="text-lg font-black text-text-primary mb-6">
                    Editar Fecha y Hora de Próximos Partidos
                  </h3>

                  <div className="divide-y divide-border-color/50 space-y-4">
                    {matches.filter(m => m.status === 'scheduled').map((match) => {
                      const homeTeam = TEAMS.find((t) => t.code === match.homeTeam);
                      const awayTeam = TEAMS.find((t) => t.code === match.awayTeam);
                      
                      const dateObj = new Date(match.date);
                      // Format to local datetime string for input YYYY-MM-DDTHH:mm
                      const tzOffset = dateObj.getTimezoneOffset() * 60000;
                      const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
                      
                      const editState = adminDateEdits[match.id] || localISOTime;
                      const isEditing = !!editingDateMatches[match.id];

                      return (
                        <div
                          key={`date-${match.id}`}
                          className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="font-mono text-xs text-text-muted font-bold bg-bg-input px-2 py-1 rounded border border-border-color">
                              {match.id}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-text-secondary">
                                {homeScoreReplacement(homeTeam?.name || match.homeTeam)}
                              </span>
                              <span className="text-text-muted text-xs">vs</span>
                              <span className="font-bold text-sm text-text-secondary">
                                {homeScoreReplacement(awayTeam?.name || match.awayTeam)}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <input
                              type="datetime-local"
                              value={editState}
                              disabled={!isEditing}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAdminDateEdits((prev) => ({
                                  ...prev,
                                  [match.id]: val,
                                }));
                              }}
                              className="bg-bg-input border border-border-color rounded-lg text-sm font-bold text-text-primary focus:outline-none px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            />

                            {!isEditing ? (
                              <button
                                type="button"
                                onClick={() => setEditingDateMatches((prev) => ({ ...prev, [match.id]: true }))}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition-all active:scale-98 cursor-pointer flex items-center gap-1 shadow-sm"
                              >
                                Editar Fecha
                              </button>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => saveMatchDate(match.id)}
                                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition-all active:scale-98 cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" /> Guardar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAdminDateEdits((prev) => {
                                      const copy = { ...prev };
                                      delete copy[match.id];
                                      return copy;
                                    });
                                    setEditingDateMatches((prev) => {
                                      const copy = { ...prev };
                                      delete copy[match.id];
                                      return copy;
                                    });
                                  }}
                                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg text-xs transition-all active:scale-98 cursor-pointer flex items-center gap-1 shadow-sm"
                                >
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className={`${CARD_STYLE} border-red-500/20 shadow-red-500/5`}>
                  <h3 className="text-lg font-black text-red-500 mb-2">
                    Acciones de Mantenimiento / Reseteo
                  </h3>
                  <p className="text-xs text-text-secondary mb-6">
                    Opciones de control para reiniciar datos del sistema.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={handleClearPredictions}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all active:scale-98 cursor-pointer shadow-md"
                      title="Elimina todos los pronósticos creados por los empleados, dejando sus puntajes en 0."
                    >
                      Resetear Puntajes de Participantes (Borrar Pronósticos)
                    </button>
                    <button
                      onClick={handleResetMatches}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-xs transition-all active:scale-98 cursor-pointer shadow-md"
                      title="Restablece los marcadores reales de los partidos a pendientes sin goles cargados."
                    >
                      Restablecer Partidos Reales (Poner todos a Pendiente)
                    </button>
                    <button
                      onClick={handleDownloadBackup}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition-all active:scale-98 cursor-pointer shadow-md"
                      title="Descargar copia de seguridad en formato JSON de usuarios, partidos y pronósticos."
                    >
                      Descargar Backup JSON
                    </button>
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
                <div
                  className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarColor(selectedUser.name)} flex items-center justify-center font-bold text-white text-sm shadow-md`}
                >
                  {selectedUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-text-primary">
                    {selectedUser.name}
                  </h3>
                  <span className="text-xs text-text-muted font-mono">
                    @{selectedUser.username}
                  </span>
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
            <div className="p-6 overflow-y-auto space-y-4 flex-1" id="predictions-modal-scroll">
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">
                Historial de Predicciones
              </h4>

              <div className="space-y-3">
                {(() => {
                  let foundFirstPending = false;
                  return [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((match) => {
                  const homeTeam = TEAMS.find((t) => t.code === match.homeTeam);
                  const awayTeam = TEAMS.find((t) => t.code === match.awayTeam);
                  const userPred = predictions[selectedUser.id]?.[match.id];
                  const isFirstPending = !foundFirstPending && match.status !== "finished";
                  if (isFirstPending) foundFirstPending = true;

                  const pointsEarned =
                    match.status === "finished"
                      ? userPred
                        ? calculatePoints(match, userPred)
                        : { points: new Date(match.date) >= new Date("2026-06-16T00:00:00-03:00") ? -1 : 0, type: "none" as const }
                      : null;

                  const isMatchStartedPlus1Min = new Date().getTime() >= new Date(match.date).getTime() + 60 * 1000;
                  const isOwnPrediction = selectedUser.id === currentUser?.id;
                  const canSeePrediction = isOwnPrediction || isMatchStartedPlus1Min;

                  return (
                    <div
                      key={match.id}
                      data-first-pending={isFirstPending ? "true" : undefined}
                      className="bg-bg-input border border-border-color rounded-xl p-3.5 flex items-center justify-between gap-4"
                    >
                      {/* Teams Info */}
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img
                          src={`https://flagcdn.com/w40/${match.homeTeam}.png`}
                          className="w-6 h-4 object-cover rounded"
                          alt=""
                        />
                        <span className="font-bold text-xs text-text-secondary truncate">
                          {homeScoreReplacement(
                            homeTeam?.name || match.homeTeam,
                          )}
                        </span>
                        <span className="text-text-muted text-[10px]">vs</span>
                        <img
                          src={`https://flagcdn.com/w40/${match.awayTeam}.png`}
                          className="w-6 h-4 object-cover rounded"
                          alt=""
                        />
                        <span className="font-bold text-xs text-text-secondary truncate">
                          {homeScoreReplacement(
                            awayTeam?.name || match.awayTeam,
                          )}
                        </span>
                      </div>

                      {/* Predictions vs Actual Real Results */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-text-muted uppercase">
                            Predijo
                          </span>
                          {canSeePrediction ? (
                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/20 mt-0.5">
                              {userPred
                                ? `${userPred.homeScore} - ${userPred.awayScore}`
                                : "-"}
                            </span>
                          ) : (
                            <span
                              className="font-semibold text-[10px] text-text-muted bg-slate-500/10 px-2 py-0.5 rounded-md border border-slate-500/20 mt-0.5 select-none"
                              title="Las predicciones de tus compañeros se revelan 1 minuto después del comienzo del partido"
                            >
                              {userPred ? "🔒 Oculto" : "-"}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-center">
                          <span className="text-[8px] font-bold text-text-muted uppercase">
                            Real
                          </span>
                          <span className="font-mono text-xs font-bold text-text-primary bg-bg-card px-2 py-0.5 rounded-md border border-border-color mt-0.5">
                            {match.homeScore !== null
                              ? `${match.homeScore} - ${match.awayScore}`
                              : "Pte"}
                          </span>
                        </div>

                        {/* Points badge */}
                        <div className="w-16 flex justify-end">
                          {pointsEarned ? (
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold text-center w-full block ${
                                pointsEarned.points === 5
                                  ? "bg-amber-500/15 border border-amber-500/20 text-amber-600 dark:text-amber-400"
                                  : pointsEarned.points === 3
                                    ? "bg-indigo-500/15 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                                    : pointsEarned.points === 2
                                      ? "bg-teal-500/15 border border-teal-500/20 text-teal-600 dark:text-teal-400"
                                      : pointsEarned.points === -1
                                        ? "bg-rose-500/15 border border-rose-500/20 text-rose-600 dark:text-rose-400"
                                        : "bg-slate-100 dark:bg-slate-900 text-text-muted border border-border-color"
                              }`}
                            >
                              {pointsEarned.points > 0
                                ? `+${pointsEarned.points} pts`
                                : pointsEarned.points === -1
                                  ? "-1 pt"
                                  : "0 pts"}
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">
                              Pendiente
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
                })()}
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

      {/* Custom Error Modal */}
      {errorModalMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-bg-card border border-border-color rounded-3xl max-w-sm w-full p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full flex items-center justify-center text-xl mb-4 animate-bounce">
              ⚠️
            </div>
            <h3 className="font-extrabold text-lg text-text-primary mb-2">
              Atención
            </h3>
            <p className="text-text-secondary text-sm mb-6">{errorModalMsg}</p>
            <button
              onClick={() => {
                if (errorModalMsg?.includes("deslogueate")) {
                  handleLogout();
                }
                setErrorModalMsg(null);
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 hover:shadow-indigo-500/30 cursor-pointer text-sm"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

      {/* Custom Penalty Warning Modal */}
      {currentUser && showPenaltyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-rose-500/30 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500"></div>
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-full flex items-center justify-center text-2xl mb-4 animate-pulse">
              ⚠️
            </div>
            <h3 className="font-extrabold text-xl text-rose-600 dark:text-rose-400 mb-3">
              ¡Penalización por No Participar!
            </h3>
            <p className="text-text-primary text-sm font-semibold mb-4 leading-relaxed">
              Hola, <span className="text-indigo-500">{currentUser.name}</span>. Para asegurar que todos participen de manera justa, se ha implementado una nueva regla:
            </p>
            <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-text-secondary leading-relaxed">
                Si un partido finaliza y <strong>no cargaste ningún pronóstico</strong>, se te penalizará restando <strong>1 punto (-1)</strong> del acumulado general.
              </p>
              <p className="text-xs text-rose-500 font-bold mt-2">
                ¡No te olvides de guardar tus pronósticos antes de cada partido!
              </p>
            </div>
            <button
              onClick={() => {
                localStorage.setItem(`prode_seen_penalty_warning_${currentUser.id}`, "true");
                setShowPenaltyModal(false);
              }}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-rose-600/20 hover:shadow-rose-500/30 active:scale-95 cursor-pointer text-sm"
            >
              ¡Entendido, voy a pronosticar!
            </button>
          </div>
        </div>
      )}
      {/* Stat Details Modal */}
      {activeStatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-bg-card border border-border-color rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-border-color flex justify-between items-center bg-bg-input">
              <h3 className="font-extrabold text-xl text-text-primary capitalize flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                Detalle de {activeStatModal === "exacto" ? "Acierto Exacto" : activeStatModal === "diferencia" ? "Diferencia de Goles" : activeStatModal}
              </h3>
              <button
                onClick={() => setActiveStatModal(null)}
                className="text-text-muted hover:text-text-primary p-2 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 md:p-6 bg-bg-primary flex-1">
              <div className="space-y-3">
                {statMatches && statMatches.length > 0 ? (
                  statMatches.map(({ match, pred, points }) => {
                    const homeTeam = TEAMS.find(t => t.code === match.homeTeam);
                    const awayTeam = TEAMS.find(t => t.code === match.awayTeam);
                    return (
                      <div key={match.id} className="bg-bg-card border border-border-color rounded-2xl p-4 flex flex-col items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row items-center justify-between w-full gap-4">
                          <div className="flex flex-col flex-1 items-center md:items-start w-full">
                            <div className="flex items-center justify-center md:justify-start gap-4 w-full">
                              <div className="flex flex-col items-end w-24">
                                <span className="text-sm font-bold text-text-primary text-right">{homeTeam?.name}</span>
                              </div>
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-bg-input rounded-lg border border-border-color shrink-0">
                                <span className="font-bold w-4 text-center text-text-primary">{match.homeScore !== null ? match.homeScore : "-"}</span>
                                <span className="text-text-muted text-xs">vs</span>
                                <span className="font-bold w-4 text-center text-text-primary">{match.awayScore !== null ? match.awayScore : "-"}</span>
                              </div>
                              <div className="flex flex-col items-start w-24">
                                <span className="text-sm font-bold text-text-primary text-left">{awayTeam?.name}</span>
                              </div>
                            </div>
                            {/* Fecha y cuenta regresiva */}
                            <div className="mt-2 text-center md:text-left w-full flex flex-col items-center md:items-center">
                              <span className="text-xs text-text-muted font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(match.date).toLocaleString("es-AR", {
                                  timeZone: "America/Argentina/Buenos_Aires",
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })} hs
                              </span>
                              {match.status === "scheduled" && (
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-md mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {(() => {
                                    const diff = new Date(match.date).getTime() - new Date().getTime();
                                    if (diff <= 0) return "En juego";
                                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                                    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                                    if (days > 0) return `Faltan ${days} d ${hours} hs`;
                                    const mins = Math.floor((diff / (1000 * 60)) % 60);
                                    if (hours > 0) return `Faltan ${hours} hs ${mins} min`;
                                    return `Faltan ${mins} minutos`;
                                  })()}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col md:flex-row items-center gap-4 shrink-0 bg-bg-primary p-3 rounded-xl border border-border-color w-full md:w-auto justify-center">
                            {match.status === "scheduled" ? (
                              <div className="flex flex-col items-center gap-2">
                                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block mb-0.5">Tú Prons.</span>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    className="w-12 h-10 text-center bg-bg-input border border-border-color rounded-xl text-lg font-black focus:ring-2 focus:ring-indigo-500 transition-all text-text-primary"
                                    value={predEdits[match.id]?.homeScore ?? pred?.homeScore ?? ""}
                                    onChange={(e) =>
                                      setPredEdits((prev) => ({
                                        ...prev,
                                        [match.id]: {
                                          ...prev[match.id],
                                          homeScore: e.target.value,
                                          awayScore: prev[match.id]?.awayScore ?? pred?.awayScore?.toString() ?? "",
                                        },
                                      }))
                                    }
                                  />
                                  <span className="text-text-muted font-black">-</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    className="w-12 h-10 text-center bg-bg-input border border-border-color rounded-xl text-lg font-black focus:ring-2 focus:ring-indigo-500 transition-all text-text-primary"
                                    value={predEdits[match.id]?.awayScore ?? pred?.awayScore ?? ""}
                                    onChange={(e) =>
                                      setPredEdits((prev) => ({
                                        ...prev,
                                        [match.id]: {
                                          ...prev[match.id],
                                          awayScore: e.target.value,
                                          homeScore: prev[match.id]?.homeScore ?? pred?.homeScore?.toString() ?? "",
                                        },
                                      }))
                                    }
                                  />
                                </div>
                                <button
                                  onClick={() => savePrediction(match.id)}
                                  disabled={
                                    !predEdits[match.id]?.homeScore ||
                                    !predEdits[match.id]?.awayScore
                                  }
                                  className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                                >
                                  <Save className="w-3 h-3" /> Guardar
                                </button>
                              </div>
                            ) : (
                              <>
                                <div className="text-center min-w-[70px]">
                                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block mb-0.5">Tú Prons.</span>
                                  {pred ? (
                                    <span className="font-mono text-sm font-bold text-indigo-500">
                                      {pred.homeScore} - {pred.awayScore}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-rose-500">Pendiente</span>
                                  )}
                                </div>
                                {activeStatModal !== "pronosticados" && (
                                  <div className="text-center pl-4 border-l border-border-color min-w-[60px]">
                                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block mb-0.5">Puntos</span>
                                    <span className={`font-black text-lg ${points === 5 ? "text-amber-500" : points === 3 ? "text-indigo-500" : points === 2 ? "text-teal-500" : "text-text-muted"}`}>
                                      +{points}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-text-muted">
                    <div className="text-4xl mb-2">🤷‍♂️</div>
                    <p className="font-semibold">No hay partidos para mostrar en esta categoría.</p>
                  </div>
                )}
              </div>
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
    "Bosnia y Herzegovina": "Bosnia",
    "Estados Unidos": "EE.UU.",
    "Costa de Marfil": "C. Marfil",
    "Corea del Sur": "Corea Sur",
    "Arabia Saudita": "A. Saudita",
    "República Checa": "Chequia",
    "Nueva Zelanda": "N. Zelanda",
    "Países Bajos": "Holanda",
  };
  return replacements[name] || name;
}
