import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RolesModule } from '../../src/modules/roles/roles.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { LocationsModule } from '../../src/modules/locations/locations.module';
import { LocationPrismaRepository } from '../../src/modules/locations/infrastructure/location.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeLocationRepository } from './support/fake-location.repository';

const feature = loadFeature('./test/bdd/manage-locations.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeLocationRepository: FakeLocationRepository;
  let grantedPermissions: Set<string>;
  let accessToken: string;
  let response: request.Response;
  let seededLocationId: string;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeLocationRepository = new FakeLocationRepository();
    grantedPermissions = new Set();

    const findFirst = jest.fn(async ({ where }: RolePermissionWhere) => {
      const key = `${where.role.name}:${where.permission.module}:${where.permission.action}`;
      return grantedPermissions.has(key) ? { roleId: 'fake-role-id', permissionId: 'fake-permission-id' } : null;
    });

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, LocationsModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(LocationPrismaRepository)
      .useValue(fakeLocationRepository)
      .overrideProvider(PrismaService)
      .useValue({ rolePermission: { findFirst } })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('Administrator creates a root location', ({ given, and, when, then }) => {
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

    and(/^they create a location named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('the location is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the location name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Administrator creates a child location under an existing parent', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing location "(.*)"$/, (name: string) => {
      seededLocationId = fakeLocationRepository.seed(name).id;
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they create a location named "(.*)" under that parent$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name, parentId: seededLocationId });
    });

    then('the location is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the location name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Creating a location with a duplicate name under the same parent is rejected', ({
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

    and(/^an existing location "(.*)"$/, (name: string) => {
      seededLocationId = fakeLocationRepository.seed(name).id;
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they create a location named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('they receive a conflict error', () => {
      expect(response.status).toBe(409);
    });
  });

  test('A user without the locations:create permission cannot create a location', ({
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

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they attempt to create a location named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/locations')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Administrator deactivates a location instead of deleting it', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing location "(.*)"$/, (name: string) => {
      seededLocationId = fakeLocationRepository.seed(name).id;
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they deactivate that location$/, async () => {
      response = await request(app.getHttpServer())
        .patch(`/locations/${seededLocationId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'inactive' });
    });

    then('the location is updated successfully', () => {
      expect(response.status).toBe(200);
    });

    and('the response shows the location as inactive', () => {
      expect(response.body.status).toBe('inactive');
    });
  });
});
