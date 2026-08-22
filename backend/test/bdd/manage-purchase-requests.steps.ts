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

const feature = loadFeature('./test/bdd/manage-purchase-requests.feature');

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
  let requestId: string;
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
        revokedToken: { findUnique: jest.fn().mockResolvedValue(null) }, auditEvent: { create: jest.fn().mockResolvedValue({}) },
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

  const loginAs = async (email: string, password = 'correct-password'): Promise<string> => {
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
    return loginResponse.body.accessToken;
  };

  const submitPurchaseRequest = async (
    token: string,
    supplierName: string,
    quantity: string,
    productName: string,
    locationName: string,
  ): Promise<request.Response> => {
    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({
        type: 'purchase',
        supplierId: supplierIds.get(supplierName),
        items: [{ productId: productIds.get(productName), locationId: locationIds.get(locationName), quantity: Number(quantity) }],
      });
  };

  const saveEmptyDraft = async (token: string): Promise<request.Response> => {
    return request(app.getHttpServer())
      .post('/requests')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID())
      .send({ type: 'purchase', saveAsDraft: true });
  };

  test('Requester submits a purchase request directly', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakeRequestRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakeRequestRepository.seedProduct(id, name);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      const id = randomUUID();
      locationIds.set(name, id);
      fakeRequestRepository.seedLocation(id, name, 'active');
    });

    login(when);

    and(
      /^they submit a purchase request to supplier "(.*)" for (\d+) units? of "(.*)" at "(.*)"$/,
      async (supplier: string, quantity: string, product: string, location: string) => {
        response = await submitPurchaseRequest(accessToken, supplier, quantity, product, location);
        requestId = response.body?.id;
      },
    );

    then('the request is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the request status is "(.*)"$/, (status: string) => {
      expect(response.body.status).toBe(status);
    });
  });

  test('Requester saves a purchase request as a draft with nothing filled in yet', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    login(when);

    and(/^they save an empty purchase request as a draft$/, async () => {
      response = await saveEmptyDraft(accessToken);
      requestId = response.body?.id;
    });

    then('the request is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the request status is "(.*)"$/, (status: string) => {
      expect(response.body.status).toBe(status);
    });
  });

  test('Submitting a purchase request directly without a supplier is rejected', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakeRequestRepository.seedProduct(id, name);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      const id = randomUUID();
      locationIds.set(name, id);
      fakeRequestRepository.seedLocation(id, name, 'active');
    });

    login(when);

    and(
      /^they submit a purchase request without a supplier for (\d+) units? of "(.*)" at "(.*)"$/,
      async (quantity: string, product: string, location: string) => {
        response = await request(app.getHttpServer())
          .post('/requests')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            type: 'purchase',
            items: [{ productId: productIds.get(product), locationId: locationIds.get(location), quantity: Number(quantity) }],
          });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Requester edits their own draft and then submits it', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakeRequestRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakeRequestRepository.seedProduct(id, name);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      const id = randomUUID();
      locationIds.set(name, id);
      fakeRequestRepository.seedLocation(id, name, 'active');
    });

    login(when);

    and(/^they save an empty purchase request as a draft$/, async () => {
      response = await saveEmptyDraft(accessToken);
      requestId = response.body?.id;
    });

    and(
      /^they edit that draft to supplier "(.*)" with (\d+) units? of "(.*)" at "(.*)"$/,
      async (supplier: string, quantity: string, product: string, location: string) => {
        response = await request(app.getHttpServer())
          .patch(`/requests/${requestId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            supplierId: supplierIds.get(supplier),
            items: [{ productId: productIds.get(product), locationId: locationIds.get(location), quantity: Number(quantity) }],
          });
      },
    );

    and(/^they submit that draft$/, async () => {
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/submit`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then(/^the request status is "(.*)"$/, (status: string) => {
      expect(response.body.status).toBe(status);
    });
  });

  test("A requester cannot edit another requester's draft", ({ given, and, when, then }) => {
    givenUser(given);
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    login(when);

    and(/^they save an empty purchase request as a draft$/, async () => {
      response = await saveEmptyDraft(accessToken);
      requestId = response.body?.id;
    });

    and(/^"(.*)" logs in and tries to edit that draft$/, async (email: string) => {
      const otherToken = await loginAs(email);
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send({ notes: 'trying to edit someone else\'s draft' });
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Editing a request that is no longer a draft is rejected', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakeRequestRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakeRequestRepository.seedProduct(id, name);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      const id = randomUUID();
      locationIds.set(name, id);
      fakeRequestRepository.seedLocation(id, name, 'active');
    });

    login(when);

    and(
      /^they submit a purchase request to supplier "(.*)" for (\d+) units? of "(.*)" at "(.*)"$/,
      async (supplier: string, quantity: string, product: string, location: string) => {
        response = await submitPurchaseRequest(accessToken, supplier, quantity, product, location);
        requestId = response.body?.id;
      },
    );

    and(/^they try to edit that already-submitted request$/, async () => {
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ notes: 'too late' });
    });

    then('they receive a conflict error', () => {
      expect(response.status).toBe(409);
    });
  });

  test('Requester lists only their own requests', ({ given, and, when, then }) => {
    givenUser(given);
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });
    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakeRequestRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakeRequestRepository.seedProduct(id, name);
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      const id = randomUUID();
      locationIds.set(name, id);
      fakeRequestRepository.seedLocation(id, name, 'active');
    });

    when(
      /^"(.*)" logs in and submits a purchase request to supplier "(.*)" for (\d+) units? of "(.*)" at "(.*)"$/,
      async (email: string, supplier: string, quantity: string, product: string, location: string) => {
        const otherToken = await loginAs(email);
        await submitPurchaseRequest(otherToken, supplier, quantity, product, location);
      },
    );

    login(when);

    and(/^they save an empty purchase request as a draft$/, async () => {
      await saveEmptyDraft(accessToken);
    });

    and(/^they list their own requests$/, async () => {
      response = await request(app.getHttpServer())
        .get('/requests')
        .query({ page: 1, pageSize: 20 })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then(/^the list has (\d+) requests$/, (count: string) => {
      expect(response.body.items).toHaveLength(Number(count));
    });
  });

  test("A requester cannot view another requester's request", ({ given, and, when, then }) => {
    givenUser(given);
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });
    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    when(/^"(.*)" logs in and saves an empty purchase request as a draft$/, async (email: string) => {
      const otherToken = await loginAs(email);
      const otherResponse = await saveEmptyDraft(otherToken);
      requestId = otherResponse.body.id;
    });

    login(when);

    and(/^they try to view that other request$/, async () => {
      response = await request(app.getHttpServer()).get(`/requests/${requestId}`).set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Creating a request that references a product that does not exist is rejected', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakeRequestRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing active location "(.*)"$/, (name: string) => {
      const id = randomUUID();
      locationIds.set(name, id);
      fakeRequestRepository.seedLocation(id, name, 'active');
    });

    login(when);

    and(
      /^they submit a purchase request to supplier "(.*)" for (\d+) units? of a product that does not exist at "(.*)"$/,
      async (supplier: string, quantity: string, location: string) => {
        response = await request(app.getHttpServer())
          .post('/requests')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            type: 'purchase',
            supplierId: supplierIds.get(supplier),
            items: [{ productId: randomUUID(), locationId: locationIds.get(location), quantity: Number(quantity) }],
          });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('A user without the requests:create permission cannot create a request', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    login(when);

    and(/^they attempt to save an empty purchase request as a draft$/, async () => {
      response = await saveEmptyDraft(accessToken);
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });
});
