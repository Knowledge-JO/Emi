import { Module } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * User accounts and profiles. Owns nothing on-chain — a user's authority lives in their Altana
 * smart account, which the wallet module manages.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
