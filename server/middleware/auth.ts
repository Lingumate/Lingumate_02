import { Request, Response, NextFunction } from 'express';
import { AuthService, authService } from '../services/auth';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

    // Get user from database
    const user = await authService.getUserById(payload.userId);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email!,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ message: 'Authentication failed' });
  }
}; 