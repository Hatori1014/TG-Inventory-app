import { plainToInstance } from 'class-transformer';
import { IsIn, IsNumber, IsString, MinLength, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(16, { message: 'JWT_SECRET must be at least 16 characters' })
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsNumber()
  PORT: number;

  @IsIn(['development', 'staging', 'production'])
  NODE_ENV: string;
}

// If an environment variable is missing or invalid, the app must not start
// silently with a bad value (part of the security baseline, TT-01/Iteration 0).
export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(`Invalid environment variables: ${errors.toString()}`);
  }
  return validated;
}
