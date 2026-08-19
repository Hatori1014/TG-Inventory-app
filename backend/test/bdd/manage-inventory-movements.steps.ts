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
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeInventoryRepository } from './support/fake-inventory.repository';

const feature = loadFeature('./test/bdd/manage-inventory-movements.feature');

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
  let grantedPermissions: Set<string>;
  let idempotencyStore: Map<string, { key: string; endpoint: string; response: unknown }>;
  let accessToken: string;
  let response: request.Response;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeInventoryRepository = new FakeInventoryRepository();
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

  test('Administrator associates stock to a product at a valid, active location', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    login(when);

    and(
      /^they register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, locationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, type: 'in', quantity: Number(quantity) });
      },
    );

    then('the movement is registered successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the stock for product "(.*)" at location "(.*)" is (\d+)$/, async (productId: string, locationId: string, quantity: string) => {
      const stockResponse = await request(app.getHttpServer())
        .get('/inventory/stock')
        .query({ page: 1, pageSize: 100 })
        .set('Authorization', `Bearer ${accessToken}`);
      const row = stockResponse.body.items.find(
        (item: any) => item.product.id === productId && item.location.id === locationId,
      );
      expect(row?.quantity).toBe(Number(quantity));
    });
  });

  test('Registering a movement against a location that does not exist is rejected', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    login(when);

    and(
      /^they register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
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

  test('Registering a movement against an inactive location is rejected', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing inactive location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'inactive');
    });

    login(when);

    and(
      /^they register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
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

  test('A user without the inventory:create permission cannot register a movement', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    login(when);

    and(
      /^they attempt to register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, locationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, type: 'in', quantity: Number(quantity) });
      },
    );

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Registering a movement without an Idempotency-Key header is rejected', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    login(when);

    and(
      /^they register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" without an idempotency key$/,
      async (quantity: string, productId: string, locationId: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ productId, locationId, type: 'in', quantity: Number(quantity) });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Repeating the same Idempotency-Key does not double the stock', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    login(when);

    and(
      /^they register an "in" movement of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, locationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, type: 'in', quantity: Number(quantity) });
      },
    );

    and(/^they register the same movement again with idempotency key "(.*)"$/, async (idempotencyKeyHeader: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/movements')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', idempotencyKeyHeader)
        .send({ productId: 'p1', locationId: 'l1', type: 'in', quantity: 10 });
    });

    then(/^the stock for product "(.*)" at location "(.*)" is (\d+)$/, async (productId: string, locationId: string, quantity: string) => {
      const stockResponse = await request(app.getHttpServer())
        .get('/inventory/stock')
        .query({ page: 1, pageSize: 100 })
        .set('Authorization', `Bearer ${accessToken}`);
      const row = stockResponse.body.items.find(
        (item: any) => item.product.id === productId && item.location.id === locationId,
      );
      expect(row?.quantity).toBe(Number(quantity));
    });
  });

  const assertStockStep = (and: any) => {
    and(/^the stock for product "(.*)" at location "(.*)" is (\d+)$/, async (productId: string, locationId: string, quantity: string) => {
      const stockResponse = await request(app.getHttpServer())
        .get('/inventory/stock')
        .query({ page: 1, pageSize: 100 })
        .set('Authorization', `Bearer ${accessToken}`);
      const row = stockResponse.body.items.find(
        (item: any) => item.product.id === productId && item.location.id === locationId,
      );
      expect(row?.quantity).toBe(Number(quantity));
    });
  };

  const seedStockStep = (and: any) => {
    and(/^an existing stock of (\d+) units for product "(.*)" at location "(.*)"$/, (quantity: string, productId: string, locationId: string) => {
      fakeInventoryRepository.seedStock(productId, locationId, Number(quantity));
    });
  };

  test('Administrator registers an "out" movement that decreases available stock', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    seedStockStep(and);
    login(when);

    and(
      /^they register an "out" movement of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, locationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, type: 'out', quantity: Number(quantity) });
      },
    );

    then('the movement is registered successfully', () => {
      expect(response.status).toBe(201);
    });

    assertStockStep(and);
  });

  test('Registering an "out" movement larger than the available stock is rejected', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    seedStockStep(and);
    login(when);

    and(
      /^they register an "out" movement of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, locationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, type: 'out', quantity: Number(quantity) });
      },
    );

    then('they receive a conflict error', () => {
      expect(response.status).toBe(409);
    });

    assertStockStep(and);
  });

  test('Administrator registers an "adjustment" that increases stock', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    seedStockStep(and);
    login(when);

    and(
      /^they register an "adjustment" with direction "(.*)" of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
      async (direction: string, quantity: string, productId: string, locationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, type: 'adjustment', direction, quantity: Number(quantity) });
      },
    );

    then('the movement is registered successfully', () => {
      expect(response.status).toBe(201);
    });

    assertStockStep(and);
  });

  test('Administrator registers an "adjustment" that decreases stock', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    seedStockStep(and);
    login(when);

    and(
      /^they register an "adjustment" with direction "(.*)" of (\d+) units for product "(.*)" at location "(.*)" with idempotency key "(.*)"$/,
      async (direction: string, quantity: string, productId: string, locationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({ productId, locationId, type: 'adjustment', direction, quantity: Number(quantity) });
      },
    );

    then('the movement is registered successfully', () => {
      expect(response.status).toBe(201);
    });

    assertStockStep(and);
  });

  test('Administrator transfers stock between two active locations atomically', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });
    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    seedStockStep(and);
    login(when);

    and(
      /^they transfer (\d+) units of product "(.*)" from location "(.*)" to location "(.*)" with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, sourceLocationId: string, destinationLocationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({
            productId,
            locationId: sourceLocationId,
            destinationLocationId,
            type: 'transfer',
            quantity: Number(quantity),
          });
      },
    );

    then('the transfer is registered successfully', () => {
      expect(response.status).toBe(201);
    });

    assertStockStep(and);
    assertStockStep(and);
  });

  test('Transferring more than the source has available is rejected and neither location changes', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });
    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    seedStockStep(and);
    login(when);

    and(
      /^they transfer (\d+) units of product "(.*)" from location "(.*)" to location "(.*)" with idempotency key "(.*)"$/,
      async (quantity: string, productId: string, sourceLocationId: string, destinationLocationId: string, idempotencyKeyHeader: string) => {
        response = await request(app.getHttpServer())
          .post('/inventory/movements')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', idempotencyKeyHeader)
          .send({
            productId,
            locationId: sourceLocationId,
            destinationLocationId,
            type: 'transfer',
            quantity: Number(quantity),
          });
      },
    );

    then('they receive a conflict error', () => {
      expect(response.status).toBe(409);
    });

    assertStockStep(and);
  });

  test('Consulting stock filtered by location only returns matching rows', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeInventoryRepository.seedProduct(productId);
    });

    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });
    and(/^an existing active location "(.*)"$/, (locationId: string) => {
      fakeInventoryRepository.seedLocation(locationId, 'active');
    });

    and(/^an existing stock of (\d+) units for product "(.*)" at location "(.*)"$/, (quantity: string, productId: string, locationId: string) => {
      fakeInventoryRepository.seedStock(productId, locationId, Number(quantity));
    });
    and(/^an existing stock of (\d+) units for product "(.*)" at location "(.*)"$/, (quantity: string, productId: string, locationId: string) => {
      fakeInventoryRepository.seedStock(productId, locationId, Number(quantity));
    });

    login(when);

    and(/^they consult stock filtered by location "(.*)"$/, async (locationId: string) => {
      response = await request(app.getHttpServer())
        .get('/inventory/stock')
        .query({ page: 1, pageSize: 100, locationId })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then(/^the stock list has (\d+) row$/, (count: string) => {
      expect(response.body.items.length).toBe(Number(count));
    });

    and(/^the stock list includes location "(.*)" but not location "(.*)"$/, (includedId: string, excludedId: string) => {
      const locationIds = response.body.items.map((item: any) => item.location.id);
      expect(locationIds).toContain(includedId);
      expect(locationIds).not.toContain(excludedId);
    });
  });
});
