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
import { RequestsModule } from '../../src/modules/requests/requests.module';
import { RequestPrismaRepository } from '../../src/modules/requests/infrastructure/request.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeRequestRepository } from './support/fake-request.repository';

const feature = loadFeature('./test/bdd/manage-consumption-requests.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeRequestRepository: FakeRequestRepository;
  let grantedPermissions: Set<string>;
  let idempotencyStore: Map<string, { key: string; endpoint: string; response: unknown }>;
  let accessToken: string;
  let response: request.Response;
  const supplierIds = new Map<string, string>();
  const productIds = new Map<string, string>();
  const locationIds = new Map<string, string>();

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeRequestRepository = new FakeRequestRepository();
    grantedPermissions = new Set();
    idempotencyStore = new Map();
    supplierIds.clear();
    productIds.clear();
    locationIds.clear();

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
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, RequestsModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(RequestPrismaRepository)
      .useValue(fakeRequestRepository)
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

  const grantPermission = (and: any) => {
    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });
  };

  const seedProduct = (and: any) => {
    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakeRequestRepository.seedProduct(id, name);
    });
  };

  const seedLocation = (and: any) => {
    and(/^an existing active location "(.*)"$/, (name: string) => {
      const id = randomUUID();
      locationIds.set(name, id);
      fakeRequestRepository.seedLocation(id, name, 'active');
    });
  };

  const seedStock = (and: any) => {
    and(/^that product has (\d+) units? of stock at "(.*)"$/, (quantity: string, location: string) => {
      const productId = [...productIds.values()][productIds.size - 1];
      fakeRequestRepository.seedStock(productId, locationIds.get(location) as string, Number(quantity));
    });
  };

  const requestConsumption = async (
    quantity: string,
    product: string,
    location: string,
  ): Promise<request.Response> => {
    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        type: 'consumption',
        items: [{ productId: productIds.get(product), locationId: locationIds.get(location), quantity: Number(quantity) }],
      });
  };

  test('Requester creates a consumption request within available stock', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedProduct(and);
    seedLocation(and);
    seedStock(and);
    login(when);

    and(/^they request (\d+) units? of "(.*)" from "(.*)"$/, async (quantity: string, product: string, location: string) => {
      response = await requestConsumption(quantity, product, location);
    });

    then('the request is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the request status is "(.*)"$/, (status: string) => {
      expect(response.body.status).toBe(status);
    });
  });

  test('Requester can request exactly the available stock', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedProduct(and);
    seedLocation(and);
    seedStock(and);
    login(when);

    and(/^they request (\d+) units? of "(.*)" from "(.*)"$/, async (quantity: string, product: string, location: string) => {
      response = await requestConsumption(quantity, product, location);
    });

    then('the request is created successfully', () => {
      expect(response.status).toBe(201);
    });
  });

  test('Requesting more than the available stock is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedProduct(and);
    seedLocation(and);
    seedStock(and);
    login(when);

    and(/^they request (\d+) units? of "(.*)" from "(.*)"$/, async (quantity: string, product: string, location: string) => {
      response = await requestConsumption(quantity, product, location);
    });

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Requesting from a location with no stock at all is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedProduct(and);
    seedLocation(and);
    login(when);

    and(/^they request (\d+) units? of "(.*)" from "(.*)"$/, async (quantity: string, product: string, location: string) => {
      response = await requestConsumption(quantity, product, location);
    });

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('A consumption request cannot include a supplier', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakeRequestRepository.seedSupplier(id, name, 'active');
    });

    seedProduct(and);
    seedLocation(and);
    seedStock(and);
    login(when);

    and(
      /^they request (\d+) units? of "(.*)" from "(.*)" naming supplier "(.*)"$/,
      async (quantity: string, product: string, location: string, supplier: string) => {
        response = await request(app.getHttpServer())
          .post('/requests')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            type: 'consumption',
            supplierId: supplierIds.get(supplier),
            items: [{ productId: productIds.get(product), locationId: locationIds.get(location), quantity: Number(quantity) }],
          });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('A consumption request cannot be saved as a draft', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedProduct(and);
    seedLocation(and);
    seedStock(and);
    login(when);

    and(
      /^they try to save (\d+) units? of "(.*)" from "(.*)" as a draft$/,
      async (quantity: string, product: string, location: string) => {
        response = await request(app.getHttpServer())
          .post('/requests')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            type: 'consumption',
            saveAsDraft: true,
            items: [{ productId: productIds.get(product), locationId: locationIds.get(location), quantity: Number(quantity) }],
          });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Creating a consumption request with no items is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    login(when);

    and(/^they submit an empty consumption request$/, async () => {
      response = await request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Idempotency-Key', randomUUID())
        .send({ type: 'consumption' });
    });

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('A user without the requests:create permission cannot create a consumption request', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    seedProduct(and);
    seedLocation(and);
    seedStock(and);
    login(when);

    and(
      /^they attempt to request (\d+) units? of "(.*)" from "(.*)"$/,
      async (quantity: string, product: string, location: string) => {
        response = await requestConsumption(quantity, product, location);
      },
    );

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });
});
