import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

async function fixFixture() {
  console.log("Iniciando actualización del fixture...");
  
  // Update matches directly, maintaining ID order from M00 to M71
  // We can just iterate and update match M00, M01 etc based on index
  
  for (let i = 0; i < FIXTURE_DATA.length; i++) {
    const matchId = `M${(i + 1).toString().padStart(2, '0')}`;
    const m = FIXTURE_DATA[i];
    
    // Server is in UTC and user passes local hours. The client probably assumes local.
    // The previous seed.js did Date.UTC(2026, 5, day, hour + 3, 0, 0)
    // We will do exactly the same to match the original timezone
    const utcHour = m.hour + 3;
    const utcMin = m.min || 0;
    
    // We might have a day overflow (e.g. hour 23 + 3 = 26 -> next day)
    // Javascript Date handles this automatically.
    const matchDate = new Date(Date.UTC(2026, 5, m.day, utcHour, utcMin, 0));
    
    await prisma.match.update({
      where: { id: matchId },
      data: {
        homeTeam: m.home,
        awayTeam: m.away,
        date: matchDate,
        group: m.group
      }
    });
  }
  
  console.log("Fixture actualizado con éxito!");
}

fixFixture()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
