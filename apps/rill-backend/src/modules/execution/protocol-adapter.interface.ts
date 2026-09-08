import type { BuiltCall, SwapBuildResult } from './pancakeswap-swap';

export type ProtocolCalls = {
  calls: BuiltCall[];
  quote?: SwapBuildResult['quote'];
  play: string;
  protocolSlug: string;
};
