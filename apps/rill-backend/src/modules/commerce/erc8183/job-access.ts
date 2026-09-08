import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq, or } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../../database/drizzle.provider';
import { jobs } from '../../../database/schema';
import type { JobCaller } from './job-caller';

export type JobRow = typeof jobs.$inferSelect;

@Injectable()
export class JobAccess {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async require(id: string): Promise<JobRow> {
    const row = await this.db.query.jobs.findFirst({
      where: eq(jobs.id, id),
    });
    if (!row) {
      throw new NotFoundException('Job not found');
    }
    return row;
  }

  assertParty(job: JobRow, caller: JobCaller): void {
    if (this.isHirer(job, caller) || this.isWorker(job, caller)) {
      return;
    }
    throw new ForbiddenException('Not a party to this job');
  }

  assertHirer(job: JobRow, caller: JobCaller): void {
    if (!this.isHirer(job, caller)) {
      throw new ForbiddenException('Only the hirer can do that');
    }
  }

  assertWorker(job: JobRow, caller: JobCaller): void {
    if (!this.isWorker(job, caller)) {
      throw new ForbiddenException('Only the hired worker can do that');
    }
  }

  isHirer(job: JobRow, caller: JobCaller): boolean {
    if (caller.kind === 'user') {
      return job.hirerKind === 'user' && job.hirerUserId === caller.userId;
    }
    return job.hirerKind === 'agent' && job.hirerAgentId === caller.agentId;
  }

  isWorker(job: JobRow, caller: JobCaller): boolean {
    return caller.kind === 'agent' && job.workerAgentId === caller.agentId;
  }

  listFor(caller: JobCaller) {
    if (caller.kind === 'user') {
      return this.db.query.jobs.findMany({
        where: eq(jobs.hirerUserId, caller.userId),
      });
    }
    return this.db.query.jobs.findMany({
      where: or(
        eq(jobs.hirerAgentId, caller.agentId),
        eq(jobs.workerAgentId, caller.agentId),
      ),
    });
  }
}
