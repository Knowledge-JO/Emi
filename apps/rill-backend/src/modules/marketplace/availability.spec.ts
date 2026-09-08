import { availabilityScore } from './availability';

describe('availabilityScore', () => {
  const now = new Date('2026-09-07T00:00:00.000Z');

  it('scores a freshly synced active listing at 1', () => {
    expect(
      availabilityScore({
        agentStatus: 'active',
        hasIdentity: true,
        lastSyncedAt: new Date('2026-09-06T00:00:00.000Z'),
        now,
      }),
    ).toBe(1);
  });

  it('decays a stale identity cache', () => {
    expect(
      availabilityScore({
        agentStatus: 'active',
        hasIdentity: true,
        lastSyncedAt: new Date('2026-08-20T00:00:00.000Z'),
        now,
      }),
    ).toBe(0.5);
    expect(
      availabilityScore({
        agentStatus: 'active',
        hasIdentity: true,
        lastSyncedAt: new Date('2026-06-01T00:00:00.000Z'),
        now,
      }),
    ).toBe(0.25);
  });

  it('zeros a draft listing and downranks a missing identity', () => {
    expect(
      availabilityScore({
        agentStatus: 'draft',
        hasIdentity: true,
        lastSyncedAt: now,
        now,
      }),
    ).toBe(0);
    expect(
      availabilityScore({
        agentStatus: 'active',
        hasIdentity: false,
        now,
      }),
    ).toBe(0.25);
  });
});
