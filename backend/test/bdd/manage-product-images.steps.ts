import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import * as sharp from 'sharp';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { RolesModule } from '../../src/modules/roles/roles.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { ProductsModule } from '../../src/modules/products/products.module';
import { ProductPrismaRepository } from '../../src/modules/products/infrastructure/product.prisma.repository';
import { CategoryPrismaRepository } from '../../src/modules/products/infrastructure/category.prisma.repository';
import { UnitPrismaRepository } from '../../src/modules/products/infrastructure/unit.prisma.repository';
import { R2StorageService } from '../../src/storage/r2-storage.service';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';
import { FakeProductRepository } from './support/fake-product.repository';
import { FakeCategoryRepository } from './support/fake-category.repository';
import { FakeUnitRepository } from './support/fake-unit.repository';
import { FakeR2StorageService } from './support/fake-r2-storage.service';

const feature = loadFeature('./test/bdd/manage-product-images.feature');

interface RolePermissionWhere {
  where: {
    role: { name: string };
    permission: { module: string; action: string };
  };
}

async function makeValidJpeg(): Promise<Buffer> {
  return sharp({ create: { width: 50, height: 50, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .jpeg()
    .toBuffer();
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeUserRepository: FakeUserRepository;
  let fakeCategoryRepository: FakeCategoryRepository;
  let fakeUnitRepository: FakeUnitRepository;
  let fakeProductRepository: FakeProductRepository;
  let fakeStorage: FakeR2StorageService;
  let grantedPermissions: Set<string>;
  let accessToken: string;
  let response: request.Response;
  let seededProductId: string;
  let previousImageKey: string;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';

    fakeUserRepository = new FakeUserRepository();
    fakeCategoryRepository = new FakeCategoryRepository();
    fakeUnitRepository = new FakeUnitRepository();
    fakeProductRepository = new FakeProductRepository(fakeUnitRepository, fakeCategoryRepository);
    fakeStorage = new FakeR2StorageService();
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
      .overrideProvider(R2StorageService)
      .useValue(fakeStorage)
      .overrideProvider(PrismaService)
      .useValue({
        rolePermission: { findFirst },
        revokedToken: { findUnique: jest.fn().mockResolvedValue(null) },
        auditEvent: { create: jest.fn().mockResolvedValue({}) },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('Administrator uploads a valid image for a product', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)" with an existing unit "(.*)"$/, async (productName: string, unitName: string) => {
      const unit = fakeUnitRepository.seed(unitName);
      const product = await fakeProductRepository.create({ name: productName, unitId: unit.id });
      seededProductId = product.id;
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and('they upload a valid JPEG image for that product', async () => {
      const jpeg = await makeValidJpeg();
      response = await request(app.getHttpServer())
        .post(`/products/${seededProductId}/image`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', jpeg, 'photo.jpg');
    });

    then('the image is accepted', () => {
      expect(response.status).toBe(201);
    });

    and("the product's imageUrl is set", () => {
      expect(response.body.imageUrl).toMatch(new RegExp(`^products/${seededProductId}/.+\\.webp$`));
    });
  });

  test('Uploading a file whose real content is not an image is rejected', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(/^an existing product "(.*)" with an existing unit "(.*)"$/, async (productName: string, unitName: string) => {
      const unit = fakeUnitRepository.seed(unitName);
      const product = await fakeProductRepository.create({ name: productName, unitId: unit.id });
      seededProductId = product.id;
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and('they upload a file disguised as an image for that product', async () => {
      const disguisedScript = Buffer.from('<script>alert(document.cookie)</script>', 'utf-8');
      response = await request(app.getHttpServer())
        .post(`/products/${seededProductId}/image`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', disguisedScript, 'photo.jpg');
    });

    then('the upload is rejected as an invalid image', () => {
      expect(response.status).toBe(400);
    });
  });

  test('A user without products:update permission cannot upload an image', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" does not have permission "(.*)" "(.*)"$/, () => {
      // grantedPermissions starts empty — nothing to grant.
    });

    and(/^an existing product "(.*)" with an existing unit "(.*)"$/, async (productName: string, unitName: string) => {
      const unit = fakeUnitRepository.seed(unitName);
      const product = await fakeProductRepository.create({ name: productName, unitId: unit.id });
      seededProductId = product.id;
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and('they upload a valid JPEG image for that product', async () => {
      const jpeg = await makeValidJpeg();
      response = await request(app.getHttpServer())
        .post(`/products/${seededProductId}/image`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', jpeg, 'photo.jpg');
    });

    then('the upload is forbidden', () => {
      expect(response.status).toBe(403);
    });
  });

  test('Replacing an existing image deletes the previous one from storage', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeUserRepository.seed(email, password, role);
      },
    );

    and(/^the role "(.*)" has permission "(.*)" "(.*)"$/, (role: string, module: string, action: string) => {
      grantedPermissions.add(`${role}:${module}:${action}`);
    });

    and(
      /^an existing product "(.*)" with an existing unit "(.*)" and an existing image$/,
      async (productName: string, unitName: string) => {
        const unit = fakeUnitRepository.seed(unitName);
        const product = await fakeProductRepository.create({ name: productName, unitId: unit.id });
        seededProductId = product.id;
        previousImageKey = `products/${product.id}/previous.webp`;
        await fakeStorage.upload(previousImageKey, Buffer.from('old-image'), 'image/webp');
        await fakeProductRepository.update(product.id, { imageUrl: previousImageKey });
      },
    );

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
        accessToken = response.body.accessToken;
      },
    );

    and('they upload a valid JPEG image for that product', async () => {
      const jpeg = await makeValidJpeg();
      response = await request(app.getHttpServer())
        .post(`/products/${seededProductId}/image`)
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', jpeg, 'photo.jpg');
    });

    then('the image is accepted', () => {
      expect(response.status).toBe(201);
    });

    and('the previous image was deleted from storage', async () => {
      // UploadProductImageUseCase deletes the previous image without
      // awaiting it (best-effort, see its own comment) — give the
      // fire-and-forget promise a tick to settle before asserting.
      await new Promise((resolve) => setImmediate(resolve));
      expect(fakeStorage.deletedKeys).toContain(previousImageKey);
      expect(fakeStorage.has(previousImageKey)).toBe(false);
    });
  });
});
