import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// HU-01 — there is no "register user" story yet, so without this seed there
// is no way to log in at all. Idempotent (safe to run more than once):
// upserts by name/email instead of blindly inserting. Credentials come from
// the environment — the user sets SEED_ADMIN_PASSWORD themselves in
// .env/.env.staging, it is never generated or logged by this script.
const ADMIN_ROLE_NAME = 'Administrador';

async function upsertAdminRole() {
  const existing = await prisma.role.findFirst({ where: { name: ADMIN_ROLE_NAME } });
  if (existing) {
    return existing;
  }
  return prisma.role.create({
    data: { name: ADMIN_ROLE_NAME, description: 'Acceso total al sistema' },
  });
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set (see .env.example) before running the seed.',
    );
  }

  const adminRole = await upsertAdminRole();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: 'Administrador',
      email,
      passwordHash,
      roleId: adminRole.id,
    },
  });

  console.log(`Seed admin user ready: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
