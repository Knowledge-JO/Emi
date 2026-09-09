import type { ReactNode } from "react";

import { SignedInGate } from "../components/workspace-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <SignedInGate>{children}</SignedInGate>;
}
