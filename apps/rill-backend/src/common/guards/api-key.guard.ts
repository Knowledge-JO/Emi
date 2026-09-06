import { Injectable } from '@nestjs/common';

// TODO: Authenticate machine callers (agents calling our API) by API key, and resolve them to an
// agent identity so x402 charges and reputation land on the right actor.
@Injectable()
export class ApiKeyGuard {}
