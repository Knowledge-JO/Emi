import { apiFetch } from "@/lib/api";

export type JobRow = {
  id: string;
  workflowStepId: string | null;
  hirerKind: string;
  hirerUserId: string | null;
  hirerAgentId: string | null;
  workerAgentId: string;
  capabilityId: string | null;
  chainId: number;
  escrowAddress: string;
  onchainJobId: string | null;
  spec: Record<string, unknown>;
  specHash: string;
  amount: string;
  assetId: string;
  status: string;
  deadlineAt: string | null;
  createTxHash: string | null;
  fundTxHash: string | null;
  settleTxHash: string | null;
  disputeTxHash: string | null;
  cancelTxHash: string | null;
  disputeReason: string | null;
  fundedAt: string | null;
  acceptedAt: string | null;
  deliveredAt: string | null;
  settledAt: string | null;
  createdAt: string;
};

export type X402Payment = {
  id: string;
  direction: string;
  workflowStepId: string | null;
  sessionId: string | null;
  payerWalletId: string | null;
  payerAddress: string;
  payeeAddress: string;
  payerAgentId: string | null;
  payeeAgentId: string | null;
  resourceUrl: string;
  resourceMethod: string;
  httpStatus: number | null;
  rail: string;
  amount: string;
  tokenAddress: string;
  chainId: number;
  requestedAt: string;
  settledAt: string | null;
};

export function listJobs() {
  return apiFetch<JobRow[]>("/jobs");
}

export function getJob(id: string) {
  return apiFetch<JobRow>(`/jobs/${id}`);
}

export function createJob(body: { workerSlug: string; task: string; capabilityName?: string }) {
  return apiFetch<JobRow>("/jobs", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fundJob(id: string, sessionId?: string) {
  return apiFetch<unknown>(`/jobs/${id}/fund`, {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function syncJob(id: string) {
  return apiFetch<JobRow>(`/jobs/${id}/sync`, { method: "POST" });
}

export function deliverJob(id: string, payload: Record<string, unknown>) {
  return apiFetch<JobRow>(`/jobs/${id}/deliver`, {
    method: "POST",
    body: JSON.stringify({ payload }),
  });
}

export function acceptJob(id: string, reason?: string) {
  return apiFetch<JobRow>(`/jobs/${id}/accept`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function settleJob(id: string, sessionId?: string) {
  return apiFetch<JobRow>(`/jobs/${id}/settle`, {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function disputeJob(id: string, reason: string, sessionId?: string) {
  return apiFetch<JobRow>(`/jobs/${id}/dispute`, {
    method: "POST",
    body: JSON.stringify({ reason, sessionId }),
  });
}

export function refundJob(id: string, sessionId?: string) {
  return apiFetch<JobRow>(`/jobs/${id}/refund`, {
    method: "POST",
    body: JSON.stringify({ sessionId }),
  });
}

export function cancelJob(id: string) {
  return apiFetch<JobRow>(`/jobs/${id}/cancel`, { method: "POST" });
}

export function listPayments() {
  return apiFetch<X402Payment[]>("/x402/payments");
}

export function fetchX402(body: {
  url: string;
  method?: string;
  sessionId?: string;
}) {
  return apiFetch<unknown>("/x402/fetch", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
