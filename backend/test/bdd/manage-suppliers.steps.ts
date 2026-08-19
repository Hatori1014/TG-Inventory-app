import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RolesModule } from '../../src/modules/roles/roles.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { SuppliersModule } from '../../src/modules/suppliers/suppliers.module';
import { SupplierPrismaRepository } from '../../src/modules/suppliers/infrastructure/supplier.prisma.repository';
import { DocumentTypePrismaRepository } from '../../src/modules/suppliers/infrastructure/document-type.prisma.repository';
import { PersonTypePrismaRepository } from '../../src/modules/suppliers/infrastructure/person-type.prisma.repository';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeSupplierRepository } from './support/fake-supplier.repository';
import { FakeDocumentTypeRepository } from './support/fake-document-type.repository';
import { FakePersonTypeRepository } from './support/fake-person-type.repository';

const feature = loadFeature('./test/bdd/manage-suppliers.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeSupplierRepository: FakeSupplierRepository;
  let fakeDocumentTypeRepository: FakeDocumentTypeRepository;
  let fakePersonTypeRepository: FakePersonTypeRepository;
  let grantedPermissions: Set<string>;
  let accessToken: string;
  let response: request.Response;
  let seededSupplierId: string;
  let seededDocumentTypeId: string;
  let seededPersonTypeId: string;
  const documentTypeIdsByName = new Map<string, string>();

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeDocumentTypeRepository = new FakeDocumentTypeRepository();
    fakePersonTypeRepository = new FakePersonTypeRepository();
    fakeSupplierRepository = new FakeSupplierRepository(fakeDocumentTypeRepository, fakePersonTypeRepository);
    grantedPermissions = new Set();
    documentTypeIdsByName.clear();

    const findFirst = jest.fn(async ({ where }: RolePermissionWhere) => {
      const key = `${where.role.name}:${where.permission.module}:${where.permission.action}`;
      return grantedPermissions.has(key) ? { roleId: 'fake-role-id', permissionId: 'fake-permission-id' } : null;
    });

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule, RolesModule, UsersModule, SuppliersModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeUserRepository)
      .overrideProvider(SupplierPrismaRepository)
      .useValue(fakeSupplierRepository)
      .overrideProvider(DocumentTypePrismaRepository)
      .useValue(fakeDocumentTypeRepository)
      .overrideProvider(PersonTypePrismaRepository)
      .useValue(fakePersonTypeRepository)
      .overrideProvider(PrismaService)
      .useValue({ rolePermission: { findFirst }, revokedToken: { findUnique: jest.fn().mockResolvedValue(null) } })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('Buyer registers a supplier with just the required name', ({ given, and, when, then }) => {
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

    and(/^they register a supplier named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('the supplier is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the supplier name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Buyer registers a supplier with a tax ID', ({ given, and, when, then }) => {
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

    and(/^they register a supplier named "(.*)" with tax ID "(.*)"$/, async (name: string, taxId: string) => {
      response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name, taxId });
    });

    then('the supplier is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the supplier tax ID "(.*)"$/, (taxId: string) => {
      expect(response.body.taxId).toBe(taxId);
    });
  });

  test('Registering a supplier with a tax ID already used by an active supplier is rejected', ({
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

    and(/^an existing active supplier "(.*)" with tax ID "(.*)"$/, (name: string, taxId: string) => {
      seededSupplierId = fakeSupplierRepository.seed(name, taxId, 'active').id;
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they register a supplier named "(.*)" with tax ID "(.*)"$/, async (name: string, taxId: string) => {
      response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name, taxId });
    });

    then('they receive a conflict error', () => {
      expect(response.status).toBe(409);
    });
  });

  test('Registering a supplier with a tax ID already used by an inactive supplier is allowed', ({
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

    and(/^an existing inactive supplier "(.*)" with tax ID "(.*)"$/, (name: string, taxId: string) => {
      seededSupplierId = fakeSupplierRepository.seed(name, taxId, 'inactive').id;
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they register a supplier named "(.*)" with tax ID "(.*)"$/, async (name: string, taxId: string) => {
      response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name, taxId });
    });

    then('the supplier is created successfully', () => {
      expect(response.status).toBe(201);
    });
  });

  test('A user without the suppliers:create permission cannot register a supplier', ({
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

    and(/^they attempt to register a supplier named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/suppliers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('they receive a forbidden error', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Buyer deactivates a supplier instead of deleting it', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing active supplier "(.*)" with tax ID "(.*)"$/, (name: string, taxId: string) => {
      seededSupplierId = fakeSupplierRepository.seed(name, taxId, 'active').id;
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(/^they deactivate that supplier$/, async () => {
      response = await request(app.getHttpServer())
        .patch(`/suppliers/${seededSupplierId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'inactive' });
    });

    then('the supplier is updated successfully', () => {
      expect(response.status).toBe(200);
    });

    and('the response shows the supplier as inactive', () => {
      expect(response.body.status).toBe('inactive');
    });
  });

  test('Buyer registers a supplier with a document type and person type', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing document type "(.*)"$/, (name: string) => {
      seededDocumentTypeId = fakeDocumentTypeRepository.seed(name).id;
      documentTypeIdsByName.set(name, seededDocumentTypeId);
    });

    and(/^an existing person type "(.*)"$/, (name: string) => {
      seededPersonTypeId = fakePersonTypeRepository.seed(name).id;
    });

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(
      /^they register a supplier named "(.*)" with tax ID "(.*)" using that document type and person type$/,
      async (name: string, taxId: string) => {
        response = await request(app.getHttpServer())
          .post('/suppliers')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name, taxId, documentTypeId: seededDocumentTypeId, personTypeId: seededPersonTypeId });
      },
    );

    then('the supplier is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the document type name "(.*)"$/, (name: string) => {
      expect(response.body.documentType.name).toBe(name);
    });

    and(/^the response includes the person type name "(.*)"$/, (name: string) => {
      expect(response.body.personType.name).toBe(name);
    });
  });

  test('The same tax ID under two different document types is not a duplicate', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing document type "(.*)"$/, (name: string) => {
      documentTypeIdsByName.set(name, fakeDocumentTypeRepository.seed(name).id);
    });

    and(/^an existing document type "(.*)"$/, (name: string) => {
      documentTypeIdsByName.set(name, fakeDocumentTypeRepository.seed(name).id);
    });

    and(
      /^an existing active supplier "(.*)" with tax ID "(.*)" and document type "(.*)"$/,
      (name: string, taxId: string, documentTypeName: string) => {
        const documentTypeId = documentTypeIdsByName.get(documentTypeName);
        fakeSupplierRepository.seed(name, taxId, 'active', documentTypeId);
      },
    );

    when(/^they log in with email "(.*)" and password "(.*)"$/, async (email: string, password: string) => {
      response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      accessToken = response.body.accessToken;
    });

    and(
      /^they register a supplier named "(.*)" with tax ID "(.*)" using the "(.*)" document type$/,
      async (name: string, taxId: string, documentTypeName: string) => {
        response = await request(app.getHttpServer())
          .post('/suppliers')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ name, taxId, documentTypeId: documentTypeIdsByName.get(documentTypeName) });
      },
    );

    then('the supplier is created successfully', () => {
      expect(response.status).toBe(201);
    });
  });

  test('Administrator creates a new document type', ({ given, and, when, then }) => {
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

    and(/^they create a document type named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/document-types')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('the document type is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the document type name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });

  test('Administrator creates a new person type', ({ given, and, when, then }) => {
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

    and(/^they create a person type named "(.*)"$/, async (name: string) => {
      response = await request(app.getHttpServer())
        .post('/person-types')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name });
    });

    then('the person type is created successfully', () => {
      expect(response.status).toBe(201);
    });

    and(/^the response includes the person type name "(.*)"$/, (name: string) => {
      expect(response.body.name).toBe(name);
    });
  });
});
