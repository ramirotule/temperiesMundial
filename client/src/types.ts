export interface Team {
  code: string; // ISO 2-letter code, e.g., 'ar', 'br', 'mx'
  name: string;
  group: string;
}

export interface Match {
  id: string;
  homeTeam: string; // Team code
  awayTeam: string; // Team code
  date: string; // ISO date string or formatted date
  group: string;
  homeScore: number | null; // Real score
  awayScore: number | null; // Real score
  stadium: string;
  status: 'scheduled' | 'live' | 'finished';
}

export interface Prediction {
  homeScore: number;
  awayScore: number;
  createdAt: string;
  isBlocked?: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'user';
  avatarSeed: string; // For generating a nice UI avatar
  password?: string; // User password
}

export interface UserState {
  points: number;
  exactMatches: number;
  outcomeMatches: number;
  diffMatches: number;
  predictionsCount: number;
}

export interface TeamStanding {
  teamCode: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  status: "qualified" | "eliminated" | "in_play" | "scheduled";
}
