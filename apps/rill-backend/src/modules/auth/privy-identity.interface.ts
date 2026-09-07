/**
 * A caller whose Privy access token has been verified. This says *who is calling the API* — it
 * grants no authority to sign anything on-chain. That is an Altana session, issued separately by
 * the wallet module.
 */
export type PrivyPrincipal = {
  /** Privy DID (`did:privy:…`). Stable no matter which accounts the user links or unlinks. */
  did: string;
  sessionId: string;
  issuedAt: Date;
  expiresAt: Date;
  /**
   * The identity token from the same request, if the client sent one. Carries the user's linked
   * accounts, and is *not* verified until `readProfile` is called on it.
   */
  unverifiedIdentityToken: string | null;
};

/** Profile fields worth copying out of Privy at sign-up. Privy stays the source of truth. */
export type PrivyProfile = {
  email: string | null;
};

/**
 * The seam between Rill and Privy, declared as an abstract class so it doubles as an injection
 * token. `PrivyVerifierService` is the only implementation, and the only file in the backend that
 * imports the Privy SDK — which keeps that ESM-only dependency out of every other module's
 * import graph, tests included.
 */
export abstract class PrivyIdentity {
  abstract verifyAccessToken(
    accessToken: string,
    identityToken: string | null,
  ): Promise<PrivyPrincipal>;

  abstract readProfile(identityToken: string): Promise<PrivyProfile | null>;
}
