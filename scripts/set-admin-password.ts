// One-off helper: updates the admin account's password directly (used
// when changing the seeded default password on an already-running
// instance, since prisma/seed.ts only runs once against an empty DB).
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma';

async function main() {
  const username = process.env.TARGET_USERNAME || 'admin';
  const newPassword = process.env.NEW_PASSWORD;
  if (!newPassword) throw new Error('NEW_PASSWORD env var is required');

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const updated = await prisma.user.update({
    where: { username },
    data: { passwordHash, mustChangePassword: true },
  });
  console.log(`Password updated for user: ${updated.username}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
