import { Injectable } from '@nestjs/common';

// TODO: Aave — read positions and health factor, build supply/borrow/repay calls. The health
// factor read is what long-running loan-protection workflows poll.
@Injectable()
export class AaveAdapter {}
