"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { Composer } from "../components/chat/composer";
import { Thread, type ChatMessage } from "../components/chat/thread";
import { WorkspaceFrame } from "../components/workspace-shell";
import { useWallet } from "../providers";
import { grantPlan, revokePlan } from "@/lib/altana";
import { NEW_CHAT, notifyWalletChanged, upsertChat } from "@/lib/chat-store";
import { errorText } from "@/lib/format";
import {
  SUGGESTIONS,
  createIntent,
  createPlan,
  defaultSelections,
  executePlan,
  getIntent,
  getPlan,
  planIsPending,
  type IntentResponse,
  type PlanResponse,
} from "@/lib/rill";
import { loadChats } from "@/lib/chat-store";
import { useRillSession } from "@/lib/use-rill-session";

type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  intent: IntentResponse | null;
  plan: PlanResponse | null;
  selections: Record<string, string>;
};

function freshConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    messages: [],
    intent: null,
    plan: null,
    selections: {},
  };
}

export default function AppHome() {
  return (
    <Suspense fallback={<div className="flex h-dvh items-center justify-center text-sm text-muted">Loading…</div>}>
      <ChatHome />
    </Suspense>
  );
}

function ChatHome() {
  const { enabled } = useWallet();
  const session = useRillSession();
  const userId = session.status === "verified" ? session.user.id : null;
  const params = useSearchParams();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [seed] = useState(freshConversation);
  const [conversations, setConversations] = useState<Conversation[]>([seed]);
  const [selectedId, setSelectedId] = useState(seed.id);
  const [hydrated, setHydrated] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const current =
    conversations.find((conversation) => conversation.id === selectedId) ??
    conversations[0];

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [current?.messages.length, current?.plan?.execution.status]);

  useEffect(() => {
    if (!userId) return;
    const id = userId;
    let cancelled = false;
    async function hydrate() {
      const stored = loadChats(id);
      if (stored.length === 0) {
        setHydrated(true);
        return;
      }
      const restored: Conversation[] = [];
      for (const row of stored) {
        const conversation: Conversation = {
          id: row.id,
          title: row.title,
          messages: [],
          intent: null,
          plan: null,
          selections: row.selections,
        };
        try {
          if (row.intentId) {
            const intent = await getIntent(row.intentId);
            conversation.intent = intent;
            conversation.messages.push({
              id: crypto.randomUUID(),
              role: "user",
              text: intent.rawText,
            });
            conversation.messages.push({
              id: crypto.randomUUID(),
              role: "assistant",
              kind: "agents",
              intent,
            });
          }
          if (row.planId) {
            const plan = await getPlan(row.planId);
            conversation.plan = plan;
            conversation.messages.push({
              id: crypto.randomUUID(),
              role: "assistant",
              kind: "plan",
              plan,
            });
          }
        } catch {
          // Stale ids are dropped from the reconstructed thread.
        }
        restored.push(conversation);
      }
      if (cancelled) return;
      const pick = params.get("c");
      setConversations(restored.length > 0 ? restored : [freshConversation()]);
      setSelectedId(
        pick && restored.some((row) => row.id === pick)
          ? pick
          : restored[0]?.id ?? seed.id,
      );
      setHydrated(true);
    }
    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    const onNew = () => {
      const next = freshConversation();
      setConversations((prev) => [next, ...prev]);
      setSelectedId(next.id);
      setInput("");
    };
    window.addEventListener(NEW_CHAT, onNew);
    return () => window.removeEventListener(NEW_CHAT, onNew);
  }, []);

  useEffect(() => {
    const pick = params.get("c");
    if (pick) setSelectedId(pick);
  }, [params]);

  useEffect(() => {
    if (!userId || !current) return;
    if (!current.intent && current.messages.length === 0) return;
    upsertChat(userId, {
      id: current.id,
      title: current.title,
      intentId: current.intent?.id ?? null,
      planId: current.plan?.id ?? null,
      selections: current.selections,
      updatedAt: Date.now(),
    });
  }, [userId, current]);

  useEffect(() => {
    if (!current?.plan || !planIsPending(current.plan)) return;
    const planId = current.plan.id;
    const conversationId = current.id;
    let cancelled = false;
    const interval = window.setInterval(() => {
      void getPlan(planId).then((plan) => {
        if (cancelled) return;
        patch(conversationId, (conversation) => ({
          ...conversation,
          plan,
          messages: upsertPlan(conversation.messages, plan),
        }));
      });
    }, current.plan.engine === "temporal" ? 4000 : 1500);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [current?.id, current?.plan?.id, current?.plan?.engine, current?.plan?.execution.status, current?.plan?.status]);

  function patch(id: string, updater: (conversation: Conversation) => Conversation) {
    setConversations((prev) =>
      prev.map((conversation) => (conversation.id === id ? updater(conversation) : conversation)),
    );
  }

  async function submit(text: string) {
    if (!enabled) return;
    const conversationId = current?.id ?? startAndReturnId();
    setInput("");
    setBusy(true);

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", text };
    const statusId = crypto.randomUUID();

    patch(conversationId, (conversation) => ({
      ...conversation,
      title: text.length > 48 ? `${text.slice(0, 45)}…` : text,
      intent: null,
      plan: null,
      selections: {},
      messages: [
        ...conversation.messages,
        userMessage,
        { id: statusId, role: "assistant", kind: "status", text: "Matching agents…" },
      ],
    }));

    try {
      const intent = await createIntent(text);
      patch(conversationId, (conversation) => ({
        ...conversation,
        intent,
        selections: defaultSelections(intent.matches),
        messages: replaceMessage(conversation.messages, statusId, {
          id: statusId,
          role: "assistant",
          kind: "agents",
          intent,
        }),
      }));
    } catch (error) {
      patch(conversationId, (conversation) => ({
        ...conversation,
        messages: replaceMessage(conversation.messages, statusId, {
          id: statusId,
          role: "assistant",
          kind: "error",
          text: errorText(error),
        }),
      }));
    } finally {
      setBusy(false);
    }
  }

  function startAndReturnId() {
    const next = freshConversation();
    setConversations((prev) => [next, ...prev]);
    setSelectedId(next.id);
    return next.id;
  }

  function selectAgent(graphNodeId: string, agentId: string) {
    if (!current) return;
    patch(current.id, (conversation) => ({
      ...conversation,
      selections: { ...conversation.selections, [graphNodeId]: agentId },
    }));
  }

  async function continueToPlan() {
    if (!current?.intent || current.intent.matches.length === 0) return;
    setBusy(true);
    const statusId = crypto.randomUUID();
    patch(current.id, (conversation) => ({
      ...conversation,
      messages: [
        ...conversation.messages,
        { id: statusId, role: "assistant", kind: "status", text: "Building the authorization plan…" },
      ],
    }));
    try {
      const plan = await createPlan(current.intent.id, current.selections);
      patch(current.id, (conversation) => ({
        ...conversation,
        plan,
        messages: replaceMessage(conversation.messages, statusId, {
          id: statusId,
          role: "assistant",
          kind: "plan",
          plan,
        }),
      }));
    } catch (error) {
      patch(current.id, (conversation) => ({
        ...conversation,
        messages: replaceMessage(conversation.messages, statusId, {
          id: statusId,
          role: "assistant",
          kind: "error",
          text: errorText(error),
        }),
      }));
    } finally {
      setBusy(false);
    }
  }

  async function approve() {
    if (!current?.plan) return;
    setBusy(true);
    try {
      const plan = await grantPlan<PlanResponse>(current.plan);
      patch(current.id, (conversation) => ({
        ...conversation,
        plan,
        messages: upsertPlan(conversation.messages, plan),
      }));
      notifyWalletChanged();
    } catch (error) {
      appendError(current.id, errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!current?.plan) return;
    setBusy(true);
    try {
      const plan = await executePlan(current.plan.id);
      patch(current.id, (conversation) => ({
        ...conversation,
        plan,
        messages: upsertPlan(conversation.messages, plan),
      }));
      notifyWalletChanged();
      if (plan.execution.status === "failed") {
        appendError(current.id, plan.execution.error ?? "Execution failed");
      }
    } catch (error) {
      appendError(current.id, errorText(error));
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!current?.plan?.sessionPublicKey) return;
    setBusy(true);
    try {
      const plan = await revokePlan<PlanResponse>({
        id: current.plan.id,
        sessionPublicKey: current.plan.sessionPublicKey,
      });
      patch(current.id, (conversation) => ({
        ...conversation,
        plan,
        messages: upsertPlan(conversation.messages, plan),
      }));
    } catch (error) {
      appendError(current.id, errorText(error));
    } finally {
      setBusy(false);
    }
  }

  function appendError(id: string, text: string) {
    patch(id, (conversation) => ({
      ...conversation,
      messages: [
        ...conversation.messages,
        { id: crypto.randomUUID(), role: "assistant", kind: "error", text },
      ],
    }));
  }

  return (
    <WorkspaceFrame title={current?.title || "Rill"}>
      <div ref={scroller} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col px-4 pb-6 pt-8 md:px-6">
          {!hydrated ? (
            <p className="m-auto text-sm text-muted">Restoring chats…</p>
          ) : !current || current.messages.length === 0 ? (
            <EmptyState onPick={submit} />
          ) : (
            <Thread
              messages={current.messages}
              selections={current.selections}
              busy={busy}
              onSelectAgent={selectAgent}
              onContinue={() => void continueToPlan()}
              onApprove={() => void approve()}
              onRun={() => void run()}
              onRevoke={() => void revoke()}
            />
          )}
        </div>
      </div>
      <div className="border-t border-border bg-background/80 px-4 py-3 md:px-6">
        <div className="mx-auto w-full max-w-[760px]">
          <Composer
            value={input}
            disabled={busy}
            placeholder="Describe an outcome on BNB Chain…"
            onChange={setInput}
            onSubmit={(text) => void submit(text)}
          />
        </div>
      </div>
    </WorkspaceFrame>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="m-auto flex max-w-lg flex-col items-center text-center">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        What should happen on-chain?
      </h2>
      <p className="mt-2 text-sm text-muted">
        Send an outcome. If more than one agent can do it, you pick. Then review the session and run.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onPick(suggestion)}
            className="rounded-full border border-border px-3.5 py-1.5 text-sm text-muted hover:border-accent/40 hover:text-foreground"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function replaceMessage(messages: ChatMessage[], id: string, next: ChatMessage): ChatMessage[] {
  return messages.map((message) => (message.id === id ? next : message));
}

function upsertPlan(messages: ChatMessage[], plan: PlanResponse): ChatMessage[] {
  const index = messages.findIndex(
    (message) => message.role === "assistant" && message.kind === "plan",
  );
  const next: ChatMessage = {
    id: index >= 0 && messages[index] ? messages[index].id : crypto.randomUUID(),
    role: "assistant",
    kind: "plan",
    plan,
  };
  if (index >= 0) {
    return messages.map((message, i) => (i === index ? next : message));
  }
  return [...messages, next];
}
