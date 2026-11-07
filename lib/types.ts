export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
}

export interface SessionUser extends PublicUser {
  email: string;
}

export interface MessageReply {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  replyTo?: MessageReply | null;
  editedAt?: string | null;
}

export interface ConversationSummary {
  id: string;
  peer: PublicUser;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
  peerLastReadAt: string | null;
  peerLastSeenAt: string | null;
  peerOnline: boolean;
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
