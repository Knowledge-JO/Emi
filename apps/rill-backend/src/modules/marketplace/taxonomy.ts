/**
 * Taxonomy keys the first-party catalog actually lists. The planner maps parser aliases onto
 * these; it does not invent a capability that has no listing.
 */
export const FIRST_PARTY_TAXONOMY = [
  'defi.swap',
  'research.screen',
  'risk.health_factor',
  'defi.lending.supply',
  'defi.copy_trade',
  'defi.launchpad.swap',
] as const;
