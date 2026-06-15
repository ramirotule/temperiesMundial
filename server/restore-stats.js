import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const stats = [
  { username: 'vanesa.del.aqua', exact: 3, diff: 0, outcome: 3 },
  { username: 'federico.martinez', exact: 2, diff: 1, outcome: 2 },
  { username: 'dolores.bruzzone', exact: 1, diff: 1, outcome: 4 },
  { username: 'joaquin.burgos', exact: 2, diff: 1, outcome: 1 },
  { username: 'guillermo.belsito', exact: 2, diff: 0, outcome: 2 },
  { username: 'ailen.fleites', exact: 1, diff: 0, outcome: 4 },
  { username: 'mauricio.aiello', exact: 1, diff: 0, outcome: 4 },
  { username: 'nacho', exact: 2, diff: 0, outcome: 2 },
  { username: 'ramiro.toulemonde', exact: 1, diff: 0, outcome: 3 },
  { username: 'matias.dieguez', exact: 1, diff: 0, outcome: 2 },
  { username: 'matias.mercado', exact: 1, diff: 0, outcome: 2 },
  { username: 'milagros.aranzabe', exact: 1, diff: 1, outcome: 2 },
  { username: 'yesica.arevalo', exact: 1, diff: 0, outcome: 2 },
  { username: 'alejandro.riccillo', exact: 0, diff: 0, outcome: 3 },
  { username: 'rocio.smidt', exact: 0, diff: 0, outcome: 2 },
  { username: 'florencia.belsito', exact: 0, diff: 0, outcome: 2 },
  { username: 'lucas.gil', exact: 0, diff: 1, outcome: 1 },
  { username: 'claudio.mazolli', exact: 0, diff: 0, outcome: 1 },
];

async function main() {
  for (const stat of stats) {
    try {
      await prisma.user.update({
        where: { username: stat.username },
        data: {
          legacyExactMatches: stat.exact,
          legacyDiffMatches: stat.diff,
          legacyOutcomeMatches: stat.outcome
        }
      });
      console.log(`Updated ${stat.username}`);
    } catch (e) {
      console.error(`User ${stat.username} not found or error`, e.message);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
