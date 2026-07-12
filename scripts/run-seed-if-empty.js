// Runs prisma/seed.ts automatically on first container start (when the
// users table is empty). Safe to run on every restart - it is a no-op
// once seed data already exists.
const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      console.log('[seed] Users already exist, skipping seed.');
      return;
    }
    console.log('[seed] No users found, running seed script...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit' });
  } catch (err) {
    console.error('[seed] Skipped automatic seed check due to error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
