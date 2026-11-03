export interface PublicUser {
  id: string;
  username: string;
  nickname: string;
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
  peerLastReadAt: string | null;
  peerLastSeenAt: string | null;
  peerOnline: boolean;
}

export interface ConversationState {
  peer: PublicUser;
  peerLastReadAt: string | null;
  peerLastSeenAt: string | null;
  peerOnline: boolean;
}

export interface MobileUser {
  id: string;
  email: string;
  username: string | null;
  nickname: string | null;
  createdAt: string;
  signInMethod: string;
}

export interface AuthResponse {
  token: string;
  user: MobileUser;
}
