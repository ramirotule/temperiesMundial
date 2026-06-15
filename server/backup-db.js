import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function backup() {
  console.log("Iniciando backup local...");
  const users = await prisma.user.findMany();
  const matches = await prisma.match.findMany();
  const predictions = await prisma.prediction.findMany();

  const backupData = {
    users,
    matches,
    predictions
  };

  fs.writeFileSync('backup_db.json', JSON.stringify(backupData, null, 2));
  console.log("Backup guardado en backup_db.json. ¡Todo seguro!");
}

backup()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
