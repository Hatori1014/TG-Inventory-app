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
import { MinimumStockPrismaRepository } from '../../src/modules/inventory/infrastructure/minimum-stock.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeMinimumStockRepository } from './support/fake-minimum-stock.repository';

const feature = loadFeature('./test/bdd/manage-stock-alerts.feature');

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeMinimumStockRepository: FakeMinimumStockRepository;
  let accessToken: string;
  let response: request.Response;
  const productNames = new Map<string, string>();

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeMinimumStockRepository = new FakeMinimumStockRepository();
    productNames.clear();

    // GET /alerts is "any authenticated user" (HU-12, same as HU-10's
    // GET /inventory/stock) — no @RequirePermission() to gate, so
    // rolePermission.findFirst is never consulted, but PrismaService still
    // needs a stub since RolesModule/AuthModule wire it regardless.
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, InventoryModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(MinimumStockPrismaRepository)
      .useValue(fakeMinimumStockRepository)
      .overrideProvider(PrismaService)
      .useValue({
        rolePermission: { findFirst: jest.fn().mockResolvedValue(null) },
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

  const seedProduct = (and: any) => {
    and(/^an existing product "(.*)" named "(.*)"$/, (productId: string, name: string) => {
      productNames.set(productId, name);
      fakeMinimumStockRepository.seedProduct(productId, name);
    });
  };

  const seedMinimum = (and: any) => {
    and(/^that product has a minimum of (\d+) defined$/, async (minimum: string) => {
      const productId = [...productNames.keys()][productNames.size - 1];
      await fakeMinimumStockRepository.create({ productId, minimumQuantity: Number(minimum) });
    });
  };

  const seedStock = (and: any) => {
    and(/^that product has (\d+) units? of stock at location "(.*)"$/, (quantity: string, locationId: string) => {
      const productId = [...productNames.keys()][productNames.size - 1];
      fakeMinimumStockRepository.seedStock(productId, locationId, Number(quantity));
    });
  };

  const requestAlerts = (and: any) => {
    and(/^they request the alerts panel$/, async () => {
      response = await request(app.getHttpServer()).get('/alerts').set('Authorization', `Bearer ${accessToken}`);
    });
  };

  const thenSuccessful = (then: any) => {
    then('the response is successful', () => {
      expect(response.status).toBe(200);
    });
  };

  test("A product whose total stock across locations is below its minimum appears in the panel", ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);
    seedProduct(and);
    seedMinimum(and);
    seedStock(and);
    seedStock(and);
    seedStock(and);
    login(when);
    requestAlerts(and);
    thenSuccessful(then);

    and(/^the panel includes "(.*)" with a total of (\d+)$/, (name: string, total: string) => {
      const alert = response.body.find((a: any) => a.productName === name);
      expect(alert).toBeDefined();
      expect(alert.totalQuantity).toBe(Number(total));
    });
  });

  test('A product whose total stock exactly equals its minimum still alerts', ({ given, and, when, then }) => {
    givenUser(given);
    seedProduct(and);
    seedMinimum(and);
    seedStock(and);
    login(when);
    requestAlerts(and);
    thenSuccessful(then);

    and(/^the panel includes "(.*)" with a total of (\d+)$/, (name: string, total: string) => {
      const alert = response.body.find((a: any) => a.productName === name);
      expect(alert).toBeDefined();
      expect(alert.totalQuantity).toBe(Number(total));
    });
  });

  test('A product whose total stock is above its minimum does not appear in the panel', ({
    given,
    and,
    when,
    then,
  }) => {
    givenUser(given);
    seedProduct(and);
    seedMinimum(and);
    seedStock(and);
    login(when);
    requestAlerts(and);
    thenSuccessful(then);

    and(/^the panel does not include "(.*)"$/, (name: string) => {
      expect(response.body.some((a: any) => a.productName === name)).toBe(false);
    });
  });

  test('A product with a minimum defined but no stock anywhere still alerts', ({ given, and, when, then }) => {
    givenUser(given);
    seedProduct(and);
    seedMinimum(and);
    login(when);
    requestAlerts(and);
    thenSuccessful(then);

    and(/^the panel includes "(.*)" with a total of (\d+)$/, (name: string, total: string) => {
      const alert = response.body.find((a: any) => a.productName === name);
      expect(alert).toBeDefined();
      expect(alert.totalQuantity).toBe(Number(total));
    });
  });

  test('The most urgent product (largest deficit) appears first', ({ given, and, when, then }) => {
    givenUser(given);
    seedProduct(and);
    seedMinimum(and);
    seedStock(and);
    seedProduct(and);
    seedMinimum(and);
    seedStock(and);
    login(when);
    requestAlerts(and);
    thenSuccessful(then);

    and(/^"(.*)" appears before "(.*)" in the panel$/, (first: string, second: string) => {
      const names = response.body.map((a: any) => a.productName);
      expect(names.indexOf(first)).toBeLessThan(names.indexOf(second));
    });
  });

  test('A user with no special permission can still view the alerts panel', ({ given, and, when, then }) => {
    givenUser(given);
    seedProduct(and);
    seedMinimum(and);
    seedStock(and);
    login(when);
    requestAlerts(and);
    thenSuccessful(then);

    and(/^the panel includes "(.*)" with a total of (\d+)$/, (name: string, total: string) => {
      const alert = response.body.find((a: any) => a.productName === name);
      expect(alert).toBeDefined();
      expect(alert.totalQuantity).toBe(Number(total));
    });
  });
});
