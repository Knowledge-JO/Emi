const PREFIX = "rill.chats.v1.";
export const CHATS_CHANGED = "rill-chats-changed";
export const NEW_CHAT = "rill-new-chat";
export const WALLET_CHANGED = "rill-wallet-changed";

export type StoredChat = {
  id: string;
  title: string;
  intentId: string | null;
  planId: string | null;
  selections: Record<string, string>;
  updatedAt: number;
};

function key(userId: string) {
  return `${PREFIX}${userId}`;
}

export function loadChats(userId: string): StoredChat[] {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredChat[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChats(userId: string, chats: StoredChat[]) {
  localStorage.setItem(key(userId), JSON.stringify(chats.slice(0, 50)));
  window.dispatchEvent(new Event(CHATS_CHANGED));
}

export function upsertChat(userId: string, chat: StoredChat) {
  const chats = loadChats(userId).filter((row) => row.id !== chat.id);
  saveChats(userId, [{ ...chat, updatedAt: Date.now() }, ...chats]);
}

export function notifyWalletChanged() {
  window.dispatchEvent(new Event(WALLET_CHANGED));
}
