import { defineFeature, loadFeature } from 'jest-cucumber';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { AUTH_USER_REPOSITORY } from '../../src/modules/auth/domain/auth-user.repository.interface';
import { PrismaService } from '../../src/database/prisma.service';
import { FakeAuthUserRepository } from './support/fake-auth-user.repository';

const feature = loadFeature('./test/bdd/login.feature');

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
