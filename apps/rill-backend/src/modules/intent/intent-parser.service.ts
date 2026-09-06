import { Injectable } from '@nestjs/common';

// TODO: Parse free text into a structured goal tree. Example — "protect my BNB loan" becomes:
//   Protect Loan
//     ├── Monitor position
//     ├── Calculate health factor
//     ├── Obtain repayment asset
//     └── Repay
// Output must be schema-validated. An unparseable intent fails loudly rather than guessing.
@Injectable()
export class IntentParserService {}
