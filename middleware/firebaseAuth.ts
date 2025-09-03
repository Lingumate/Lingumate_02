
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

// Simple authentication middleware that accepts any valid token for now
// In production, you should properly verify Firebase ID tokens
export const authenticateFirebaseToken = async (
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

    // For now, accept any token that exists
    // In production, you should properly verify the Firebase ID token here
    // const decodedToken = await getAuth().verifyIdToken(token);
    
    // Set user information in the request (using a placeholder for now)
    (req as AuthenticatedRequest).user = {
      id: 'user-' + Date.now(), // Placeholder user ID
      email: 'user@example.com', // Placeholder email
    };

    next();
    return; // Add explicit return
  } catch (error) {
    console.error('Firebase authentication error:', error);
    return res.status(403).json({ message: 'Authentication failed' });
  }
};

