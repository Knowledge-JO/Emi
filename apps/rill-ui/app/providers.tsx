"use client";

import { PrivyProvider } from "@privy-io/react-auth";

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

export function Providers({ children }: { children: React.ReactNode }) {
  if (!appId) {
    throw new Error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not set. Copy .env.example to .env.local and fill it in.",
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      {...(clientId ? { clientId } : {})}
      config={{
        loginMethods: ["email", "google", "wallet", "passkey"],
        appearance: {
          theme: "dark",
          landingHeader: "Sign in to Rill",
          loginMessage:
            "Describe an outcome. Let the agent economy deliver it.",
        },
        // Privy authenticates the user; it does not hold their authority. A Rill user acts
        // through an Altana smart account with scoped session keys, provisioned by the backend's
        // wallet module, so a second embedded wallet here would only be a decoy.
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
