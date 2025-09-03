import { Router } from 'express';
import multer from 'multer';
import { ModelManager } from '../services/modelManager';
import { authenticateFirebaseToken, type AuthenticatedRequest } from '../middleware/firebaseAuth';

const router = Router();

// Configure multer for model file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit for model files
});

// Get all uploaded models
router.get('/models', authenticateFirebaseToken, async (req, res) => {
  try {
    const models = ModelManager.getModelsMetadata();
    res.json(models);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ message: 'Failed to fetch models' });
  }
});

// Get active model
router.get('/models/active', authenticateFirebaseToken, async (req, res) => {
  try {
    const activeModel = ModelManager.getActiveModel();
    const currentModelInfo = ModelManager.getCurrentModelInfo();
    res.json({ activeModel, currentModelInfo });
  } catch (error) {
    console.error('Error fetching active model:', error);
    res.status(500).json({ message: 'Failed to fetch active model' });
  }
});

// Reset to OpenAI model
router.post('/models/reset-to-openai', authenticateFirebaseToken, async (req, res) => {
  try {
    ModelManager.resetToOpenAI();
    res.json({ message: 'Reset to OpenAI model successfully' });
  } catch (error) {
    console.error('Error resetting to OpenAI:', error);
    res.status(500).json({ message: 'Failed to reset to OpenAI model' });
  }
});

// Set Gemini as primary model
router.post('/models/set-gemini-primary', authenticateFirebaseToken, async (req, res) => {
  try {
    ModelManager.setGeminiAsPrimary();
    res.json({ message: 'Gemini set as primary model successfully' });
  } catch (error) {
    console.error('Error setting Gemini as primary:', error);
    res.status(500).json({ message: 'Failed to set Gemini as primary model' });
  }
});

// Upload a new model
router.post('/models/upload', authenticateFirebaseToken, upload.single('model'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Model file is required' });
    }

    const { name, description, capabilities } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Model name is required' });
    }

    const capabilitiesArray = capabilities ? JSON.parse(capabilities) : ['speech-to-text', 'translation', 'text-to-speech'];

    const metadata = await ModelManager.uploadModel(
      req.file.buffer,
      name,
      description || '',
      capabilitiesArray
    );

    res.status(201).json({
      message: 'Model uploaded successfully',
      model: metadata
    });
  } catch (error) {
    console.error('Error uploading model:', error);
    res.status(500).json({ message: 'Failed to upload model' });
  }
});

// Activate a model
router.post('/models/:modelId/activate', authenticateFirebaseToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const success = await ModelManager.activateModel(modelId);
    
    if (success) {
      res.json({ message: 'Model activated successfully' });
    } else {
      res.status(400).json({ message: 'Failed to activate model' });
    }
  } catch (error) {
    console.error('Error activating model:', error);
    res.status(500).json({ message: 'Failed to activate model' });
  }
});

// Delete a model
router.delete('/models/:modelId', authenticateFirebaseToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const success = await ModelManager.deleteModel(modelId);
    
    if (success) {
      res.json({ message: 'Model deleted successfully' });
    } else {
      res.status(404).json({ message: 'Model not found' });
    }
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ message: 'Failed to delete model' });
  }
});

// Get model info
router.get('/models/:modelId', authenticateFirebaseToken, async (req, res) => {
  try {
    const { modelId } = req.params;
    const models = ModelManager.getModelsMetadata();
    const model = models.find(m => m.id === modelId);
    
    if (model) {
      res.json(model);
    } else {
      res.status(404).json({ message: 'Model not found' });
    }
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({ message: 'Failed to fetch model' });
  }
});

export default router;
