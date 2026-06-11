import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: 'admin' }
    });

    if (!adminUser) {
      console.log('No admin user found in database.');
      return;
    }

    const updated = await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: 'adminmundial2026' }
    });

    console.log(`Successfully updated password for admin user: ${updated.username}`);
  } catch (error) {
    console.error('Error updating admin password:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
