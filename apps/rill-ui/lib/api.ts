import { getAccessToken, getIdentityToken } from "@privy-io/react-auth";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** The account as the backend sees it. Mirrors `UserResponse` in the API. */
export type RillUser = {
  id: string;
  privyUserId: string | null;
  email: string | null;
  displayName: string | null;
  status: "active" | "suspended" | "deleted";
  createdAt: string;
  lastSeenAt: string | null;
};

export type SessionResponse = {
  user: RillUser;
  session: {
    privySessionId: string;
    expiresAt: string;
  };
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Calls the Rill API as the signed-in user.
 *
 * `getAccessToken` refreshes the token when it is close to expiring, so this is the only place
 * that needs to think about token lifetime. The identity token rides along because the backend
 * uses it to read linked accounts — an email address, say — without holding a Privy app secret.
 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const [accessToken, identityToken] = await Promise.all([
    getAccessToken(),
    getIdentityToken(),
  ]);

  if (!accessToken) {
    throw new ApiError(401, "Not signed in");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (identityToken) headers.set("privy-id-token", identityToken);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, { ...init, headers });

  if (!response.ok) {
    throw new ApiError(response.status, await readError(response));
  }

  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
      error?: string;
    };
    const message = Array.isArray(body.message)
      ? body.message.join(", ")
      : (body.message ?? body.error);
    return message ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
