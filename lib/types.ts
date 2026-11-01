export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
}

export interface SessionUser extends PublicUser {
  email: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  peer: PublicUser;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
}

export interface ProfileFormState {
  error?: string;
  field?: "username" | "nickname";
  success?: boolean;
}

export interface AuthFormState {
  error?: string;
  field?: "email" | "password" | "confirm";
}
