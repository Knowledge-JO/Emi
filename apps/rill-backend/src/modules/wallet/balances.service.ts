import { Injectable } from '@nestjs/common';

// TODO: Read native + token balances via client.balances, and pre-flight checks: is the wallet
// funded for gas, and does it hold enough of the spend token for the planned workflow?
@Injectable()
export class BalancesService {}
