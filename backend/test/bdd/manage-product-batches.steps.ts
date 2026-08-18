import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RolesModule } from '../../src/modules/roles/roles.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { InventoryModule } from '../../src/modules/inventory/inventory.module';
import { InventoryPrismaRepository } from '../../src/modules/inventory/infrastructure/inventory.prisma.repository';
import { BatchPrismaRepository } from '../../src/modules/inventory/infrastructure/batch.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeInventoryRepository } from './support/fake-inventory.repository';
import { FakeBatchRepository } from './support/fake-batch.repository';

const feature = loadFeature('./test/bdd/manage-product-batches.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeInventoryRepository: FakeInventoryRepository;
  let fakeBatchRepository: FakeBatchRepository;
  let grantedPermissions: Set<string>;
  let idempotencyStore: Map<string, { key: string; endpoint: string; response: unknown }>;
  let accessToken: string;
  let response: request.Response;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeInventoryRepository = new FakeInventoryRepository();
    fakeBatchRepository = new FakeBatchRepository();
    grantedPermissions = new Set();
    idempotencyStore = new Map();

    const findFirst = jest.fn(async ({ where }: RolePermissionWhere) => {
      const key = `${where.role.name}:${where.permission.module}:${where.permission.action}`;
      return grantedPermissions.has(key) ? { roleId: 'fake-role-id', permissionId: 'fake-permission-id' } : null;
    });

    const idempotencyKey = {
      findUnique: jest.fn(async ({ where: { key } }: { where: { key: string } }) => idempotencyStore.get(key) ?? null),
      create: jest.fn(async ({ data }: { data: { key: string; endpoint: string; response: unknown } }) => {
        if (idempotencyStore.has(data.key)) {
          throw { code: 'P2002' };
        }
        idempotencyStore.set(data.key, data);
        return data;
      }),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, InventoryModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(InventoryPrismaRepository)
      .useValue(fakeInventoryRepository)
      .overrideProvider(BatchPrismaRepository)
      .useValue(fakeBatchRepository)
      .overrideProvider(PrismaService)
      .useValue({
        rolePermission: { findFirst },
        idempotencyKey,
        revokedToken: { findUnique: jest.fn().mockResolvedValue(null) },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const givenUser = (given: any) => {
    given(/^a user "(.*)" with password "(.*)" and role "(.*)"$/, (email: string, password: string, role: string) => {
      fakeUserRepository.seed(email, password, role);
    });
  };

  const login = (when: any) => {
    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });
  };

  test('Administrator creates a batch for a product that requires batch tracking', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)" that requires batch tracking$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId, true);
    });

    login(when);

    and(/^they create a batch "(.*)" for product "(.*)"$/, async (batchNumber: string, productId: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/batches')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, batchNumber });
    });

    then('the batch is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the batch number "(.*)"$/, (batchNumber: string) => {
      expect(response.body.batchNumber).toBe(batchNumber);
    });
  });

  test('Creating a batch for a product that does not require batch tracking is rejected', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)" that does not require batch tracking$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId, false);
    });

    login(when);

    and(/^they create a batch "(.*)" for product "(.*)"$/, async (batchNumber: string, productId: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/batches')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, batchNumber });
    });

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Administrator lists the batches of a product', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });
    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)" that requires batch tracking$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId, true);
    });

    login(when);

    and(/^they create a batch "(.*)" for product "(.*)"$/, async (batchNumber: string, productId: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/batches')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, batchNumber });
    });

    and(/^they list the batches for product "(.*)"$/, async (productId: string) => {
      response = await request(app.getHttpServer())
        .get(`/inventory/batches/${productId}`)
        .query({ page: 1, pageSize: 20 })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then(/^the list includes a batch numbered "(.*)"$/, (batchNumber: string) => {
      expect(response.body.items.some((b: any) => b.batchNumber === batchNumber)).toBe(true);
    });
  });

  test('A user without the inventory:create permission cannot create a batch', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    and(/^an existing product "(.*)" that requires batch tracking$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId, true);
    });

    login(when);

    and(/^they attempt to create a batch "(.*)" for product "(.*)"$/, async (batchNumber: string, productId: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/batches')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, batchNumber });
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Registering a movement for a product that requires batch tracking without a batchId is rejected', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)" that requires batch tracking$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId, true);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    login(when);

    and(
      /^they register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" without a batch id, with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, locationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, type: 'in', quantity: Number(quantity) });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Registering a movement with a matching batchId succeeds', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)" that requires batch tracking$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId, true);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    and(/^an existing batch "(.*)" for product "(.*)"$/, (id: string, productId: string) => {
      fakeInventoryRepository.seedBatch(id, productId);
    });

    login(when);

    and(
      /^they register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" with batch "(.*)", with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, locationId: string, batch: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, batchId: batch, type: 'in', quantity: Number(quantity) });
      },
    );

    then('the movement is registered successfully', () => {
      expect(response.status).toBe(201);
    });
  });

  test('Registering a movement with a batchId that belongs to a different product is rejected', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)" that requires batch tracking$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId, true);
    });
    and(/^an existing product "(.*)" that requires batch tracking$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId, true);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    and(/^an existing batch "(.*)" for product "(.*)"$/, (id: string, productId: string) => {
      fakeInventoryRepository.seedBatch(id, productId);
    });

    login(when);

    and(
      /^they register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" with batch "(.*)", with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, locationId: string, batch: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, batchId: batch, type: 'in', quantity: Number(quantity) });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });
});
