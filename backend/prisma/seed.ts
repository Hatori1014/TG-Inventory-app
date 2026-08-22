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
  // HU-13 — all three /purchases endpoints (plan section 7.4) are
  // "Comprador" minimum, GET included — no :update seeded, PATCH isn't
  // part of this HU's criteria (a purchase is never edited, only created).
  { module: 'purchases', action: 'read' },
  { module: 'purchases', action: 'create' },
  // HU-11 — first real consumer of inventory:update: PATCH
  // /inventory/minimum-stock/:id is "Admin Inventario", same module as the
  // existing inventory:create/:read (POST /inventory/movements, HU-09's
  // batches, GET /inventory/minimum-stock listing added alongside this HU).
  { module: 'inventory', action: 'update' },
  // HU-15 — /requests is "Solicitante" minimum, GET included (plan section
  // 7.4). "Solicitante" isn't seeded, same criterion as "Comprador"/"Admin
  // Inventario" — PermissionsGuard checks the permission, not the role
  // name. PATCH :id/PATCH :id/submit (editing/submitting a draft, added
  // beyond the plan's own endpoint table) reuse requests:create.
  { module: 'requests', action: 'create' },
  { module: 'requests', action: 'read' },
  // HU-17 — approve/reject is "Aprobador" minimum, integrate is "Admin
  // Inventario" minimum (plan section 7.4 + the user's explicit design:
  // these can be different people). Neither role is seeded, same
  // criterion as "Comprador"/"Solicitante" above.
  { module: 'requests', action: 'approve' },
  { module: 'requests', action: 'integrate' },
  // Default-role feature — "eliminar rol" (soft delete, ADR-22) reassigns
  // orphaned users to the default role instead of leaving a dangling
  // roleId.
  { module: 'roles', action: 'delete' },
];

// Default-role feature, at the user's explicit request: the role every new
// user starts on, and the reassignment target when another role is
// deleted — so it can never itself be deleted (DeleteRoleUseCase checks
// isDefault before allowing it). Scoped to exactly "sees/creates its own
// requests" (requests:create/read — the same scope ListRequestsUseCase
// already applies for a plain requester, no extra logic needed since there
// is no requests:approve/integrate to broaden it).
const DEFAULT_ROLE_NAME = 'Solicitante';
const DEFAULT_ROLE_PERMISSIONS: Array<{ module: string; action: string }> = [
  { module: 'requests', action: 'create' },
  { module: 'requests', action: 'read' },
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
  // findFirst, not findUnique: name is no longer a blanket-unique field
  // (ADR-22 — unique only among non-deleted roles, migration
  // 20260822010000), and this script runs against a plain PrismaClient,
  // not the NestJS PrismaService that auto-filters deletedAt for `role`.
  const existing = await prisma.role.findFirst({ where: { name: ADMIN_ROLE_NAME, deletedAt: null } });
  if (existing) {
    return existing;
  }
  return prisma.role.create({
    data: { name: ADMIN_ROLE_NAME, description: 'Acceso total al sistema' },
  });
}

async function upsertDefaultRole() {
  const existing = await prisma.role.findFirst({ where: { isDefault: true, deletedAt: null } });
  if (existing) {
    return existing;
  }
  return prisma.role.create({
    data: {
      name: DEFAULT_ROLE_NAME,
      description: 'Rol por defecto — solo ve y crea sus propias solicitudes',
      isDefault: true,
    },
  });
}

async function grantDefaultRolePermissions(roleId: string) {
  for (const { module, action } of DEFAULT_ROLE_PERMISSIONS) {
    const permission = await upsertPermission(module, action);
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId, permissionId: permission.id } },
      update: {},
      create: { roleId, permissionId: permission.id },
    });
  }
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
  const defaultRole = await upsertDefaultRole();
  await grantDefaultRolePermissions(defaultRole.id);
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
