import {
  BNB,
  BNB_TESTNET,
  ETHEREUM,
  createClient,
  isPasskeySigner,
  serializeSession,
  signerFromPrivateKey,
  type Signer,
} from "@altananetwork/sdk";
import { generatePrivateKey } from "viem/accounts";

import { ApiError, apiFetch } from "@/lib/api";

export type WalletResponse = {
  id: string;
  address: string;
  signerKind: string;
  chainIds: number[];
  passkeyRpId: string | null;
  passkeyCredentialId: string | null;
  adminPublicKey: string | null;
  adminKeyRegistered: boolean;
  status: string;
  createdAt: string;
};

export type GrantablePlan = {
  id: string;
  authorizationPlan: {
    calls: Array<{ to: string }>;
    spend: Array<{ token: string; limit: string; period: string }>;
    expiry: number;
  };
};

function network() {
  const chain = process.env.NEXT_PUBLIC_ALTANA_CHAIN;
  if (chain === "ethereum") return ETHEREUM;
  if (chain === "bnb-testnet") return BNB_TESTNET;
  return BNB;
}

function rpId(): string {
  return window.location.hostname;
}

function client() {
  return createClient({ chains: [network()] });
}

function registrationFrom(
  wallet: { address: string; signer: Signer },
  chainId: number,
) {
  if (!isPasskeySigner(wallet.signer)) {
    throw new Error("Expected a WebAuthn passkey wallet");
  }
  const credential = wallet.signer.credential;
  if (credential.kind !== "webauthn") {
    throw new Error("Expected a WebAuthn passkey wallet");
  }
  return {
    address: wallet.address,
    credentialId: credential.id,
    adminPublicKey: credential.publicKey,
    rpId: credential.rpId ?? rpId(),
    chainIds: [chainId],
  };
}

/** Recover or create the passkey wallet, then register it with the API if needed. */
export async function ensurePasskeyWallet(): Promise<WalletResponse> {
  try {
    return await apiFetch<WalletResponse>("/wallets/me");
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;
  }

  const altana = client();
  const chain = network();
  let wallet;
  try {
    wallet = await altana.recoverFromPasskey({ rpId: rpId() });
  } catch {
    wallet = await altana.createPasskeyWallet({
      name: "Rill",
      rpId: rpId(),
    });
  }

  return apiFetch<WalletResponse>("/wallets", {
    method: "POST",
    body: JSON.stringify(registrationFrom(wallet, chain.chainId)),
  });
}

/**
 * Admin passkey signs grantSession in the browser. The API only records serializeSession
 * plus the session private key — it never constructs a signer.
 */
export async function grantPlan<T>(plan: GrantablePlan): Promise<T> {
  await ensurePasskeyWallet();

  const altana = client();
  const wallet = await altana.recoverFromPasskey({ rpId: rpId() });
  const sessionKey = generatePrivateKey();
  const session = await altana.grantSession({
    wallet,
    signer: wallet.signer,
    sessionSigner: signerFromPrivateKey(sessionKey),
    permissions: {
      calls: plan.authorizationPlan.calls.map((call) => ({
        to: call.to as `0x${string}`,
      })),
      spend: plan.authorizationPlan.spend.map((entry) => ({
        limit: BigInt(entry.limit),
        period: entry.period as
          "minute" | "hour" | "day" | "week" | "month" | "year",
        token: entry.token as `0x${string}`,
      })),
    },
    expiry: plan.authorizationPlan.expiry,
  });

  const stored = serializeSession(session);

  return apiFetch<T>(`/orchestrator/plans/${plan.id}/grant`, {
    method: "POST",
    body: JSON.stringify({
      walletAddress: stored.walletAddress,
      publicKey: stored.publicKey,
      sessionPrivateKey: sessionKey,
      expiry: stored.expiry,
      permissions: stored.permissions,
      grantTxHash: session.transactionHash,
      registered: true,
    }),
  });
}

/**
 * Admin passkey signs revokeSession. The API only records the receipt and marks the
 * session revoked — it never constructs a signer.
 */
export async function revokePlan<T>(plan: {
  id: string;
  sessionPublicKey: string;
}): Promise<T> {
  const altana = client();
  const wallet = await altana.recoverFromPasskey({ rpId: rpId() });
  const result = await altana.revokeSession({
    wallet,
    signer: wallet.signer,
    session: plan.sessionPublicKey as `0x${string}`,
  });

  return apiFetch<T>(`/orchestrator/plans/${plan.id}/revoke`, {
    method: "POST",
    body: JSON.stringify({
      revokeTxHash: result.transactionHash,
    }),
  });
}

/** On-chain revoke for a session row that is not tied to the current plan card. */
export async function revokeSessionKey(sessionPublicKey: string) {
  const altana = client();
  const wallet = await altana.recoverFromPasskey({ rpId: rpId() });
  return altana.revokeSession({
    wallet,
    signer: wallet.signer,
    session: sessionPublicKey as `0x${string}`,
  });
}
