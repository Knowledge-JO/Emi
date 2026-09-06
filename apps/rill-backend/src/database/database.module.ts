import { Module } from '@nestjs/common';

// TODO: Global module exposing the Drizzle client. Owns pooling and migration checks; every other
// module reads and writes exclusively through the injected client, never a raw connection.
@Module({})
export class DatabaseModule {}
