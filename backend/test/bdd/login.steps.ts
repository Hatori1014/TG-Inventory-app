import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { USER_REPOSITORY } from '../../src/modules/users/domain/user.repository.interface';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeUserRepository } from './support/fake-user.repository';

const feature = loadFeature('./test/bdd/login.feature');

// In-memory stand-in for RevokedToken (ADR-32) — enough for JwtStrategy's
// findUnique() check and LogoutUseCase's upsert() to behave like the real
// table across a single test's login → logout → retry sequence.
function fakeRevokedTokenPrisma() {
  const revoked = new Map<string, { jti: string; expiresAt: Date }>();
  return {
    revokedToken: {
      findUnique: async ({ where: { jti } }: { where: { jti: string } }) => revoked.get(jti) ?? null,
      upsert: async ({ create }: { create: { jti: string; expiresAt: Date } }) => {
        revoked.set(create.jti, create);
        return create;
      },
    },
    // HU-23 — LoginUseCase now audits every attempt; RecordAuditEventUseCase
    // swallows a failing write, but without this stub it'd hit undefined
    // and log a spurious error on every scenario in this file.
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
  };
}

defineFeature(feature, (test) => {
  let app: INestApplication;
  let fakeRepository: FakeUserRepository;
  let response: request.Response;
  let accessToken: string;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'bdd-test-secret-at-least-16-chars';
    process.env.JWT_EXPIRES_IN = '1h';
    fakeRepository = new FakeUserRepository();

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
    })
      .overrideProvider(USER_REPOSITORY)
      .useValue(fakeRepository)
      .overrideProvider(PrismaService)
      .useValue(fakeRevokedTokenPrisma())
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
      // FakeUserRepository starts empty — nothing to seed.
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

  test('Successful logout', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeRepository.seed(email, password, role);
      },
    );

    and('they are logged in', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@tg-group.local', password: 'correct-password' });
      accessToken = login.body.accessToken;
    });

    when('they log out', async () => {
      response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('the logout succeeds', () => {
      expect(response.status).toBe(200);
    });
  });

  test('A revoked token can no longer be used', ({ given, and, when, then }) => {
    given(
      /^a user "(.*)" with password "(.*)" and role "(.*)"$/,
      (email: string, password: string, role: string) => {
        fakeRepository.seed(email, password, role);
      },
    );

    and('they are logged in', async () => {
      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@tg-group.local', password: 'correct-password' });
      accessToken = login.body.accessToken;
    });

    and('they log out', async () => {
      await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    });

    when('they try to use the same token again', async () => {
      response = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
    });

    then('they see an unauthorized error', () => {
      expect(response.status).toBe(401);
    });
  });
});
