import { Injectable } from '@nestjs/common';

// TODO: Research agent — market data and analysis. Primary consumer of external x402 endpoints:
// it pays per request with its session key via fetchWithX402.
@Injectable()
export class ResearchAgentAdapter {}
