import { Injectable } from '@nestjs/common';

import {
  rankCandidates,
  type RankInput,
  type RankedCandidate,
} from './ranking';

@Injectable()
export class AgentRankingService {
  rank(candidates: RankInput[]): RankedCandidate[] {
    return rankCandidates(candidates);
  }
}
