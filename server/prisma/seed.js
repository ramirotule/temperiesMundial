import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMPLOYEES = [
  'Ramiro Tule', 'Santiago Pérez', 'Florencia Díaz', 'Mateo Rossi', 'Lucrecia Fernández',
  'Nicolás Gómez', 'Bautista Rodríguez', 'Valentina López', 'Juana González', 'Benjamín Martínez',
  'Delfina Álvarez', 'Tomás Romero', 'Catalina Herrera', 'Felipe Castro', 'Olivia Giménez',
  'Joaquín Silva', 'Emma Medina', 'Agustín Vera', 'Zoe Suárez', 'Ignacio Alarcón',
  'Margarita Peralta', 'Manuel Vidal', 'Milagros Pereyra', 'Francisco Ledesma', 'Lola Ortiz',
  'Juan Cruz Molina', 'Sofia Torres', 'Bruno Solís', 'Martina Vega', 'Juan Manuel Carrizo',
  'Victoria Luna', 'Thiago Campos', 'Guillermina Ríos', 'Facundo Morales', 'Morena Ibáñez',
  'Santino Acosta', 'Alma Ferreira', 'León Roldán', 'Mia Domínguez', 'Lorenzo Quiroga'
];

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

const STADIUMS = [
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

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
}

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
      let dayOffset = 0;
      if (pair.round === 1) {
        dayOffset = Math.floor((groups.indexOf(groupChar) * 2 + idx) / 5);
      } else if (pair.round === 2) {
        dayOffset = 5 + Math.floor((groups.indexOf(groupChar) * 2 + idx) / 5);
      } else {
        dayOffset = 10 + Math.floor((groups.indexOf(groupChar) * 2 + idx) / 5);
      }
      
      const matchDate = new Date('2026-06-11T13:00:00');
      matchDate.setDate(matchDate.getDate() + dayOffset);
      
      const times = [13, 16, 19, 22];
      const timeSlot = (groups.indexOf(groupChar) + idx) % 4;
      matchDate.setHours(times[timeSlot], 0, 0);

      const stadium = STADIUMS[Math.abs(hashString(pair.home.name + pair.away.name)) % STADIUMS.length];
      
      let status = 'scheduled';
      let homeScore = null;
      let awayScore = null;
      
      if (matchIndex <= 6) {
        status = 'finished';
        if (matchIndex === 1) { homeScore = 2; awayScore = 1; }
        else if (matchIndex === 2) { homeScore = 1; awayScore = 1; }
        else if (matchIndex === 3) { homeScore = 0; awayScore = 2; }
        else if (matchIndex === 4) { homeScore = 3; awayScore = 2; }
        else if (matchIndex === 5) { homeScore = 1; awayScore = 0; }
        else { homeScore = 2; awayScore = 2; }
      } else if (matchIndex === 7 || matchIndex === 8) {
        status = 'live';
        homeScore = 1;
        awayScore = 0;
      }
      
      matches.push({
        id: `M${matchIndex.toString().padStart(2, '0')}`,
        homeTeam: pair.home.code,
        awayTeam: pair.away.code,
        date: matchDate,
        group: groupChar,
        homeScore,
        awayScore,
        stadium,
        status,
      });
      
      matchIndex++;
    });
  });

  return matches;
}

async function main() {
  console.log('Seeding started...');
  
  // Clear Database
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.user.deleteMany();
  
  // 1. Seed Users
  const usersToCreate = [
    { username: 'admin', name: 'Administrador', role: 'admin', avatarSeed: 'admin', password: 'admin' },
    ...EMPLOYEES.map((name, idx) => ({
      username: name.toLowerCase().replace(/\s+/g, '.'),
      name,
      role: 'user',
      avatarSeed: `emp-${idx + 1}`,
      password: '1234'
    }))
  ];
  
  const createdUsers = [];
  for (const u of usersToCreate) {
    const user = await prisma.user.create({ data: u });
    createdUsers.push(user);
  }
  console.log(`Created ${createdUsers.length} users.`);

  // 2. Seed Matches
  const matchesToCreate = generateMatches();
  const createdMatches = [];
  for (const m of matchesToCreate) {
    const match = await prisma.match.create({ data: m });
    createdMatches.push(match);
  }
  console.log(`Created ${createdMatches.length} matches.`);

  // 3. Seed Mock Predictions for first 12 matches for employees
  let predictionsCount = 0;
  const employees = createdUsers.filter(u => u.role !== 'admin');
  const first12Matches = createdMatches.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 12);

  for (const user of employees) {
    for (const match of first12Matches) {
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
      
      await prisma.prediction.create({
        data: {
          userId: user.id,
          matchId: match.id,
          homeScore,
          awayScore,
        }
      });
      predictionsCount++;
    }
  }
  console.log(`Created ${predictionsCount} mock predictions.`);
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
