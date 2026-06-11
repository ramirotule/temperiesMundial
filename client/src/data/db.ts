import type { Team, Match, User } from '../types';

export const TEAMS: Team[] = [
  // Group A
  { name: 'México', code: 'mx', group: 'A' },
  { name: 'Sudáfrica', code: 'za', group: 'A' },
  { name: 'Corea del Sur', code: 'kr', group: 'A' },
  { name: 'Chequia', code: 'cz', group: 'A' },
  // Group B
  { name: 'Canadá', code: 'ca', group: 'B' },
  { name: 'Bosnia y Herzegovina', code: 'ba', group: 'B' },
  { name: 'Catar', code: 'qa', group: 'B' },
  { name: 'Suiza', code: 'ch', group: 'B' },
  // Group C
  { name: 'Brasil', code: 'br', group: 'C' },
  { name: 'Marruecos', code: 'ma', group: 'C' },
  { name: 'Haití', code: 'ht', group: 'C' },
  { name: 'Escocia', code: 'gb-sct', group: 'C' },
  // Group D
  { name: 'Estados Unidos', code: 'us', group: 'D' },
  { name: 'Paraguay', code: 'py', group: 'D' },
  { name: 'Australia', code: 'au', group: 'D' },
  { name: 'Turquía', code: 'tr', group: 'D' },
  // Group E
  { name: 'Alemania', code: 'de', group: 'E' },
  { name: 'Curazao', code: 'cw', group: 'E' },
  { name: 'Costa de Marfil', code: 'ci', group: 'E' },
  { name: 'Ecuador', code: 'ec', group: 'E' },
  // Group F
  { name: 'Países Bajos', code: 'nl', group: 'F' },
  { name: 'Japón', code: 'jp', group: 'F' },
  { name: 'Suecia', code: 'se', group: 'F' },
  { name: 'Túnez', code: 'tn', group: 'F' },
  // Group G
  { name: 'Bélgica', code: 'be', group: 'G' },
  { name: 'Egipto', code: 'eg', group: 'G' },
  { name: 'Irán', code: 'ir', group: 'G' },
  { name: 'Nueva Zelanda', code: 'nz', group: 'G' },
  // Group H
  { name: 'España', code: 'es', group: 'H' },
  { name: 'Cabo Verde', code: 'cv', group: 'H' },
  { name: 'Arabia Saudita', code: 'sa', group: 'H' },
  { name: 'Uruguay', code: 'uy', group: 'H' },
  // Group I
  { name: 'Francia', code: 'fr', group: 'I' },
  { name: 'Senegal', code: 'sn', group: 'I' },
  { name: 'Irak', code: 'iq', group: 'I' },
  { name: 'Noruega', code: 'no', group: 'I' },
  // Group J
  { name: 'Argentina', code: 'ar', group: 'J' },
  { name: 'Argelia', code: 'dz', group: 'J' },
  { name: 'Austria', code: 'at', group: 'J' },
  { name: 'Jordania', code: 'jo', group: 'J' },
  // Group K
  { name: 'Portugal', code: 'pt', group: 'K' },
  { name: 'RD Congo', code: 'cd', group: 'K' },
  { name: 'Uzbekistán', code: 'uz', group: 'K' },
  { name: 'Colombia', code: 'co', group: 'K' },
  // Group L
  { name: 'Inglaterra', code: 'gb-eng', group: 'L' },
  { name: 'Croacia', code: 'hr', group: 'L' },
  { name: 'Ghana', code: 'gh', group: 'L' },
  { name: 'Panamá', code: 'pa', group: 'L' },
];

export const STADIUMS = [
  'Estadio Azteca, CDMX',
  'Estadio BBVA, Monterrey',
  'Estadio Akron, Guadalajara',
  'MetLife Stadium, NY/NJ',
  'SoFi Stadium, Los Ángeles',
  'AT&T Stadium, Dallas',
  'Mercedes-Benz Stadium, Atlanta',
  'Hard Rock Stadium, Miami',
  'Lumen Field, Seattle',
  'Levi\'s Stadium, San Francisco',
  'BC Place, Vancouver',
  'BMO Field, Toronto'
];

// Generate matches programmatically
export function generateMatches(): Match[] {
  const matches: Match[] = [];
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  
  // Starting date is June 11, 2026.
  // 12 groups, 6 matches per group = 72 matches.
  // We'll spread them over 16 days (June 11 to June 26), 4 or 5 matches per day.
  let matchIndex = 1;
  
  groups.forEach((groupChar) => {
    const groupTeams = TEAMS.filter(t => t.group === groupChar);
    if (groupTeams.length < 4) return;
    
    // Standard round robin pairing for 4 teams
    const pairings = [
      { home: groupTeams[0], away: groupTeams[1], round: 1 },
      { home: groupTeams[2], away: groupTeams[3], round: 1 },
      { home: groupTeams[0], away: groupTeams[2], round: 2 },
      { home: groupTeams[1], away: groupTeams[3], round: 2 },
      { home: groupTeams[0], away: groupTeams[3], round: 3 },
      { home: groupTeams[1], away: groupTeams[2], round: 3 },
    ];
    
    pairings.forEach((pair, idx) => {
      // Calculate date offset based on group and round to stagger the matches
      // Round 1: Days 0-4 (June 11 - June 15)
      // Round 2: Days 5-9 (June 16 - June 20)
      // Round 3: Days 10-14 (June 21 - June 25)
      let dayOffset = 0;
      if (pair.round === 1) {
        dayOffset = groups.indexOf(groupChar);
      } else if (pair.round === 2) {
        dayOffset = 12 + groups.indexOf(groupChar);
      } else {
        dayOffset = 24 + groups.indexOf(groupChar);
      }
      
      const stadium = STADIUMS[Math.abs(hashString(pair.home.name + pair.away.name)) % STADIUMS.length];
      
      // Kickoff hours directly in Argentina Time (ART) as per TN schedule
      const timesART = [16, 23, 19, 13];
      const timeSlot = (groups.indexOf(groupChar) + idx) % 4;
      const hourART = timesART[timeSlot];
      
      // Since Argentina is UTC-3, we do UTC = hourART + 3
      const hourUTC = hourART + 3;
      const matchDate = new Date(Date.UTC(2026, 5, 11 + dayOffset, hourUTC, 0, 0));
      
      // Let's set some match statuses:
      // First 4 matches are finished to show score calculation
      let status: 'scheduled' | 'live' | 'finished' = 'scheduled';
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      
      if (matchIndex <= 6) {
        status = 'finished';
        // Mock some realistic results
        if (matchIndex === 1) { homeScore = 2; awayScore = 1; } // Mex vs RSA
        else if (matchIndex === 2) { homeScore = 1; awayScore = 1; } // Kor vs Cze
        else if (matchIndex === 3) { homeScore = 0; awayScore = 2; } // Can vs BiH
        else if (matchIndex === 4) { homeScore = 3; awayScore = 2; } // Bra vs Mar
        else if (matchIndex === 5) { homeScore = 1; awayScore = 0; } // USA vs Par
        else { homeScore = 2; awayScore = 2; } // Qat vs Sui
      } else if (matchIndex === 7 || matchIndex === 8) {
        status = 'live';
        homeScore = 1;
        awayScore = 0;
      }
      
      matches.push({
        id: `M${matchIndex.toString().padStart(2, '0')}`,
        homeTeam: pair.home.code,
        awayTeam: pair.away.code,
        date: matchDate.toISOString(),
        group: groupChar,
        homeScore,
        awayScore,
        stadium,
        status,
      });
      
      matchIndex++;
    });
  });

  return matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

// Real employee names
export const EMPLOYEES = [
  'Eduardo Rodriguez', 'Gabriel Vergara', 'Matias Mercado', 'Alejandro Riccillo', 'Claudio Mazolli',
  'Ramiro Toulemonde', 'Yesica Arevalo', 'Federico Martinez', 'Mauricio Aiello', 'Milagros Aranzabe',
  'Rocio Smidt', 'Alejandro Morreale', 'Daiana', 'Leandro Saraceno', 'Franco Flores',
  'Nicola Cocciaretti', 'Guido Arce', 'Joaquin Burgos', 'Lucas Gil', 'Matias Dieguez',
  'Nacho', 'Conrado Blanco'
];

export const PASSWORD_MAP: Record<string, string> = {
  'Eduardo Rodriguez': 'edu.941',
  'Gabriel Vergara': 'gab.728',
  'Matias Mercado': 'mat.109',
  'Alejandro Riccillo': 'ale.852',
  'Claudio Mazolli': 'cla.491',
  'Ramiro Toulemonde': 'ram.305',
  'Yesica Arevalo': 'yes.673',
  'Federico Martinez': 'fed.214',
  'Mauricio Aiello': 'mau.836',
  'Milagros Aranzabe': 'mil.198',
  'Rocio Smidt': 'roc.542',
  'Alejandro Morreale': 'mor.703',
  'Daiana': 'dai.619',
  'Leandro Saraceno': 'lea.285',
  'Franco Flores': 'fra.390',
  'Nicola Cocciaretti': 'nic.571',
  'Guido Arce': 'gui.843',
  'Joaquin Burgos': 'joa.167',
  'Lucas Gil': 'luc.902',
  'Matias Dieguez': 'die.384',
  'Nacho': 'nac.750',
  'Conrado Blanco': 'con.426'
};

export const MOCK_USERS: User[] = [
  { id: 'admin', username: 'admin', name: 'Administrador', role: 'admin', avatarSeed: 'admin', password: 'admin' },
  ...EMPLOYEES.map((name, idx) => {
    const password = PASSWORD_MAP[name] || '1234';
    return {
      id: `emp-${idx + 1}`,
      username: name.toLowerCase().replace(/\s+/g, '.'),
      name,
      role: 'user' as const,
      avatarSeed: `emp-${idx + 1}`,
      password
    };
  })
];

// Helper to pre-populate mock predictions so the scoreboard isn't empty
export function generateMockPredictions(matches: Match[]): Record<string, Record<string, { homeScore: number, awayScore: number, createdAt: string }>> {
  const allPredictions: Record<string, Record<string, { homeScore: number, awayScore: number, createdAt: string }>> = {};
  
  MOCK_USERS.forEach((user) => {
    if (user.role === 'admin') return;
    
    allPredictions[user.id] = {};
    
    // Each employee predicts the first 12 matches
    matches.slice(0, 12).forEach((match) => {
      // Semi-random but realistic prediction
      const rand = Math.random();
      let homeScore = 1;
      let awayScore = 1;
      
      if (rand < 0.4) {
        homeScore = Math.floor(Math.random() * 3);
        awayScore = Math.floor(Math.random() * 2);
      } else if (rand < 0.7) {
        homeScore = Math.floor(Math.random() * 2);
        awayScore = Math.floor(Math.random() * 3);
      } else {
        homeScore = Math.floor(Math.random() * 2);
        awayScore = homeScore;
      }
      
      allPredictions[user.id][match.id] = {
        homeScore,
        awayScore,
        createdAt: new Date('2026-06-10T12:00:00Z').toISOString()
      };
    });
  });
  
  return allPredictions;
}
