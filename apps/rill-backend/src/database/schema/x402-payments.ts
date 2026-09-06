// TODO: x402_payments table — the micro-payment ledger, in both directions: payments our agents
// make for external capabilities, and payments agents make to us as an x402 merchant. Records
// resource URL, amount, token, rail (permit2 | eip-3009), session key used, and settlement status.
// Deliberately separate from `jobs` — x402 and ERC-8183 never share a code path or a table.
