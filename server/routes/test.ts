import { Router } from 'express';
import { authenticateFirebaseToken, type AuthenticatedRequest } from '../middleware/firebaseAuth';

const router = Router();

// Test route to verify authentication is working
router.get('/test-auth', authenticateFirebaseToken, async (req: AuthenticatedRequest, res) => {
  try {
    res.json({ 
      message: 'Authentication successful',
      user: req.user,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test auth error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

export default router;



