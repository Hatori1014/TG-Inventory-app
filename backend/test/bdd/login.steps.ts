import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AuthModule } from '../../src/modules/auth/auth.module';
import {
  AUTH_USER_REPOSITORY,
  AuthUserRepository,
} from '../../src/modules/auth/domain/auth-user.repository.interface';
import { AuthUser, AuthUserStatus } from '../../src/modules/auth/domain/auth-user.entity';
import { PrismaService } from '../../src/database/prisma.service';

const feature = loadFeature('./test/bdd/login.feature');

// In-memory stand-in for UserPrismaRepository — the BDD suite exercises the
// full AuthModule (controller, guards, JWT issuance) through HTTP, but never
// touches a real Postgres instance (CI has no database service).
class FakeAuthUserRepository implements AuthUserRepository {
  private readonly users = new Map<string, AuthUser>();

  seed(email: string, password: string, role: string, status: AuthUserStatus = 'active'): void {
    const passwordHash = bcrypt.hashSync(password, 4);
    this.users.set(email, new AuthUser('fake-id', 'Test User', email, passwordHash, role, status));
  }

  async findByEmail(email: string): Promise<AuthUser | null> {
    return this.users.get(email) ?? null;
  }
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeRepository: FakeAuthUserRepository;
  let response: request.Response;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';
    fakeRepository = new FakeAuthUserRepository();

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
    })
      .overrideProvider(AUTH_USER_REPOSITORY)
      .useValue(fakeRepository)
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  test('Successful login', ({ given, when, then, and }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeRepository.seed(email, password, role);
      },
    );

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      },
    );

    then('they receive a valid access token', () => {
      expect(response.status).toBe(200);
      expect(typeof response.body.accessToken).toBe('string');
      expect(response.body.accessToken.length).toBeGreaterThan(0);
    });

    and(/^the response includes their role "(.*)"$/, (role: string) => {
      expect(response.body.user.role).toBe(role);
    });
  });

  test('Invalid password', ({ given, when, then, and }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeRepository.seed(email, password, role);
      },
    );

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      },
    );

    then('they see an invalid credentials error', () => {
      expect(response.status).toBe(401);
    });

    and('no access token is issued', () => {
      expect(response.body.accessToken).toBeUndefined();
    });
  });

  test('User does not exist', ({ given, when, then, and }) => {
    given(/^no user is registered with email "(.*)"$/, () => {
      // FakeAuthUserRepository starts empty — nothing to seed.
    });

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      },
    );

    then('they see an invalid credentials error', () => {
      expect(response.status).toBe(401);
    });

    and('no access token is issued', () => {
      expect(response.body.accessToken).toBeUndefined();
    });
  });

  test('Blocked user', ({ given, when, then, and }) => {
    given(
      /^a blocked user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeRepository.seed(email, password, role, 'blocked');
      },
    );

    when(
      /^they log in with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        response = await request(app.getHttpServer()).post('/auth/login').send({ email, password });
      },
    );

    then('they see an invalid credentials error', () => {
      expect(response.status).toBe(401);
    });

    and('no access token is issued', () => {
      expect(response.body.accessToken).toBeUndefined();
    });
  });
});
