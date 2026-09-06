import { Injectable } from '@nestjs/common';

// TODO: Issue and verify platform auth tokens. Distinct from Altana sessions: a platform token
// says "who is calling the API", an Altana session says "what may be signed on-chain".
@Injectable()
export class AuthService {}
