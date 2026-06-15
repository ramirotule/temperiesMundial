import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const TEAMS = [
  { name: 'México', code: 'mx', group: 'A' },
  { name: 'Sudáfrica', code: 'za', group: 'A' },
  { name: 'Corea del Sur', code: 'kr', group: 'A' },
  { name: 'Chequia', code: 'cz', group: 'A' },
  { name: 'Canadá', code: 'ca', group: 'B' },
  { name: 'Bosnia y Herzegovina', code: 'ba', group: 'B' },
  { name: 'Catar', code: 'qa', group: 'B' },
  { name: 'Suiza', code: 'ch', group: 'B' },
  { name: 'Brasil', code: 'br', group: 'C' },
  { name: 'Marruecos', code: 'ma', group: 'C' },
  { name: 'Haití', code: 'ht', group: 'C' },
  { name: 'Escocia', code: 'gb-sct', group: 'C' },
  { name: 'Estados Unidos', code: 'us', group: 'D' },
  { name: 'Paraguay', code: 'py', group: 'D' },
  { name: 'Australia', code: 'au', group: 'D' },
  { name: 'Turquía', code: 'tr', group: 'D' },
  { name: 'Alemania', code: 'de', group: 'E' },
  { name: 'Curazao', code: 'cw', group: 'E' },
  { name: 'Costa de Marfil', code: 'ci', group: 'E' },
  { name: 'Ecuador', code: 'ec', group: 'E' },
  { name: 'Países Bajos', code: 'nl', group: 'F' },
  { name: 'Japón', code: 'jp', group: 'F' },
  { name: 'Suecia', code: 'se', group: 'F' },
  { name: 'Túnez', code: 'tn', group: 'F' },
  { name: 'Bélgica', code: 'be', group: 'G' },
  { name: 'Egipto', code: 'eg', group: 'G' },
  { name: 'Irán', code: 'ir', group: 'G' },
  { name: 'Nueva Zelanda', code: 'nz', group: 'G' },
  { name: 'España', code: 'es', group: 'H' },
  { name: 'Cabo Verde', code: 'cv', group: 'H' },
  { name: 'Arabia Saudita', code: 'sa', group: 'H' },
  { name: 'Uruguay', code: 'uy', group: 'H' },
  { name: 'Francia', code: 'fr', group: 'I' },
  { name: 'Senegal', code: 'sn', group: 'I' },
  { name: 'Irak', code: 'iq', group: 'I' },
  { name: 'Noruega', code: 'no', group: 'I' },
  { name: 'Argentina', code: 'ar', group: 'J' },
  { name: 'Argelia', code: 'dz', group: 'J' },
  { name: 'Austria', code: 'at', group: 'J' },
  { name: 'Jordania', code: 'jo', group: 'J' },
  { name: 'Portugal', code: 'pt', group: 'K' },
  { name: 'RD Congo', code: 'cd', group: 'K' },
  { name: 'Uzbekistán', code: 'uz', group: 'K' },
  { name: 'Colombia', code: 'co', group: 'K' },
  { name: 'Inglaterra', code: 'gb-eng', group: 'L' },
  { name: 'Croacia', code: 'hr', group: 'L' },
  { name: 'Ghana', code: 'gh', group: 'L' },
  { name: 'Panamá', code: 'pa', group: 'L' },
];

function generateMatches() {
  const matches = [];
  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  let matchIndex = 1;
  
  groups.forEach((groupChar) => {
    const groupTeams = TEAMS.filter(t => t.group === groupChar);
    if (groupTeams.length < 4) return;
    
    const pairings = [
      { home: groupTeams[0], away: groupTeams[1], round: 1 },
      { home: groupTeams[2], away: groupTeams[3], round: 1 },
      { home: groupTeams[0], away: groupTeams[2], round: 2 },
      { home: groupTeams[1], away: groupTeams[3], round: 2 },
      { home: groupTeams[0], away: groupTeams[3], round: 3 },
      { home: groupTeams[1], away: groupTeams[2], round: 3 },
    ];
    
    pairings.forEach((pair, idx) => {
      const groupIdx = groups.indexOf(groupChar);
      const isSecondHalf = groupIdx >= 6;
      const baseGroupIdx = isSecondHalf ? groupIdx - 6 : groupIdx;
      const dayOffset = isSecondHalf ? 4 : 0;

      let day = 11;
      let hour = 12;

      if (baseGroupIdx === 0) { // Group A / G
        if (idx === 0) { day = 11; hour = 16; }
        else if (idx === 1) { day = 11; hour = 23; }
        else if (idx === 2) { day = 18; hour = 22; }
        else if (idx === 3) { day = 18; hour = 13; }
        else if (idx === 4) { day = 24; hour = 22; }
        else if (idx === 5) { day = 24; hour = 22; }
      }
      else if (baseGroupIdx === 1) { // Group B / H
        if (idx === 0) { day = 12; hour = 16; }
        else if (idx === 1) { day = 13; hour = 16; }
        else if (idx === 2) { day = 18; hour = 19; }
        else if (idx === 3) { day = 18; hour = 16; }
        else if (idx === 4) { day = 24; hour = 16; }
        else if (idx === 5) { day = 24; hour = 16; }
      }
      else if (baseGroupIdx === 2) { // Group C / I
        if (idx === 0) { day = 13; hour = 19; }
        else if (idx === 1) { day = 13; hour = 22; }
        else if (idx === 2) { day = 19; hour = 22; }
        else if (idx === 3) { day = 19; hour = 19; }
        else if (idx === 4) { day = 24; hour = 19; }
        else if (idx === 5) { day = 24; hour = 19; }
      }
      else if (baseGroupIdx === 3) { // Group D / J
        if (idx === 0) { day = 12; hour = 22; }
        else if (idx === 1) { day = 14; hour = 1; }
        else if (idx === 2) { day = 19; hour = 16; }
        else if (idx === 3) { day = 20; hour = 0; }
        else if (idx === 4) { day = 25; hour = 23; }
        else if (idx === 5) { day = 25; hour = 23; }
      }
      else if (baseGroupIdx === 4) { // Group E / K
        if (idx === 0) { day = 14; hour = 14; }
        else if (idx === 1) { day = 14; hour = 20; }
        else if (idx === 2) { day = 20; hour = 17; }
        else if (idx === 3) { day = 20; hour = 21; }
        else if (idx === 4) { day = 25; hour = 17; }
        else if (idx === 5) { day = 25; hour = 17; }
      }
      else if (baseGroupIdx === 5) { // Group F / L
        if (idx === 0) { day = 14; hour = 17; }
        else if (idx === 1) { day = 14; hour = 23; }
        else if (idx === 2) { day = 20; hour = 14; }
        else if (idx === 3) { day = 21; hour = 1; }
        else if (idx === 4) { day = 25; hour = 20; }
        else if (idx === 5) { day = 25; hour = 20; }
      }
      
      const hourUTC = hour + 3;
      let matchDate = new Date(Date.UTC(2026, 5, day + dayOffset, hourUTC, 0, 0));

      if (pair.home.code === 'es' && pair.away.code === 'cv') {
        matchDate = new Date(Date.UTC(2026, 5, 15, 16, 0, 0));
      }
      if (pair.home.code === 'sa' && pair.away.code === 'uy') {
        // Fix the issue the user complained about
        matchDate = new Date(Date.UTC(2026, 5, 15, 19 + 3, 0, 0));
      }
      
      matches.push({
        id: `M${matchIndex.toString().padStart(2, '0')}`,
        homeTeam: pair.home.code,
        awayTeam: pair.away.code,
        date: matchDate,
        group: groupChar
      });
      
      matchIndex++;
    });
  });

  return matches;
}

async function restoreFixture() {
  console.log("Restaurando el fixture original...");
  const oldMatches = generateMatches();
  
  for (const m of oldMatches) {
    await prisma.match.update({
      where: { id: m.id },
      data: {
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        date: m.date,
        group: m.group
      }
    });
  }
  
  console.log("Fixture restaurado con éxito!");
}

restoreFixture()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
