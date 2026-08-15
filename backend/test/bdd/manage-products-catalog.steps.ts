import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RolesModule } from '../../src/modules/roles/roles.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { ProductsModule } from '../../src/modules/products/products.module';
import { ProductPrismaRepository } from '../../src/modules/products/infrastructure/product.prisma.repository';
import { CategoryPrismaRepository } from '../../src/modules/products/infrastructure/category.prisma.repository';
import { UnitPrismaRepository } from '../../src/modules/products/infrastructure/unit.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeProductRepository } from './support/fake-product.repository';
import { FakeCategoryRepository } from './support/fake-category.repository';
import { FakeUnitRepository } from './support/fake-unit.repository';

const feature = loadFeature('./test/bdd/manage-products-catalog.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeCategoryRepository: FakeCategoryRepository;
  let fakeUnitRepository: FakeUnitRepository;
  let fakeProductRepository: FakeProductRepository;
  let grantedPermissions: Set<string>;
  let accessToken: string;
  let response: request.Response;
  let seededUnitId: string;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeCategoryRepository = new FakeCategoryRepository();
    fakeUnitRepository = new FakeUnitRepository();
    fakeProductRepository = new FakeProductRepository(fakeUnitRepository, fakeCategoryRepository);
    grantedPermissions = new Set();

    const findFirst = jest.fn(async ({ where }: RolePermissionWhere) => {
      const key = `${where.role.name}:${where.permission.module}:${where.permission.action}`;
      return grantedPermissions.has(key) ? { roleId: 'fake-role-id', permissionId: 'fake-permission-id' } : null;
    });

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, ProductsModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(ProductPrismaRepository)
      .useValue(fakeProductRepository)
      .overrideProvider(CategoryPrismaRepository)
      .useValue(fakeCategoryRepository)
      .overrideProvider(UnitPrismaRepository)
      .useValue(fakeUnitRepository)
      .overrideProvider(PrismaService)
      .useValue({ rolePermission: { findFirst } })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('Administrator creates a product referencing an existing unit', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing unit "(.*)"$/, (name: string) => {
      seededUnitId = fakeUnitRepository.seed(name).id;
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and(/^they create a product named "(.*)" using that unit$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name, unitId: seededUnitId });
    });

    then('the product is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the unit name "(.*)"$/, (name: string) => {
      expect(response.body.unit.name).toBe(name);
    });
  });

  test('Administrator creates a new category', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and(/^they create a category named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('the category is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the category name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('A user without the products:create permission cannot create a product', ({
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

    and(/^an existing unit "(.*)"$/, (name: string) => {
      seededUnitId = fakeUnitRepository.seed(name).id;
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and(/^they attempt to create a product named "(.*)" using that unit$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name, unitId: seededUnitId });
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });
});
