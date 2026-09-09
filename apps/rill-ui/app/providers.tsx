"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  PrivyProvider,
  usePrivy,
  useLogin,
  useLogout,
  useWallets,
} from "@privy-io/react-auth";
import { bsc } from "viem/chains";

interface WalletState {
  enabled: boolean;
  ready: boolean;
  authenticated: boolean;
  address?: string;
  login: () => void;
  logout: () => void;
}

const WalletContext = createContext<WalletState>({
  enabled: false,
  ready: true,
  authenticated: false,
  login: () => {},
  logout: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();
  const { logout } = useLogout();
  const { wallets } = useWallets();
  const address = wallets[0]?.address;

  const value: WalletState = {
    enabled: true,
    ready,
    authenticated,
    address,
    login,
    logout,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  if (!appId) {
    return (
      <WalletContext.Provider
        value={{
          enabled: false,
          ready: true,
          authenticated: false,
          login: () => {},
          logout: () => {},
        }}
      >
        {children}
      </WalletContext.Provider>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#F3BA2F",
          logo: "/icon.svg",
        },
        loginMethods: ["wallet"],
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
        },
        defaultChain: bsc,
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
