import { Module } from '@nestjs/common';

// TODO: Export cross-cutting providers (filters, interceptors, guards, clock, id generator)
// consumed by every feature module.
@Module({})
export class CommonModule {}
