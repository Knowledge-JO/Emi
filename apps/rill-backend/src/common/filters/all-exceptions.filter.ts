import { Catch } from '@nestjs/common';

// TODO: Map domain errors to HTTP responses with a stable error code envelope; never leak
// signer material, session keys or raw calldata into responses or logs.
@Catch()
export class AllExceptionsFilter {}
