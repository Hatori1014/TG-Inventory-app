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
// HU-07 — POST /inventory/movements is "Admin Inventario" (create only, no
// :read: GET /inventory/stock is "cualquier autenticado", same criterion as
// HU-28's products GET).
// HU-09 — unlike GET /inventory/stock, both /inventory/batches endpoints
// (plan section 7.4) are "Admin Inventario" — GET included — so
// inventory:read is seeded here, its first use.
// HU-04 — all three /suppliers endpoints (plan section 7.4) are "Comprador"
// minimum, GET included — same "read also gated" shape as HU-06/HU-09.
// "Comprador" isn't seeded as a role here, same as "Admin Inventario"
// never was: PermissionsGuard checks the permission, not a role name — an
// admin can create that role for real via the /roles screen (TT-24 phase 9).
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
  { module: 'inventory', action: 'create' },
  { module: 'inventory', action: 'read' },
  { module: 'suppliers', action: 'read' },
  { module: 'suppliers', action: 'create' },
  { module: 'suppliers', action: 'update' },
  // HU-04, at the user's explicit request: DocumentType/PersonType are
  // administrable catalogs (TT-23 pattern) supporting Supplier, gated the
  // same as suppliers itself — GET included, unlike Category/Unit's open
  // GET (they support Product, whose GET is "any authenticated user").
  { module: 'document-types', action: 'read' },
  { module: 'document-types', action: 'create' },
  { module: 'document-types', action: 'update' },
  { module: 'person-types', action: 'read' },
  { module: 'person-types', action: 'create' },
  { module: 'person-types', action: 'update' },
];

// HU-04, at the user's explicit request: unlike Category/Unit (left empty
// for an admin to populate as needed), these two catalogs get a starter
// set seeded — a fixed, well-known vocabulary (Colombian ID document
// types; natural vs. legal person) that every install needs from the
// first supplier onward, not something specific to this business. Still
// fully administrable afterwards (add/rename/deactivate via
// /document-types, /person-types) — this only avoids forcing whoever
// registers the first supplier to type "NIT" in by hand.
const STARTER_DOCUMENT_TYPES = ['Cédula de ciudadanía', 'Cédula de extranjería', 'NIT'];
const STARTER_PERSON_TYPES = ['Natural', 'Jurídica'];

async function seedStarterDocumentTypes() {
  for (const name of STARTER_DOCUMENT_TYPES) {
    await prisma.documentType.upsert({ where: { name }, update: {}, create: { name } });
  }
}

async function seedStarterPersonTypes() {
  for (const name of STARTER_PERSON_TYPES) {
    await prisma.personType.upsert({ where: { name }, update: {}, create: { name } });
  }
}

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
  await seedStarterDocumentTypes();
  await seedStarterPersonTypes();
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
