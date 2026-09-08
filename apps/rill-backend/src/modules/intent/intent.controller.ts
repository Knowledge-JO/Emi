import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from '../auth/auth.service';
import { CurrentPrincipal, PrivyAuthGuard } from '../auth/privy-auth.guard';
import type { PrivyPrincipal } from '../auth/privy-identity.interface';
import { CreateIntentDto } from './create-intent.dto';
import { IntentService } from './intent.service';

@Controller('intents')
@UseGuards(PrivyAuthGuard)
export class IntentController {
  constructor(
    private readonly auth: AuthService,
    private readonly intents: IntentService,
  ) {}

  /** Submit a natural-language outcome. Returns the parsed intent and ranked agent matches. */
  @Post()
  async create(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Body() body: CreateIntentDto,
  ) {
    const user = await this.auth.requireUser(principal);
    return this.intents.createFromMessage(user.id, body.text.trim());
  }

  @Get(':id')
  async get(
    @CurrentPrincipal() principal: PrivyPrincipal,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const user = await this.auth.requireUser(principal);
    const intent = await this.intents.getForUser(user.id, id);

    if (!intent) {
      throw new NotFoundException('Intent not found');
    }

    return intent;
  }
}
