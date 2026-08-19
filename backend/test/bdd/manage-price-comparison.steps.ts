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

const feature = loadFeature('./test/bdd/manage-price-comparison.feature');

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
  const supplierIds = new Map<string, string>();
  const productIds = new Map<string, string>();

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakePurchaseRepository = new FakePurchaseRepository();
    grantedPermissions = new Set();
    supplierIds.clear();
    productIds.clear();

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
      .useValue({ rolePermission: { findFirst }, revokedToken: { findUnique: jest.fn().mockResolvedValue(null) } })
      .compile();

    app = moduleRef.createNestApplication();
    // Same gap HU-05 found: Test.createTestingModule() doesn't apply the
    // global ValidationPipe main.ts does, so query DTO validation
    // (@IsUUID, @ArrayMinSize/@ArrayMaxSize) never runs without this.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test("Buyer compares a product's price across suppliers, cheapest first", ({ given, and, when, then }) => {
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
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakePurchaseRepository.seedProduct(id, name);
    });

    and(/^supplier "(.*)" sold "(.*)" at (\d+) on "(.*)"$/, (supplier: string, product: string, price: string, date: string) => {
      fakePurchaseRepository.seedPriceEntry(
        productIds.get(product) as string,
        supplierIds.get(supplier) as string,
        Number(price),
        new Date(date),
      );
    });

    and(/^supplier "(.*)" sold "(.*)" at (\d+) on "(.*)"$/, (supplier: string, product: string, price: string, date: string) => {
      fakePurchaseRepository.seedPriceEntry(
        productIds.get(product) as string,
        supplierIds.get(supplier) as string,
        Number(price),
        new Date(date),
      );
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the price comparison for product "(.*)"$/, async (product: string) => {
      response = await request(app.getHttpServer())
        .get('/reports/price-comparison')
        .query({ productId: productIds.get(product) })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('the response is successful', () => {
      expect(response.status).toBe(200);
    });

    and(/^the price comparison lists (\d+) suppliers$/, (count: string) => {
      expect(response.body.suppliers).toHaveLength(Number(count));
    });

    and(/^the cheapest supplier in the comparison is "(.*)" at (\d+)$/, (supplier: string, price: string) => {
      expect(response.body.suppliers[0].supplierName).toBe(supplier);
      expect(response.body.suppliers[0].latestUnitPrice).toBe(Number(price));
    });
  });

  test("Buyer compares a product only one supplier has sold at different prices over time", ({
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
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakePurchaseRepository.seedProduct(id, name);
    });

    and(/^supplier "(.*)" sold "(.*)" at (\d+) on "(.*)"$/, (supplier: string, product: string, price: string, date: string) => {
      fakePurchaseRepository.seedPriceEntry(
        productIds.get(product) as string,
        supplierIds.get(supplier) as string,
        Number(price),
        new Date(date),
      );
    });

    and(/^supplier "(.*)" sold "(.*)" at (\d+) on "(.*)"$/, (supplier: string, product: string, price: string, date: string) => {
      fakePurchaseRepository.seedPriceEntry(
        productIds.get(product) as string,
        supplierIds.get(supplier) as string,
        Number(price),
        new Date(date),
      );
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the price comparison for product "(.*)"$/, async (product: string) => {
      response = await request(app.getHttpServer())
        .get('/reports/price-comparison')
        .query({ productId: productIds.get(product) })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('the response is successful', () => {
      expect(response.status).toBe(200);
    });

    and(/^the price comparison lists (\d+) suppliers$/, (count: string) => {
      expect(response.body.suppliers).toHaveLength(Number(count));
    });

    and(/^the cheapest supplier in the comparison is "(.*)" at (\d+)$/, (supplier: string, price: string) => {
      expect(response.body.suppliers[0].supplierName).toBe(supplier);
      expect(response.body.suppliers[0].latestUnitPrice).toBe(Number(price));
    });
  });

  test('Buyer compares a product no supplier has ever sold', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakePurchaseRepository.seedProduct(id, name);
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the price comparison for product "(.*)"$/, async (product: string) => {
      response = await request(app.getHttpServer())
        .get('/reports/price-comparison')
        .query({ productId: productIds.get(product) })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('the response is successful', () => {
      expect(response.status).toBe(200);
    });

    and(/^the price comparison lists (\d+) suppliers$/, (count: string) => {
      expect(response.body.suppliers).toHaveLength(Number(count));
    });
  });

  test('Requesting the price comparison of a product that does not exist is rejected', ({
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

    and(/^they request the price comparison of a product that does not exist$/, async () => {
      response = await request(app.getHttpServer())
        .get('/reports/price-comparison')
        .query({ productId: randomUUID() })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a not found error', () => {
      expect(response.status).toBe(404);
    });
  });

  test('A user without the purchases:read permission cannot compare product prices', ({
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

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakePurchaseRepository.seedProduct(id, name);
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the price comparison for product "(.*)"$/, async (product: string) => {
      response = await request(app.getHttpServer())
        .get('/reports/price-comparison')
        .query({ productId: productIds.get(product) })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Buyer compares the monthly average price trend of two suppliers', ({ given, and, when, then }) => {
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
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakePurchaseRepository.seedProduct(id, name);
    });

    and(/^an existing product "(.*)"$/, (name: string) => {
      const id = randomUUID();
      productIds.set(name, id);
      fakePurchaseRepository.seedProduct(id, name);
    });

    and(/^supplier "(.*)" sold "(.*)" at (\d+) on "(.*)"$/, (supplier: string, product: string, price: string, date: string) => {
      fakePurchaseRepository.seedPriceEntry(
        productIds.get(product) as string,
        supplierIds.get(supplier) as string,
        Number(price),
        new Date(date),
      );
    });

    and(/^supplier "(.*)" sold "(.*)" at (\d+) on "(.*)"$/, (supplier: string, product: string, price: string, date: string) => {
      fakePurchaseRepository.seedPriceEntry(
        productIds.get(product) as string,
        supplierIds.get(supplier) as string,
        Number(price),
        new Date(date),
      );
    });

    and(/^supplier "(.*)" sold "(.*)" at (\d+) on "(.*)"$/, (supplier: string, product: string, price: string, date: string) => {
      fakePurchaseRepository.seedPriceEntry(
        productIds.get(product) as string,
        supplierIds.get(supplier) as string,
        Number(price),
        new Date(date),
      );
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the monthly price comparison for suppliers "(.*)" and "(.*)"$/, async (s1: string, s2: string) => {
      response = await request(app.getHttpServer())
        .get('/reports/supplier-price-comparison')
        .query({ supplierIds: [supplierIds.get(s1), supplierIds.get(s2)] })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('the response is successful', () => {
      expect(response.status).toBe(200);
    });

    and(/^the monthly comparison has (\d+) months$/, (count: string) => {
      expect(response.body.rows).toHaveLength(Number(count));
    });

    and(/^the average price for "(.*)" in month "(.*)" is (\d+)$/, (supplier: string, month: string, average: string) => {
      const row = response.body.rows.find((r: { month: string }) => r.month === month);
      expect(row.averageBySupplier[supplierIds.get(supplier) as string]).toBe(Number(average));
    });

    and(/^the average price for "(.*)" in month "(.*)" is (\d+)$/, (supplier: string, month: string, average: string) => {
      const row = response.body.rows.find((r: { month: string }) => r.month === month);
      expect(row.averageBySupplier[supplierIds.get(supplier) as string]).toBe(Number(average));
    });
  });

  test('Requesting a monthly comparison with only one supplier is rejected', ({ given, and, when, then }) => {
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
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the monthly price comparison for a single supplier$/, async () => {
      response = await request(app.getHttpServer())
        .get('/reports/supplier-price-comparison')
        .query({ supplierIds: [supplierIds.get('Acme Corp')] })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Requesting a monthly comparison that includes a supplier that does not exist is rejected', ({
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
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the monthly price comparison including a supplier that does not exist$/, async () => {
      response = await request(app.getHttpServer())
        .get('/reports/supplier-price-comparison')
        .query({ supplierIds: [supplierIds.get('Acme Corp'), randomUUID()] })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a not found error', () => {
      expect(response.status).toBe(404);
    });
  });

  test('A user without the purchases:read permission cannot compare supplier price trends', ({
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
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    and(/^an existing active supplier "(.*)"$/, (name: string) => {
      const id = randomUUID();
      supplierIds.set(name, id);
      fakePurchaseRepository.seedSupplier(id, name, 'active');
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they request the monthly price comparison for suppliers "(.*)" and "(.*)"$/, async (s1: string, s2: string) => {
      response = await request(app.getHttpServer())
        .get('/reports/supplier-price-comparison')
        .query({ supplierIds: [supplierIds.get(s1), supplierIds.get(s2)] })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });
});
