import { Module } from '@nestjs/common';

// TODO: Authentication for two very different caller classes: humans (browser sessions, passkey
// login) and agents (API keys resolved to an ERC-8004 identity).
@Module({})
export class AuthModule {}
