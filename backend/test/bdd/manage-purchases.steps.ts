import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { randomUUID } from 'crypto';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RolesModule } from '../../src/modules/roles/roles.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { PurchasesModule } from '../../src/modules/purchases/purchases.module';
import { PurchasePrismaRepository } from '../../src/modules/purchases/infrastructure/purchase.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakePurchaseRepository } from './support/fake-purchase.repository';

const feature = loadFeature('./test/bdd/manage-purchases.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakePurchaseRepository: FakePurchaseRepository;
  let grantedPermissions: Set<string>;
  let accessToken: string;
  let response: request.Response;
  let supplierId: string;
  let locationId: string;
  const productIdsByName = new Map<string, string>();

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakePurchaseRepository = new FakePurchaseRepository();
    grantedPermissions = new Set();
    productIdsByName.clear();
    const idempotencyStore = new Map<string, { key: string; endpoint: string; response: unknown }>();

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
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, PurchasesModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(PurchasePrismaRepository)
      .useValue(fakePurchaseRepository)
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

  function productId(name: string): string {
    let id = productIdsByName.get(name);
    if (!id) {
      id = randomUUID();
      productIdsByName.set(name, id);
    }
    return id;
  }

  const givenUser = (given: (match: string | RegExp, cb: (...args: string[]) => void) => void) => {
    given(/^a user "(.*)" with password "(.*)" and role "(.*)"$/, (email: string, password: string, role: string) => {
      fakeUserRepository.seed(email, password, role);
    });
  };

  const andPermissionGranted = (and: (match: string | RegExp, cb: (...args: string[]) => void) => void) => {
    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });
  };

  const andPermissionNotGranted = (and: (match: string | RegExp, cb: (...args: string[]) => void) => void) => {
    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });
  };

  const whenLogin = (when: (match: string | RegExp, cb: (...args: string[]) => Promise<void>) => void) => {
    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });
  };

  test('Buyer registers a purchase with one item and stock increases', ({ given, and, when, then }) => {
    givenUser(given);
    andPermissionGranted(and);

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    and(/^an existing product "(.*)" that does not require a batch$/, (name: string) => {
      fakePurchaseRepository.seedProduct(productId(name), name, false);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      locationId = randomUUID();
      fakePurchaseRepository.seedLocation(locationId, name, 'active');
    });

    whenLogin(when);

    and(
      /^they register a purchase from that supplier with (\d+) units of that product at ([\d.]+) each into that location$/,
      async (quantity: string, unitPrice: string) => {
        response = await request(app.getHttpServer())
          .post('/purchases')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            supplierId,
            items: [
              {
                productId: [...productIdsByName.values()][0],
                locationId,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
              },
            ],
          });
      },
    );

    then('the purchase is registered successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response shows a total amount of (\d+)$/, (amount: string) => {
      expect(response.body.totalAmount).toBe(Number(amount));
    });

    and(/^the stock of that product at that location increased by (\d+)$/, (quantity: string) => {
      const [firstProductId] = [...productIdsByName.values()];
      expect(fakePurchaseRepository.getStockFor(firstProductId, locationId)).toBe(Number(quantity));
    });
  });

  test('Buyer registers a purchase of a product that requires a batch, with a new batch number', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);
    andPermissionGranted(and);

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    and(/^an existing product "(.*)" that requires a batch$/, (name: string) => {
      fakePurchaseRepository.seedProduct(productId(name), name, true);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      locationId = randomUUID();
      fakePurchaseRepository.seedLocation(locationId, name, 'active');
    });

    whenLogin(when);

    and(
      /^they register a purchase from that supplier with (\d+) units of that product at ([\d.]+) each into that location using batch number "(.*)"$/,
      async (quantity: string, unitPrice: string, batchNumber: string) => {
        response = await request(app.getHttpServer())
          .post('/purchases')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            supplierId,
            items: [
              {
                productId: [...productIdsByName.values()][0],
                locationId,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
                batchNumber,
              },
            ],
          });
      },
    );

    then('the purchase is registered successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes an item with batch number "(.*)"$/, (batchNumber: string) => {
      expect(response.body.items[0].batchNumber).toBe(batchNumber);
    });
  });

  test('Registering a purchase of a product that requires a batch without a batch number is rejected', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);
    andPermissionGranted(and);

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    and(/^an existing product "(.*)" that requires a batch$/, (name: string) => {
      fakePurchaseRepository.seedProduct(productId(name), name, true);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      locationId = randomUUID();
      fakePurchaseRepository.seedLocation(locationId, name, 'active');
    });

    whenLogin(when);

    and(
      /^they register a purchase from that supplier with (\d+) units of that product at ([\d.]+) each into that location$/,
      async (quantity: string, unitPrice: string) => {
        response = await request(app.getHttpServer())
          .post('/purchases')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            supplierId,
            items: [
              {
                productId: [...productIdsByName.values()][0],
                locationId,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
              },
            ],
          });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Registering a purchase from an inactive supplier is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    andPermissionGranted(and);

    and(/^an existing inactive supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'inactive');
    });

    and(/^an existing product "(.*)" that does not require a batch$/, (name: string) => {
      fakePurchaseRepository.seedProduct(productId(name), name, false);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      locationId = randomUUID();
      fakePurchaseRepository.seedLocation(locationId, name, 'active');
    });

    whenLogin(when);

    and(
      /^they register a purchase from that supplier with (\d+) units of that product at ([\d.]+) each into that location$/,
      async (quantity: string, unitPrice: string) => {
        response = await request(app.getHttpServer())
          .post('/purchases')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            supplierId,
            items: [
              {
                productId: [...productIdsByName.values()][0],
                locationId,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
              },
            ],
          });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Registering a purchase into an inactive location is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    andPermissionGranted(and);

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    and(/^an existing product "(.*)" that does not require a batch$/, (name: string) => {
      fakePurchaseRepository.seedProduct(productId(name), name, false);
    });

    and(/^an existing inactive location "(.*)"$/, (name: string) => {
      locationId = randomUUID();
      fakePurchaseRepository.seedLocation(locationId, name, 'inactive');
    });

    whenLogin(when);

    and(
      /^they register a purchase from that supplier with (\d+) units of that product at ([\d.]+) each into that location$/,
      async (quantity: string, unitPrice: string) => {
        response = await request(app.getHttpServer())
          .post('/purchases')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            supplierId,
            items: [
              {
                productId: [...productIdsByName.values()][0],
                locationId,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
              },
            ],
          });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('A user without the purchases:create permission cannot register a purchase', ({ given, and, when, then }) => {
    givenUser(given);
    andPermissionNotGranted(and);

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    and(/^an existing product "(.*)" that does not require a batch$/, (name: string) => {
      fakePurchaseRepository.seedProduct(productId(name), name, false);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      locationId = randomUUID();
      fakePurchaseRepository.seedLocation(locationId, name, 'active');
    });

    whenLogin(when);

    and(
      /^they attempt to register a purchase from that supplier with (\d+) units of that product at ([\d.]+) each into that location$/,
      async (quantity: string, unitPrice: string) => {
        response = await request(app.getHttpServer())
          .post('/purchases')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            supplierId,
            items: [
              {
                productId: [...productIdsByName.values()][0],
                locationId,
                quantity: Number(quantity),
                unitPrice: Number(unitPrice),
              },
            ],
          });
      },
    );

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('A purchase with multiple items updates the stock of each item independently', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);
    andPermissionGranted(and);

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    and(/^an existing product "(.*)" that does not require a batch$/, (name: string) => {
      fakePurchaseRepository.seedProduct(productId(name), name, false);
    });

    and(/^an existing product "(.*)" that does not require a batch$/, (name: string) => {
      fakePurchaseRepository.seedProduct(productId(name), name, false);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      locationId = randomUUID();
      fakePurchaseRepository.seedLocation(locationId, name, 'active');
    });

    whenLogin(when);

    and(
      /^they register a purchase from that supplier with two items: (\d+) units of "(.*)" at ([\d.]+) each, and (\d+) units of "(.*)" at ([\d.]+) each, both into that location$/,
      async (qty1: string, name1: string, price1: string, qty2: string, name2: string, price2: string) => {
        response = await request(app.getHttpServer())
          .post('/purchases')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            supplierId,
            items: [
              { productId: productId(name1), locationId, quantity: Number(qty1), unitPrice: Number(price1) },
              { productId: productId(name2), locationId, quantity: Number(qty2), unitPrice: Number(price2) },
            ],
          });
      },
    );

    then('the purchase is registered successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response shows a total amount of (\d+)$/, (amount: string) => {
      expect(response.body.totalAmount).toBe(Number(amount));
    });
  });
});
