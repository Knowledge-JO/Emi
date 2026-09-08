import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CreateJobDto } from './dto/create-job.dto';
import { DeliverJobDto } from './dto/deliver-job.dto';
import {
  ConfirmOnchainDto,
  ExecuteJobDto,
  FundJobDto,
} from './dto/fund-job.dto';
import { DeliverableService } from './deliverable.service';
import { DisputeService } from './dispute.service';
import { CurrentJobCaller, JobCallerGuard } from './job-caller.guard';
import type { JobCaller } from './job-caller';
import { JobEscrowService } from './job-escrow.service';
import { SettlementService } from './settlement.service';

class DisputeJobDto extends ExecuteJobDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

class AcceptJobDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * ERC-8183 job lifecycle. Users (Privy) and agents (`rill_ak_`) use the same routes.
 * Create is a local row; fund is the atomic on-chain hire. A single API request is x402,
 * not a job.
 */
@Controller('jobs')
@UseGuards(JobCallerGuard)
export class JobsController {
  constructor(
    private readonly escrow: JobEscrowService,
    private readonly deliverables: DeliverableService,
    private readonly settlement: SettlementService,
    private readonly disputes: DisputeService,
  ) {}

  @Post()
  create(@CurrentJobCaller() caller: JobCaller, @Body() body: CreateJobDto) {
    return this.escrow.create(caller, body);
  }

  @Get()
  list(@CurrentJobCaller() caller: JobCaller) {
    return this.escrow.list(caller);
  }

  @Get(':id')
  get(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.escrow.get(id, caller);
  }

  @Get(':id/hire-calls')
  hireCalls(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.escrow.hireCalls(id, caller);
  }

  @Post(':id/fund')
  fund(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: FundJobDto,
  ) {
    return this.escrow.fund(id, caller, body.sessionId);
  }

  @Post(':id/confirm-fund')
  confirmFund(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ConfirmOnchainDto,
  ) {
    return this.escrow.confirmFund(id, caller, body);
  }

  @Post(':id/sync')
  sync(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.escrow.sync(id, caller);
  }

  @Post(':id/deliver')
  deliver(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: DeliverJobDto,
  ) {
    return this.deliverables.deliver(id, caller, body);
  }

  @Post(':id/accept')
  accept(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: AcceptJobDto,
  ) {
    return this.settlement.accept(id, caller, body.reason);
  }

  @Post(':id/settle')
  settle(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ExecuteJobDto,
  ) {
    return this.settlement.settle(id, caller, body.sessionId);
  }

  @Post(':id/dispute')
  dispute(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: DisputeJobDto,
  ) {
    return this.disputes.dispute(id, caller, body.reason, body.sessionId);
  }

  @Post(':id/refund')
  refund(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: ExecuteJobDto,
  ) {
    return this.settlement.refund(id, caller, body.sessionId);
  }

  @Post(':id/cancel')
  cancel(
    @CurrentJobCaller() caller: JobCaller,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.settlement.cancel(id, caller);
  }
}
