import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Standard scoring engine logic
function calculatePoints(match, prediction) {
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

function getMatchStatus(match) {
  if (match.status === 'finished' || (match.homeScore !== null && match.awayScore !== null)) {
    return 'finished';
  }
  const now = new Date();
  const matchDate = new Date(match.date);
  const diffMinutes = (now.getTime() - matchDate.getTime()) / (1000 * 60);

  if (diffMinutes >= 110) {
    return 'finished';
  } else if (diffMinutes >= 0) {
    return 'live';
  }
  return 'scheduled';
}

// 1. Authenticate / Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  const { userId, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    // Return user without password
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Error de servidor durante login.' });
  }
});

// 2. Get Users List (For select dropdown on Login screen)
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' }
    });
    // Return without password
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios.' });
  }
});

// 3. Get Matches List
app.get('/api/matches', async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { date: 'asc' }
    });
    const updatedMatches = matches.map(match => ({
      ...match,
      status: getMatchStatus(match)
    }));
    res.json(updatedMatches);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener partidos.' });
  }
});

// 4. Get All Predictions (or for current user)
app.get('/api/predictions', async (req, res) => {
  try {
    const predictions = await prisma.prediction.findMany();
    // Group predictions as record mapping user_id -> match_id -> prediction
    const predictionMap = {};
    predictions.forEach(p => {
      if (!predictionMap[p.userId]) {
        predictionMap[p.userId] = {};
      }
      predictionMap[p.userId][p.matchId] = {
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        createdAt: p.createdAt
      };
    });
    res.json(predictionMap);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener predicciones.' });
  }
});

// 5. Create / Update Prediction
app.post('/api/predictions', async (req, res) => {
  const { userId, matchId, homeScore, awayScore } = req.body;

  const hScore = parseInt(homeScore, 10);
  const aScore = parseInt(awayScore, 10);

  if (isNaN(hScore) || hScore < 0 || isNaN(aScore) || aScore < 0) {
    return res.status(400).json({ error: 'Goles no válidos.' });
  }

  try {
    // Verify match status first (cannot predict started matches or past kick-off time)
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return res.status(404).json({ error: 'Partido no encontrado.' });
    }

    const now = new Date();
    const matchDate = new Date(match.date);

    if (getMatchStatus(match) !== 'scheduled' || now >= matchDate) {
      return res.status(400).json({ error: 'No se permite guardar resultados una vez comenzado o finalizado el partido.' });
    }

    const prediction = await prisma.prediction.upsert({
      where: {
        userId_matchId: { userId, matchId }
      },
      update: {
        homeScore: hScore,
        awayScore: aScore,
        createdAt: new Date()
      },
      create: {
        userId,
        matchId,
        homeScore: hScore,
        awayScore: aScore
      }
    });

    res.json(prediction);
  } catch (error) {
    console.error("Error saving prediction:", error);
    res.status(500).json({ error: 'Error al guardar pronóstico.', details: error.message });
  }
});

// 6. Admin: Update Real Match Result
app.put('/api/admin/matches/:id', async (req, res) => {
  const { id } = req.params;
  const { homeScore, awayScore, status } = req.body;

  try {
    const hScore = homeScore === "" || homeScore === null ? null : parseInt(homeScore);
    const aScore = awayScore === "" || awayScore === null ? null : parseInt(awayScore);

    if (status === 'finished' && (hScore === null || aScore === null)) {
      return res.status(400).json({ error: 'Debe cargar un resultado para finalizar el partido.' });
    }

    const match = await prisma.match.update({
      where: { id },
      data: {
        homeScore: hScore,
        awayScore: aScore,
        status
      }
    });

    res.json({
      ...match,
      status: getMatchStatus(match)
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar partido.' });
  }
});

// 7. Reset Demo Data
app.post('/api/admin/reset', async (req, res) => {
  try {
    // Run seed logic
    // Normally we'd call the seed function, but here we can just clear predictions and reset match statuses
    await prisma.prediction.deleteMany();
    
    // We update all match states to reset status
    const matches = await prisma.match.findMany();
    for (const match of matches) {
      const matchIndex = parseInt(match.id.substring(1));
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

      await prisma.match.update({
        where: { id: match.id },
        data: { status, homeScore, awayScore }
      });
    }

    // Recreate mock predictions
    const createdUsers = await prisma.user.findMany({ where: { role: 'user' } });
    const createdMatches = await prisma.match.findMany();
    const first12Matches = createdMatches.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 12);

    for (const user of createdUsers) {
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
      }
    }

    res.json({ success: true, message: 'Base de datos demo restablecida con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al reiniciar base de datos.' });
  }
});

// 8. Admin: Clear all predictions (Reset participants' predictions to 0 points)
app.post('/api/admin/clear-predictions', async (req, res) => {
  try {
    await prisma.prediction.deleteMany();
    res.json({ success: true, message: 'Todos los pronósticos fueron eliminados con éxito.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al limpiar pronósticos.' });
  }
});

// 9. Admin: Reset all matches to scheduled / no scores
app.post('/api/admin/reset-matches', async (req, res) => {
  try {
    await prisma.match.updateMany({
      data: {
        homeScore: null,
        awayScore: null,
        status: 'scheduled'
      }
    });
    res.json({ success: true, message: 'Todos los partidos se restablecieron a pendientes sin goles.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al restablecer partidos.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

