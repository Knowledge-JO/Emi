import { ValidationPipe } from '@nestjs/common';

/**
 * The API's request-validation policy, in one place so the running app and the tests cannot
 * drift apart — a test that accepts a body production would reject proves nothing.
 *
 * `forbidNonWhitelisted` is deliberate: silently dropping an unknown field lets a client believe
 * it set something it did not, which for addresses and permissions is the kind of mistake that
 * only shows up on-chain.
 */
export const validationPipe = (): ValidationPipe =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });
