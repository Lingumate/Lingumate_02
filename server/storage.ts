import {
  users,
  conversations,
  messages,
  aiChats,
  type User,
  type UpsertUser,
  type InsertConversation,
  type Conversation,
  type InsertMessage,
  type Message,
  type InsertAiChat,
  type AiChat,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Conversation operations
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | undefined>;
  updateConversationStatus(id: string, status: string): Promise<void>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  
  // Message operations
  createMessage(message: InsertMessage): Promise<Message>;
  getConversationMessages(conversationId: string): Promise<Message[]>;
  
  // AI Chat operations
  createAiChat(aiChat: InsertAiChat): Promise<AiChat>;
  getAiChat(id: string): Promise<AiChat | undefined>;
  updateAiChatMessages(id: string, messages: any[]): Promise<void>;
  getUserAiChats(userId: string): Promise<AiChat[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Conversation operations
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    return created;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    return conversation;
  }

  async updateConversationStatus(id: string, status: string): Promise<void> {
    await db
      .update(conversations)
      .set({ status, updatedAt: new Date() })
      .where(eq(conversations.id, id));
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.user1Id, userId),
          eq(conversations.status, "active")
        )
      )
      .orderBy(desc(conversations.createdAt));
  }

  // Message operations
  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db
      .insert(messages)
      .values(message)
      .returning();
    return created;
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  // AI Chat operations
  async createAiChat(aiChat: InsertAiChat): Promise<AiChat> {
    const [created] = await db
      .insert(aiChats)
      .values(aiChat)
      .returning();
    return created;
  }

  async getAiChat(id: string): Promise<AiChat | undefined> {
    const [chat] = await db
      .select()
      .from(aiChats)
      .where(eq(aiChats.id, id));
    return chat;
  }

  async updateAiChatMessages(id: string, messages: any[]): Promise<void> {
    await db
      .update(aiChats)
      .set({ messages, updatedAt: new Date() })
      .where(eq(aiChats.id, id));
  }

  async getUserAiChats(userId: string): Promise<AiChat[]> {
    return await db
      .select()
      .from(aiChats)
      .where(eq(aiChats.userId, userId))
      .orderBy(desc(aiChats.createdAt));
  }
}

export const storage = new DatabaseStorage();
