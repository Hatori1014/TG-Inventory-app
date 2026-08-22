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
import { InventoryModule } from '../../src/modules/inventory/inventory.module';
import { MinimumStockPrismaRepository } from '../../src/modules/inventory/infrastructure/minimum-stock.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeMinimumStockRepository } from './support/fake-minimum-stock.repository';

const feature = loadFeature('./test/bdd/manage-minimum-stock.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeMinimumStockRepository: FakeMinimumStockRepository;
  let grantedPermissions: Set<string>;
  let accessToken: string;
  let response: request.Response;
  let minimumStockId: string;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeMinimumStockRepository = new FakeMinimumStockRepository();
    grantedPermissions = new Set();

    const findFirst = jest.fn(async ({ where }: RolePermissionWhere) => {
      const key = `${where.role.name}:${where.permission.module}:${where.permission.action}`;
      return grantedPermissions.has(key) ? { roleId: 'fake-role-id', permissionId: 'fake-permission-id' } : null;
    });

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, InventoryModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(MinimumStockPrismaRepository)
      .useValue(fakeMinimumStockRepository)
      .overrideProvider(PrismaService)
      .useValue({ rolePermission: { findFirst }, revokedToken: { findUnique: jest.fn().mockResolvedValue(null) }, auditEvent: { create: jest.fn().mockResolvedValue({}) } })
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
    and(/^an existing product "(.*)"$/, (productId: string) => {
      fakeMinimumStockRepository.seedProduct(productId, 'Arroz');
    });
  };

  const seedExistingMinimum = (and: any) => {
    and(/^that product already has a minimum of (\d+) defined$/, async (minimum: string) => {
      const created = await fakeMinimumStockRepository.create({ productId: 'p1', minimumQuantity: Number(minimum) });
      minimumStockId = created.id;
    });
  };

  test('Administrator defines a minimum for a product that does not have one yet', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedProduct(and);
    login(when);

    and(/^they define a minimum of (\d+) for product "(.*)"$/, async (minimum: string, productId: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/minimum-stock')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, minimumQuantity: Number(minimum) });
    });

    then('the minimum is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes a minimum quantity of (\d+)$/, (minimum: string) => {
      expect(response.body.minimumQuantity).toBe(Number(minimum));
    });
  });

  test('Defining a second minimum for a product that already has one is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedProduct(and);
    seedExistingMinimum(and);
    login(when);

    and(/^they define a minimum of (\d+) for product "(.*)"$/, async (minimum: string, productId: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/minimum-stock')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, minimumQuantity: Number(minimum) });
    });

    then('they receive a conflict error', () => {
      expect(response.status).toBe(409);
    });
  });

  test('Administrator edits an existing minimum', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    seedProduct(and);
    seedExistingMinimum(and);
    login(when);

    and(/^they edit that minimum to (\d+)$/, async (minimum: string) => {
      response = await request(app.getHttpServer())
        .patch(`/inventory/minimum-stock/${minimumStockId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ minimumQuantity: Number(minimum) });
    });

    then('the minimum is updated successfully', () => {
      expect(response.status).toBe(200);
    });

    and(/^the response includes a minimum quantity of (\d+)$/, (minimum: string) => {
      expect(response.body.minimumQuantity).toBe(Number(minimum));
    });
  });

  test('Defining a minimum for a product that does not exist is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    login(when);

    and(/^they define a minimum of (\d+) for a product that does not exist$/, async (minimum: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/minimum-stock')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId: randomUUID(), minimumQuantity: Number(minimum) });
    });

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });

  test('Editing a minimum that does not exist is rejected', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    login(when);

    and(/^they attempt to edit a minimum that does not exist$/, async () => {
      response = await request(app.getHttpServer())
        .patch(`/inventory/minimum-stock/${randomUUID()}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ minimumQuantity: 10 });
    });

    then('they receive a not found error', () => {
      expect(response.status).toBe(404);
    });
  });

  test('Administrator lists the minimum stock thresholds', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    grantPermission(and);
    seedProduct(and);
    login(when);

    and(/^they define a minimum of (\d+) for product "(.*)"$/, async (minimum: string, productId: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/minimum-stock')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, minimumQuantity: Number(minimum) });
    });

    and(/^they list the minimum stock thresholds$/, async () => {
      response = await request(app.getHttpServer())
        .get('/inventory/minimum-stock')
        .query({ page: 1, pageSize: 20 })
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then(/^the list includes a minimum quantity of (\d+)$/, (minimum: string) => {
      expect(response.body.items.some((m: any) => m.minimumQuantity === Number(minimum))).toBe(true);
    });
  });

  test('A user without the inventory:create permission cannot define a minimum', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    seedProduct(and);
    login(when);

    and(/^they attempt to define a minimum of (\d+) for product "(.*)"$/, async (minimum: string, productId: string) => {
      response = await request(app.getHttpServer())
        .post('/inventory/minimum-stock')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ productId, minimumQuantity: Number(minimum) });
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('A user without the inventory:update permission cannot edit a minimum', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    seedProduct(and);
    seedExistingMinimum(and);
    login(when);

    and(/^they attempt to edit that minimum to (\d+)$/, async (minimum: string) => {
      response = await request(app.getHttpServer())
        .patch(`/inventory/minimum-stock/${minimumStockId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ minimumQuantity: Number(minimum) });
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });
});
