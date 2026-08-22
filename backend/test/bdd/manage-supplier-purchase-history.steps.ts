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
import { PurchasesModule } from '../../src/modules/purchases/purchases.module';
import { PurchasePrismaRepository } from '../../src/modules/purchases/infrastructure/purchase.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakePurchaseRepository } from './support/fake-purchase.repository';

const feature = loadFeature('./test/bdd/manage-supplier-purchase-history.feature');

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

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakePurchaseRepository = new FakePurchaseRepository();
    grantedPermissions = new Set();

    const findFirst = jest.fn(async ({ where }: RolePermissionWhere) => {
      const key = `${where.role.name}:${where.permission.module}:${where.permission.action}`;
      return grantedPermissions.has(key) ? { roleId: 'fake-role-id', permissionId: 'fake-permission-id' } : null;
    });

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, PurchasesModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(PurchasePrismaRepository)
      .useValue(fakePurchaseRepository)
      .overrideProvider(PrismaService)
      .useValue({ rolePermission: { findFirst }, revokedToken: { findUnique: jest.fn().mockResolvedValue(null) }, auditEvent: { create: jest.fn().mockResolvedValue({}) } })
      .compile();

    app = moduleRef.createNestApplication();
    // HU-05 — this endpoint relies on PaginationQueryDto's class-field
    // defaults (page=1, pageSize=20), which are only applied when Nest
    // instantiates the DTO via ValidationPipe({transform:true}). Without
    // it, @Query() resolves to a plain object with undefined page/pageSize,
    // and toPrismaSkipTake() computes skip/take as NaN. Mirrors main.ts.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('Buyer views the purchase history of a supplier with purchases, newest first', ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    and(/^that supplier has a purchase dated "(.*)" for (\d+)$/, (date: string, amount: string) => {
      fakePurchaseRepository.seedPurchase(supplierId, new Date(date), Number(amount));
    });

    and(/^that supplier has a purchase dated "(.*)" for (\d+)$/, (date: string, amount: string) => {
      fakePurchaseRepository.seedPurchase(supplierId, new Date(date), Number(amount));
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request that supplier's purchase history$/, async () => {
      response = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}/purchases`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('the response is successful', () => {
      expect(response.status).toBe(200);
    });

    and(/^the history has (\d+) purchases$/, (count: string) => {
      expect(response.body.items).toHaveLength(Number(count));
      expect(response.body.total).toBe(Number(count));
    });

    and(/^the newest purchase in the history has a total amount of (\d+)$/, (amount: string) => {
      expect(response.body.items[0].totalAmount).toBe(Number(amount));
    });
  });

  test('Buyer views the purchase history of a supplier with no purchases', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request that supplier's purchase history$/, async () => {
      response = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}/purchases`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('the response is successful', () => {
      expect(response.status).toBe(200);
    });

    and(/^the history has (\d+) purchases$/, (count: string) => {
      expect(response.body.items).toHaveLength(Number(count));
      expect(response.body.total).toBe(Number(count));
    });
  });

  test('Requesting the purchase history of a supplier that does not exist is rejected', ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the purchase history of a supplier that does not exist$/, async () => {
      response = await request(app.getHttpServer())
        .get(`/suppliers/${randomUUID()}/purchases`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a not found error', () => {
      expect(response.status).toBe(404);
    });
  });

  test("A user without the purchases:read permission cannot view a supplier's purchase history", ({
    given,
    and,
    when,
    then,
  }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      supplierId = randomUUID();
      fakePurchaseRepository.seedSupplier(supplierId, name, 'active');
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request that supplier's purchase history$/, async () => {
      response = await request(app.getHttpServer())
        .get(`/suppliers/${supplierId}/purchases`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });
});
