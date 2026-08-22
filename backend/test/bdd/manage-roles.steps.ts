import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { RolesModule } from '../../src/modules/roles/roles.module';
import { ROLE_REPOSITORY } from '../../src/modules/roles/domain/role.repository.interface';
import { PERMISSION_REPOSITORY } from '../../src/modules/roles/domain/permission.repository.interface';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakePermissionRepository } from './support/fake-permission.repository';
import { FakeRoleRepository } from './support/fake-role.repository';

const feature = loadFeature('./test/bdd/manage-roles.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakePermissionRepository: FakePermissionRepository;
  let fakeRoleRepository: FakeRoleRepository;
  let grantedPermissions: Set<string>;
  let accessToken: string;
  let response: request.Response;
  let seededRoleId: string;
  let seededPermissionId: string;
  const roleIdsByName = new Map<string, string>();

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakePermissionRepository = new FakePermissionRepository();
    fakeRoleRepository = new FakeRoleRepository(fakePermissionRepository);
    grantedPermissions = new Set();
    roleIdsByName.clear();

    const findFirst = jest.fn(async ({ where }: RolePermissionWhere) => {
      const key = `${where.role.name}:${where.permission.module}:${where.permission.action}`;
      return grantedPermissions.has(key) ? { roleId: 'fake-role-id', permissionId: 'fake-permission-id' } : null;
    });

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(ROLE_REPOSITORY)
      .useValue(fakeRoleRepository)
      .overrideProvider(PERMISSION_REPOSITORY)
      .useValue(fakePermissionRepository)
      .overrideProvider(PrismaService)
      .useValue({ rolePermission: { findFirst }, revokedToken: { findUnique: jest.fn().mockResolvedValue(null) } })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('Administrator creates a role successfully', ({ given, when, then, and }) => {
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
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password });
        accessToken = loginResponse.body.accessToken;
      },
    );

    and(
      /^they create a role named "(.*)" with description "(.*)"$/,
      async (name: string, description: string) => {
        response = await request(app.getHttpServer())
          .post('/roles')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name, description });
      },
    );

    then('the role is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the role name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Administrator assigns permissions to a role', ({ given, when, then, and }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing role "(.*)" with no permissions$/, (name: string) => {
      seededRoleId = fakeRoleRepository.seed(name, []).getId();
    });

    and(/^an existing permission "(.*)" "(.*)"$/, (module: string, action: string) => {
      seededPermissionId = fakePermissionRepository.seed(module, action).getId() as string;
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password });
        accessToken = loginResponse.body.accessToken;
      },
    );

    and(
      /^they assign permission "(.*)" "(.*)" to the role "(.*)"$/,
      async () => {
        response = await request(app.getHttpServer())
          .patch(`/roles/${seededRoleId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ permissionIds: [seededPermissionId] });
      },
    );

    then(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (_roleName: string, module: string, action: string) => {
      expect(response.status).toBe(200);
      expect(response.body.permissions).toContainEqual(
        expect.objectContaining({ module, action }),
      );
    });
  });

  test('A user without the roles:create permission cannot create a role', ({ given, when, then, and }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password });
        accessToken = loginResponse.body.accessToken;
      },
    );

    and(/^they create a role named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/roles')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
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

  const login = (when: any) => {
    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = loginResponse.body.accessToken;
    });
  };

  // Bridges FakeRoleRepository and FakeUserRepository — they otherwise
  // maintain separate id spaces (same comment already on FakeUserRepository
  // about module boundaries) — registering here means a user later seeded
  // with this role's name resolves to the same roleId in both fakes.
  const seedRole = (and: any, isDefault: boolean) => {
    and(new RegExp(`^an existing ${isDefault ? 'default ' : ''}role "(.*)"(?: with no permissions)?$`), (name: string) => {
      const role = fakeRoleRepository.seed(name, [], null, isDefault);
      roleIdsByName.set(name, role.getId());
      fakeUserRepository.registerRole(role.getId(), name);
    });
  };

  test('Deleting a role reassigns its users to the default role', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedRole(and, true);
    seedRole(and, false);
    givenUser(and);
    login(when);

    and(/^they delete the role "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .delete(`/roles/${roleIdsByName.get(name)}`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('the role is deleted successfully', () => {
      expect(response.status).toBe(200);
    });

    and(/^(\d+) users were reassigned$/, (count: string) => {
      expect(response.body.reassignedUsers).toBe(Number(count));
    });

    and(/^the user "(.*)" now has role "(.*)"$/, async (email: string, roleName: string) => {
      const user = await fakeUserRepository.findByEmail(email);
      expect(user?.getRoleName()).toBe(roleName);
    });
  });

  test('The default role cannot be deleted', ({ given, and, when, then }) => {
    givenUser(given);
    grantPermission(and);
    seedRole(and, true);
    login(when);

    and(/^they try to delete the role "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .delete(`/roles/${roleIdsByName.get(name)}`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a conflict error', () => {
      expect(response.status).toBe(409);
    });
  });

  test('A user without the roles:delete permission cannot delete a role', ({ given, and, when, then }) => {
    givenUser(given);

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    seedRole(and, false);
    login(when);

    and(/^they try to delete the role "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .delete(`/roles/${roleIdsByName.get(name)}`)
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });
});
