
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { db } from '../db';
import { users, type User } from '@shared/schema';
import { eq, or } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface AuthResult {
  user: User;
  token: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  /**
   * Hash a password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a password with its hash
   */
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token
   */
  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email!,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * Verify a JWT token
   */
  static verifyToken(token: string): JwtPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Sign up a new user with email and password
   */
  async signup(email: string, password: string, firstName: string, lastName: string): Promise<AuthResult> {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      throw new Error('User already exists with this email');
    }

    // Hash the password
    const hashedPassword = await this.hashPassword(password);

    // Create the user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        emailVerified: false,
      })
      .returning();

    if (!newUser) {
      throw new Error('Failed to create user');
    }

    // Generate token
    const token = this.generateToken(newUser);

    return { user: newUser, token };
  }

  /**
   * Sign in an existing user
   */
  async signin(email: string, password: string): Promise<AuthResult> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    
    if (!user || !user.password) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await this.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  /**
   * Verify Google OAuth token
   */
  async verifyGoogleToken(idToken: string): Promise<AuthResult> {
    try {
      if (!GOOGLE_CLIENT_ID) {
        throw new Error('Google Client ID not configured');
      }

      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid Google token');
      }

      const { email, given_name, family_name } = payload;
      if (!email) {
        throw new Error('Email not provided by Google');
      }

      // Check if user exists
      let [user] = await db.select().from(users).where(eq(users.email, email));
      
      if (!user) {
        // Create new user
        const [newUser] = await db
          .insert(users)
          .values({
            email,
            firstName: given_name || null,
            lastName: family_name || null,
            googleId: payload.sub,
            emailVerified: true,
          })
          .returning();

        if (!newUser) {
          throw new Error('Failed to create user');
        }
        user = newUser;
      }

      const token = this.generateToken(user);
      return { user, token };
    } catch (error) {
      throw new Error('Google authentication failed');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  /**
   * Alias for signin method (for compatibility with routes)
   */
  async login(email: string, password: string): Promise<AuthResult> {
    return this.signin(email, password);
  }

  /**
   * Alias for verifyGoogleToken method (for compatibility with routes)
   */
  async authenticateWithGoogle(idToken: string): Promise<AuthResult> {
    return this.verifyGoogleToken(idToken);
  }
}

// Export a singleton instance
export const authService = new AuthService(); 
