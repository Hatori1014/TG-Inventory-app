import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RolesModule } from '../../src/modules/roles/roles.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';

const feature = loadFeature('./test/bdd/manage-users.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let grantedPermissions: Set<string>;
  let accessToken: string;
  let response: request.Response;
  let targetUserId: string;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    grantedPermissions = new Set();

    const findFirst = jest.fn(async ({ where }: RolePermissionWhere) => {
      const key = `${where.role.name}:${where.permission.module}:${where.permission.action}`;
      return grantedPermissions.has(key) ? { roleId: 'fake-role-id', permissionId: 'fake-permission-id' } : null;
    });

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(PrismaService)
      .useValue({ rolePermission: { findFirst }, revokedToken: { findUnique: jest.fn().mockResolvedValue(null) } })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('Administrator creates a user with a role, and that user can log in afterwards', ({
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

    and(/^an existing role "(.*)" with id "(.*)"$/, (roleName: string, roleId: string) => {
      fakeUserRepository.registerRole(roleId, roleName);
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        if (response.body.accessToken) {
          accessToken = response.body.accessToken;
        }
      },
    );

    and(
      /^they create a user named "(.*)" with email "(.*)", password "(.*)", and role id "(.*)"$/,
      async (name: string, email: string, password: string, roleId: string) => {
        response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name, email, password, roleId });
      },
    );

    then('the user is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the role name "(.*)"$/, (roleName: string) => {
      expect(response.body.role.name).toBe(roleName);
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      },
    );

    then('they receive a valid access token', () => {
      expect(response.status).toBe(200);
      expect(typeof response.body.accessToken).toBe('string');
    });

    and(/^the response includes their role "(.*)"$/, (role: string) => {
      expect(response.body.user.role).toBe(role);
    });
  });

  test("Administrator edits an existing user's role", ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing role "(.*)" with id "(.*)"$/, (roleName: string, roleId: string) => {
      fakeUserRepository.registerRole(roleId, roleName);
    });

    and(/^an existing user "(.*)" with role "(.*)"$/, (email: string, roleName: string) => {
      const user = fakeUserRepository.seed(email, 'existing-password', roleName);
      targetUserId = user.getId();
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and(/^they update the user's role to id "(.*)"$/, async (roleId: string) => {
      response = await request(app.getHttpServer())
        .patch(`/users/${targetUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ roleId });
    });

    then('the user update is successful', () => {
      expect(response.status).toBe(200);
    });

    and(/^the response includes the role name "(.*)"$/, (roleName: string) => {
      expect(response.body.role.name).toBe(roleName);
    });
  });

  test('A user without the users:create permission cannot create a user', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    and(/^an existing role "(.*)" with id "(.*)"$/, (roleName: string, roleId: string) => {
      fakeUserRepository.registerRole(roleId, roleName);
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and(
      /^they attempt to create a user named "(.*)" with email "(.*)", password "(.*)", and role id "(.*)"$/,
      async (name: string, email: string, password: string, roleId: string) => {
        response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name, email, password, roleId });
      },
    );

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Creating a user with a non-existent role is rejected', ({ given, and, when, then }) => {
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

    and(
      /^they create a user named "(.*)" with email "(.*)", password "(.*)", and role id "(.*)"$/,
      async (name: string, email: string, password: string, roleId: string) => {
        response = await request(app.getHttpServer())
          .post('/users')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name, email, password, roleId });
      },
    );

    then('they receive a bad request error', () => {
      expect(response.status).toBe(400);
    });
  });
});
