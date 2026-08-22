import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
import { PurchasePrismaRepository } from '../../src/modules/purchases/infrastructure/purchase.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeRequestRepository } from './support/fake-request.repository';
import { FakePurchaseRepository } from './support/fake-purchase.repository';

const feature = loadFeature('./test/bdd/manage-request-approvals.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

// HU-17 — approve/reject/integrate. RequestsModule now imports
// PurchasesModule (to reuse RegisterPurchaseUseCase for "Integrar al
// inventario"), so this suite overrides PurchasePrismaRepository with the
// same FakePurchaseRepository the purchases BDD suite already uses —
// same "never touches Postgres" reasoning as every other Fake here.
defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeRequestRepository: FakeRequestRepository;
  let fakePurchaseRepository: FakePurchaseRepository;
  let grantedPermissions: Set<string>;
  let idempotencyStore: Map<string, { key: string; endpoint: string; response: unknown }>;
  let response: request.Response;
  let requestId: string;
  const tokens = new Map<string, string>();
  const supplierIds = new Map<string, string>();
  const productIds = new Map<string, string>();
  const locationIds = new Map<string, string>();

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeRequestRepository = new FakeRequestRepository();
    fakePurchaseRepository = new FakePurchaseRepository();
    grantedPermissions = new Set();
    idempotencyStore = new Map();
    tokens.clear();
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
    // RejectRequestDto's mandatory comment (@IsNotEmpty()) only actually
    // rejects a missing one when ValidationPipe runs — mirrors main.ts,
    // same reasoning as manage-supplier-purchase-history.steps.ts.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
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

  const grantPermission = (and: any) => {
    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });
  };

  const seedSupplier = (and: any) => {
    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakeRequestRepository.seedSupplier(id, name, 'active');
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });
  };

  const seedProduct = (and: any) => {
    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakeRequestRepository.seedProduct(id, name);
      fakePurchaseRepository.seedProduct(id, name);
    });
  };

  const seedLocation = (and: any) => {
    and(/^an existing active location "(.*)"$/, (name: string) => {
      const id = randomUUID();
      locationIds.set(name, id);
      fakeRequestRepository.seedLocation(id, name, 'active');
      fakePurchaseRepository.seedLocation(id, name, 'active');
    });
  };

  const seedStock = (and: any) => {
    and(/^there are (\d+) units? of "(.*)" available at "(.*)"$/, (quantity: string, product: string, location: string) => {
      fakeRequestRepository.seedStock(
        productIds.get(product) as string,
        locationIds.get(location) as string,
        Number(quantity),
      );
    });
  };

  const seedRequiredApprovals = (and: any) => {
    and(/^a (purchase|consumption) request requires (\d+) approvals?$/, (type: string, count: string) => {
      fakeRequestRepository.seedRequiredApprovals(type as 'purchase' | 'consumption', Number(count));
    });
  };

  const loginAs = async (email: string): Promise<string> => {
    if (tokens.has(email)) {
      return tokens.get(email) as string;
    }
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'correct-password' });
    tokens.set(email, loginResponse.body.accessToken);
    return loginResponse.body.accessToken;
  };

  const submitPurchase = (when: any) => {
    when(
      /^"(.*)" logs in and submits a purchase request to supplier "(.*)" for (\d+) units? of "(.*)" at "(.*)"$/,
      async (email: string, supplier: string, quantity: string, product: string, location: string) => {
        const token = await loginAs(email);
        response = await request(app.getHttpServer())
          .post('/requests')
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            type: 'purchase',
            supplierId: supplierIds.get(supplier),
            items: [{ productId: productIds.get(product), locationId: locationIds.get(location), quantity: Number(quantity) }],
          });
        requestId = response.body.id;
      },
    );
  };

  const submitConsumption = (when: any) => {
    when(
      /^"(.*)" logs in and submits a consumption request for (\d+) units? of "(.*)" at "(.*)"$/,
      async (email: string, quantity: string, product: string, location: string) => {
        const token = await loginAs(email);
        response = await request(app.getHttpServer())
          .post('/requests')
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', randomUUID())
          .send({
            type: 'consumption',
            items: [{ productId: productIds.get(product), locationId: locationIds.get(location), quantity: Number(quantity) }],
          });
        requestId = response.body.id;
      },
    );
  };

  const approveStep = (and: any) => {
    and(/^"(.*)" approves that request$/, async (email: string) => {
      const token = await loginAs(email);
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({});
    });
  };

  const statusCheck = (then: any) => {
    then(/^the request status is "(.*)"$/, (status: string) => {
      expect(response.body.status).toBe(status);
    });
  };

  test('A purchase request needs both required approvals before it can be integrated', ({ given, and, when, then }) => {
    givenUser(given);
    givenUser(given);
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    seedSupplier(and);
    seedProduct(and);
    seedLocation(and);
    seedRequiredApprovals(and);
    submitPurchase(when);
    approveStep(and);
    statusCheck(then);

    when(/^"(.*)" approves that request$/, async (email: string) => {
      const token = await loginAs(email);
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({});
    });

    statusCheck(then);
  });

  test('A single rejection closes the request immediately, with a mandatory comment', ({ given, and, when, then }) => {
    givenUser(given);
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    seedSupplier(and);
    seedProduct(and);
    seedLocation(and);
    seedRequiredApprovals(and);
    submitPurchase(when);

    and(/^"(.*)" rejects that request with comment "(.*)"$/, async (email: string, comment: string) => {
      const token = await loginAs(email);
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({ comment });
    });

    statusCheck(then);

    and(/^the last approval decision is "(.*)" with comment "(.*)"$/, (decision: string, comment: string) => {
      const lastApproval = response.body.approvals[response.body.approvals.length - 1];
      expect(lastApproval.decision).toBe(decision);
      expect(lastApproval.comment).toBe(comment);
    });
  });

  test('Rejecting a request without a comment is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    seedSupplier(and);
    seedProduct(and);
    seedLocation(and);
    submitPurchase(when);

    and(/^"(.*)" tries to reject that request without a comment$/, async (email: string) => {
      const token = await loginAs(email);
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({});
    });

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('A requester cannot approve their own request', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    seedSupplier(and);
    seedProduct(and);
    seedLocation(and);
    submitPurchase(when);

    and(/^"(.*)" tries to approve their own request$/, async (email: string) => {
      const token = await loginAs(email);
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({});
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('An approver cannot vote twice on the same request', ({ given, and, when, then }) => {
    givenUser(given);
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    seedSupplier(and);
    seedProduct(and);
    seedLocation(and);
    seedRequiredApprovals(and);
    submitPurchase(when);
    approveStep(and);

    and(/^"(.*)" tries to approve that request again$/, async (email: string) => {
      const token = await loginAs(email);
      response = await request(app.getHttpServer())
        .patch(`/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', randomUUID())
        .send({});
    });

    then('they receive a conflict error', () => {
      expect(response.status).toBe(409);
    });
  });

  test('A single approval resolves a consumption request and applies the real stock movement', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    seedProduct(and);
    seedLocation(and);
    seedStock(and);
    seedRequiredApprovals(and);
    submitConsumption(when);
    approveStep(and);
    statusCheck(then);
  });

  test('The inventory admin integrates an approved purchase request into a real purchase', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);
    givenUser(given);
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    grantPermission(and);
    seedSupplier(and);
    seedProduct(and);
    seedLocation(and);
    seedRequiredApprovals(and);
    submitPurchase(when);
    approveStep(and);
    statusCheck(then);

    when(
      /^"(.*)" integrates that request receiving (\d+) units? at unit price (\d+)$/,
      async (email: string, quantity: string, unitPrice: string) => {
        const token = await loginAs(email);
        const requestItemId = response.body.items[0].id;
        response = await request(app.getHttpServer())
          .patch(`/requests/${requestId}/integrate`)
          .set('Authorization', `Bearer ${token}`)
          .set('Idempotency-Key', randomUUID())
          .send({ items: [{ requestItemId, unitPrice: Number(unitPrice) }] });
      },
    );

    then(/^the request status is "(.*)"$/, (status: string) => {
      expect(response.body.status).toBe(status);
    });

    and('the request has an associated purchase', () => {
      expect(response.body.purchaseId).toBeTruthy();
    });
  });
});
