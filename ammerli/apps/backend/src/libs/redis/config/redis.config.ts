import { registerAs } from '@nestjs/config';
import {
  IsNotEmpty,
  IsString,
} from 'class-validator';
import validateConfig from '../../../utils/validate-config';
import { RedisConfig } from './redis-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsNotEmpty()
  REDIS_URL: string;
}

export default registerAs<RedisConfig>('redis', () => {
  console.info(`Register RedisConfig from environment variables`);
  validateConfig(process.env, EnvironmentVariablesValidator);

  const redisUrl = process.env.REDIS_URL;
  let host = 'localhost';
  let port = 6379;
  let password = undefined;
  let tlsEnabled = false;

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      host = parsed.hostname;
      port = parsed.port ? parseInt(parsed.port, 10) : 6379;
      password = parsed.password ? decodeURIComponent(parsed.password) : undefined;
      tlsEnabled = parsed.protocol === 'rediss:';
    } catch (e) {
      // Fallback if parsing fails
    }
  }

  return {
    url: redisUrl,
    host,
    port,
    password,
    tlsEnabled,
  };
});