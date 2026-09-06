import { Controller } from '@nestjs/common';

// TODO: Rill's own paid capabilities — /quote, /risk-analysis, /pool-analysis,
// /portfolio-analysis. Unpaid requests get a 402 with the price and resource; paid requests carry
// a verified payment and execute.
@Controller('capabilities')
export class X402MerchantController {}
