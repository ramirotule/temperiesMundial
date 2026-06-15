import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMPLOYEES = [
  'Eduardo Rodriguez', 'Gabriel Vergara', 'Matias Mercado', 'Alejandro Riccillo', 'Claudio Mazolli',
  'Ramiro Toulemonde', 'Yesica Arevalo', 'Federico Martinez', 'Mauricio Aiello', 'Milagros Aranzabe',
  'Rocio Smidt', 'Alejandro Morreale', 'Daiana Amarante', 'Leandro Saraceno', 'Franco Flores',
  'Nicola Cocciaretti', 'Guido Arce', 'Joaquin Burgos', 'Lucas Gil', 'Matias Dieguez',
  'Nacho', 'Conrado Blanco', 'Dolores Bruzzone', 'Julieta Belsito', 'Florencia Belsito', 'Ailen Fleites','Vanesa DellAqua','Guillermo Belsito'
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
    
    const FIXTURE_DATA = [
      // GRUPO A
      { group: 'A', home: 'mx', away: 'kr', day: 11, hour: 16 },
      { group: 'A', home: 'za', away: 'cz', day: 11, hour: 23 },
      { group: 'A', home: 'cz', away: 'mx', day: 18, hour: 13 },
      { group: 'A', home: 'za', away: 'kr', day: 18, hour: 22 },
      { group: 'A', home: 'cz', away: 'kr', day: 24, hour: 22 },
      { group: 'A', home: 'mx', away: 'za', day: 24, hour: 22 },

      // GRUPO B
      { group: 'B', home: 'ca', away: 'qa', day: 12, hour: 16 },
      { group: 'B', home: 'ch', away: 'ba', day: 13, hour: 16 },
      { group: 'B', home: 'ca', away: 'ch', day: 18, hour: 16 },
      { group: 'B', home: 'ba', away: 'qa', day: 18, hour: 19 },
      { group: 'B', home: 'ch', away: 'qa', day: 24, hour: 16 },
      { group: 'B', home: 'ba', away: 'ca', day: 24, hour: 16 },

      // GRUPO C
      { group: 'C', home: 'br', away: 'ht', day: 13, hour: 19 },
      { group: 'C', home: 'gb-sct', away: 'ma', day: 13, hour: 22 },
      { group: 'C', home: 'gb-sct', away: 'br', day: 19, hour: 19 },
      { group: 'C', home: 'ht', away: 'ma', day: 19, hour: 22 },
      { group: 'C', home: 'br', away: 'ma', day: 24, hour: 19 },
      { group: 'C', home: 'gb-sct', away: 'ht', day: 24, hour: 19 },

      // GRUPO D
      { group: 'D', home: 'us', away: 'au', day: 12, hour: 22 },
      { group: 'D', home: 'tr', away: 'py', day: 14, hour: 1 },
      { group: 'D', home: 'tr', away: 'us', day: 19, hour: 16 },
      { group: 'D', home: 'py', away: 'au', day: 20, hour: 0 },
      { group: 'D', home: 'py', away: 'us', day: 25, hour: 23 },
      { group: 'D', home: 'tr', away: 'au', day: 25, hour: 23 },

      // GRUPO E
      { group: 'E', home: 'de', away: 'ci', day: 14, hour: 14 },
      { group: 'E', home: 'ec', away: 'cw', day: 14, hour: 20 },
      { group: 'E', home: 'de', away: 'ec', day: 20, hour: 17 },
      { group: 'E', home: 'cw', away: 'ci', day: 20, hour: 21 },
      { group: 'E', home: 'cw', away: 'de', day: 25, hour: 17 },
      { group: 'E', home: 'ec', away: 'ci', day: 25, hour: 17 },

      // GRUPO F
      { group: 'F', home: 'nl', away: 'se', day: 14, hour: 17 },
      { group: 'F', home: 'tn', away: 'jp', day: 14, hour: 23 },
      { group: 'F', home: 'nl', away: 'tn', day: 20, hour: 14 },
      { group: 'F', home: 'jp', away: 'se', day: 21, hour: 1 },
      { group: 'F', home: 'jp', away: 'nl', day: 25, hour: 20 },
      { group: 'F', home: 'tn', away: 'se', day: 25, hour: 20 },

      // GRUPO G
      { group: 'G', home: 'be', away: 'ir', day: 15, hour: 16 },
      { group: 'G', home: 'nz', away: 'eg', day: 15, hour: 22 },
      { group: 'G', home: 'be', away: 'nz', day: 21, hour: 16 },
      { group: 'G', home: 'eg', away: 'ir', day: 21, hour: 22 },
      { group: 'G', home: 'eg', away: 'be', day: 27, hour: 0 },
      { group: 'G', home: 'nz', away: 'ir', day: 27, hour: 0 },

      // GRUPO H
      { group: 'H', home: 'es', away: 'sa', day: 15, hour: 13 },
      { group: 'H', home: 'uy', away: 'cv', day: 15, hour: 19 },
      { group: 'H', home: 'es', away: 'uy', day: 21, hour: 13 },
      { group: 'H', home: 'cv', away: 'sa', day: 21, hour: 19 },
      { group: 'H', home: 'sa', away: 'uy', day: 26, hour: 21 },
      { group: 'H', home: 'cv', away: 'es', day: 26, hour: 21 },

      // GRUPO I
      { group: 'I', home: 'fr', away: 'iq', day: 16, hour: 16 },
      { group: 'I', home: 'no', away: 'sn', day: 16, hour: 19 },
      { group: 'I', home: 'fr', away: 'no', day: 22, hour: 18 },
      { group: 'I', home: 'sn', away: 'iq', day: 22, hour: 21 },
      { group: 'I', home: 'sn', away: 'fr', day: 26, hour: 16 },
      { group: 'I', home: 'no', away: 'iq', day: 26, hour: 16 },

      // GRUPO J
      { group: 'J', home: 'ar', away: 'at', day: 16, hour: 22 },
      { group: 'J', home: 'jo', away: 'dz', day: 17, hour: 1 },
      { group: 'J', home: 'ar', away: 'jo', day: 23, hour: 14 },
      { group: 'J', home: 'dz', away: 'at', day: 23, hour: 0 },
      { group: 'J', home: 'dz', away: 'ar', day: 27, hour: 23 },
      { group: 'J', home: 'jo', away: 'at', day: 27, hour: 23 },

      // GRUPO K
      { group: 'K', home: 'pt', away: 'uz', day: 17, hour: 14 },
      { group: 'K', home: 'cd', away: 'co', day: 17, hour: 23 },
      { group: 'K', home: 'pt', away: 'cd', day: 23, hour: 14 },
      { group: 'K', home: 'co', away: 'uz', day: 23, hour: 23 },
      { group: 'K', home: 'co', away: 'pt', day: 27, hour: 20, min: 30 },
      { group: 'K', home: 'cd', away: 'uz', day: 27, hour: 20, min: 30 },

      // GRUPO L
      { group: 'L', home: 'gb-eng', away: 'gh', day: 17, hour: 17 },
      { group: 'L', home: 'pa', away: 'hr', day: 17, hour: 20 },
      { group: 'L', home: 'gb-eng', away: 'pa', day: 23, hour: 17 },
      { group: 'L', home: 'hr', away: 'gh', day: 23, hour: 20 },
      { group: 'L', home: 'hr', away: 'gb-eng', day: 27, hour: 18 },
      { group: 'L', home: 'pa', away: 'gh', day: 27, hour: 18 },
    ];

    const groupMatches = FIXTURE_DATA.filter(m => m.group === groupChar);

    groupMatches.forEach((m) => {
      const stadium = STADIUMS[Math.abs(hashString(m.home + m.away)) % STADIUMS.length];
      const hourUTC = m.hour + 3;
      const minUTC = m.min || 0;
      const matchDate = new Date(Date.UTC(2026, 5, m.day, hourUTC, minUTC, 0));

      matches.push({
        id: `M${matchIndex.toString().padStart(2, '0')}`,
        homeTeam: m.home,
        awayTeam: m.away,
        date: matchDate,
        group: groupChar,
        homeScore: null,
        awayScore: null,
        stadium,
        status: 'scheduled',
      });
      matchIndex++;
    });
  });

  return matches.sort((a, b) => a.date.getTime() - b.date.getTime());
}

async function main() {
  console.log('Seeding started...');

  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('render.com') || dbUrl.includes('dpg-')) {
    console.error('====================================================');
    console.error('🛑 ERROR CRÍTICO: ESTÁS APUNTANDO A PRODUCCIÓN 🛑');
    console.error('El script de seed borra TODA la base de datos.');
    console.error('Abortando ejecución para proteger los datos de producción.');
    console.error('====================================================');
    process.exit(1);
  }
  
  // Clear Database
  await prisma.prediction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.user.deleteMany();
  
  const PASSWORD_MAP = {
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
    'Daiana Amarante': 'dai.619',
    'Leandro Saraceno': 'lea.285',
    'Franco Flores': 'fra.390',
    'Nicola Cocciaretti': 'nic.571',
    'Guido Arce': 'gui.843',
    'Joaquin Burgos': 'joa.167',
    'Lucas Gil': 'luc.902',
    'Matias Dieguez': 'die.384',
    'Nacho': 'nac.750',
    'Conrado Blanco': 'con.426',
    'Dolores Bruzzone': 'dol.824',
    'Julieta Belsito': 'jul.375',
    'Florencia Belsito': 'flo.849',
    'Ailen Fleites': 'ail.716',
    'Vanesa DellAcqua': 'van.392',
    'Guillermo Belsito': 'gui.684'
  };

  // 1. Seed Users
  const usersToCreate = [
    { username: 'admin', name: 'Administrador', role: 'admin', avatarSeed: 'admin', password: 'adminmundial2026' },
    ...EMPLOYEES.map((name, idx) => {
      const password = PASSWORD_MAP[name] || '1234';
      return {
        username: name.toLowerCase().replace(/\s+/g, '.'),
        name,
        role: 'user',
        avatarSeed: `emp-${idx + 1}`,
        password
      };
    })
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
