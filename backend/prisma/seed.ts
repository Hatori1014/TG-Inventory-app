import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// HU-01 — there is no "register user" story yet, so without this seed there
// is no way to log in at all. Idempotent (safe to run more than once):
// upserts by name/email instead of blindly inserting. Credentials come from
// the environment — the user sets SEED_ADMIN_PASSWORD themselves in
// .env/.env.staging, it is never generated or logged by this script.
const ADMIN_ROLE_NAME = 'Administrador';

// HU-02 — PermissionsGuard is global by default (ADR-25): with zero
// permissions granted, the seeded admin couldn't even create the first role.
// Only the permissions this iteration actually needs — nothing speculative
// for modules that don't exist yet.
// HU-03 — same criterion as HU-02: only the permissions this iteration
// needs (users:read/create/update).
// HU-28 — products/categories/units GETs are "any authenticated user"
// (plan section 7.4), so no :read permission is seeded for them — it would
// be inert, PermissionsGuard only checks endpoints marked @RequirePermission().
// HU-06 — unlike HU-28's catalogs, the master plan (section 7.4) marks all
// three /locations endpoints "Admin Inventario", so :read is seeded here too.
const ADMIN_BOOTSTRAP_PERMISSIONS: Array<{ module: string; action: string }> = [
  { module: 'roles', action: 'read' },
  { module: 'roles', action: 'create' },
  { module: 'roles', action: 'update' },
  { module: 'users', action: 'read' },
  { module: 'users', action: 'create' },
  { module: 'users', action: 'update' },
  { module: 'products', action: 'create' },
  { module: 'products', action: 'update' },
  { module: 'categories', action: 'create' },
  { module: 'categories', action: 'update' },
  { module: 'units', action: 'create' },
  { module: 'units', action: 'update' },
  { module: 'locations', action: 'read' },
  { module: 'locations', action: 'create' },
  { module: 'locations', action: 'update' },
];

async function upsertAdminRole() {
  const existing = await prisma.role.findUnique({ where: { name: ADMIN_ROLE_NAME } });
  if (existing) {
    return existing;
  }
  return prisma.role.create({
    data: { name: ADMIN_ROLE_NAME, description: 'Acceso total al sistema' },
  });
}

async function upsertPermission(module: string, action: string) {
  const existing = await prisma.permission.findUnique({ where: { module_action: { module, action } } });
  if (existing) {
    return existing;
  }
  return prisma.permission.create({ data: { module, action } });
}

async function grantBootstrapPermissions(roleId: string) {
  for (const { module, action } of ADMIN_BOOTSTRAP_PERMISSIONS) {
    const permission = await upsertPermission(module, action);
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      update: {},
      create: { roleId, permissionId: permission.id },
    });
  }
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
  await grantBootstrapPermissions(adminRole.id);
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
