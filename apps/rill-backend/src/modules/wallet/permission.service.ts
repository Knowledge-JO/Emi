import { Injectable } from '@nestjs/common';

// TODO: Build session permissions from an authorization plan: `calls` from the protocols the
// workflow actually needs, `spend` limits in token base units with a period.
// Omitting `calls` means unrestricted contract access — always set both `calls` and `spend`.
@Injectable()
export class PermissionService {}
