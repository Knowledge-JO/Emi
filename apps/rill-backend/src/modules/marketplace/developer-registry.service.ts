import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { developers } from '../../database/schema';
import { EventStoreService } from '../events/event-store.service';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type BecomePublisherInput = {
  slug: string;
  displayName: string;
  description?: string | null;
};

/**
 * Step 2a: a platform user becomes a publisher. Listings hang off this row, not off `users`
 * directly — payout attribution and verification live here.
 */
@Injectable()
export class DeveloperRegistryService {
  constructor(
    @InjectDatabase() private readonly db: Database,
    private readonly events: EventStoreService,
  ) {}

  getByUserId(userId: string) {
    return this.db.query.developers.findFirst({
      where: eq(developers.userId, userId),
    });
  }

  getBySlug(slug: string) {
    return this.db.query.developers.findFirst({
      where: eq(developers.slug, slug),
    });
  }

  async becomePublisher(userId: string, input: BecomePublisherInput) {
    if (!SLUG.test(input.slug)) {
      throw new BadRequestException(
        'Publisher slug must be lowercase kebab-case',
      );
    }

    const already = await this.getByUserId(userId);
    if (already) {
      return already;
    }

    const [created] = await this.db
      .insert(developers)
      .values({
        userId,
        slug: input.slug,
        displayName: input.displayName,
        description: input.description ?? null,
      })
      .onConflictDoNothing({ target: developers.slug })
      .returning();

    if (!created) {
      throw new ConflictException(`Publisher slug '${input.slug}' is taken`);
    }

    await this.events.append({
      type: 'developer.registered',
      subjectType: 'developer',
      subjectId: created.id,
      actorKind: 'user',
      actorId: userId,
      payload: { slug: created.slug },
    });

    return created;
  }
}
