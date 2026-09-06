import { Injectable } from '@nestjs/common';

// TODO: Turn a workflow into the narrowest possible Altana session: the exact contract allowlist
// the steps need, a spend cap derived from the cost estimate, and an expiry matched to the
// workflow's horizon. This is the enforcement boundary between "the model suggested it" and
// "the chain permits it" — never widen a scope to make a step succeed.
@Injectable()
export class AuthorizationPlannerService {}
