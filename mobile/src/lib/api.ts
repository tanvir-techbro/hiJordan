import type {
  AuthResponse,
  ChatMessage,
  ConversationState,
  ConversationSummary,
  MobileUser,
  PublicUser,
} from "./types";

const DEFAULT_API_URL = "https://hi-jordan-phi.vercel.app";

export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  field?: string;

  constructor(message: string, status: number, field?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.field = field;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  token?: string | null;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(options.body === undefined
          ? {}
          : { "content-type": "application/json" }),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection.", 0);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const payload = data as { error?: unknown; field?: unknown } | null;
    const message =
      typeof payload?.error === "string"
        ? payload.error
        : "Something went wrong. Please try again.";
    const field =
      typeof payload?.field === "string" ? payload.field : undefined;
    throw new ApiError(message, response.status, field);
  }

  return data as T;
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/api/mobile/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function register(email: string, password: string) {
  return request<AuthResponse>("/api/mobile/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export function me(token: string) {
  return request<{ user: MobileUser }>("/api/mobile/me", { token });
}

export function updateMe(
  token: string,
  input: { username: string; nickname: string },
) {
  return request<{ user: MobileUser }>("/api/mobile/me", {
    method: "PATCH",
    token,
    body: input,
  });
}

export function listConversations(token: string) {
  return request<{ conversations: ConversationSummary[] }>(
    "/api/mobile/conversations",
    { token },
  );
}

export function startConversation(token: string, userId: string) {
  return request<{ conversationId: string }>("/api/mobile/conversations", {
    method: "POST",
    token,
    body: { userId },
  });
}

export function getMessages(token: string, conversationId: string) {
  return request<{ messages: ChatMessage[] } & ConversationState>(
    `/api/mobile/conversations/${conversationId}/messages`,
    { token },
  );
}

export function sendMessage(
  token: string,
  conversationId: string,
  body: string,
) {
  return request<{ message: ChatMessage }>(
    `/api/mobile/conversations/${conversationId}/messages`,
    { method: "POST", token, body: { body } },
  );
}

export function markRead(token: string, conversationId: string) {
  return request<{ ok: true }>(
    `/api/mobile/conversations/${conversationId}/read`,
    { method: "POST", token },
  );
}

export function searchUsers(token: string, query: string) {
  return request<{ users: PublicUser[] }>(
    `/api/mobile/users?q=${encodeURIComponent(query)}`,
    { token },
  );
}
