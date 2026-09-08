import { Injectable } from '@nestjs/common';
import { and, eq, inArray } from 'drizzle-orm';

import { InjectDatabase, type Database } from '../../database/drizzle.provider';
import { assets, capabilities } from '../../database/schema';
import { FIRST_PARTY_TAXONOMY } from './taxonomy';

/**
 * Catalog lookup for things a capability is allowed to name. Symbols are matched case-insensitively
 * against the stored uppercase ticker on a single chain.
 */
@Injectable()
export class CatalogService {
  constructor(@InjectDatabase() private readonly db: Database) {}

  async listActiveTaxonomyKeys(): Promise<string[]> {
    try {
      const rows = await this.db
        .selectDistinct({ taxonomyKey: capabilities.taxonomyKey })
        .from(capabilities)
        .where(eq(capabilities.status, 'active'));
      const keys = [
        ...new Set(
          rows
            .map((row) => row.taxonomyKey)
            .filter((key): key is string => typeof key === 'string'),
        ),
      ];
      return keys.length > 0 ? keys : [...FIRST_PARTY_TAXONOMY];
    } catch {
      return [...FIRST_PARTY_TAXONOMY];
    }
  }

  async findAssetsBySymbols(chainId: number, symbols: string[]) {
    const wanted = [
      ...new Set(
        symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
      ),
    ];
    if (wanted.length === 0) {
      return { wanted, rows: [] };
    }

    const rows = await this.db
      .select()
      .from(assets)
      .where(and(eq(assets.chainId, chainId), inArray(assets.symbol, wanted)));

    return { wanted, rows };
  }
}
