import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.user.update({
      where: { username: 'vanesa.dellaqua' },
      data: {
        legacyExactMatches: 3,
        legacyDiffMatches: 0,
        legacyOutcomeMatches: 3
      }
    });
    console.log('Fixed Vanesa');
  } catch (e) {
    console.error(e);
  }
}
main().finally(() => prisma.$disconnect());
