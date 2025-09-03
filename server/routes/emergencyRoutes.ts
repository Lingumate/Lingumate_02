import express from 'express';
import { emergencyContactService } from '../services/emergencyContacts';

const router = express.Router();

// Resolve location coordinates to country
router.post('/location/resolve', async (req, res) => {
  try {
    const { lat, lng, accuracy } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    console.log(`🌍 Resolving location: ${lat}, ${lng}`);
    
    const countryData = await emergencyContactService.resolveLocationToCountry(lat, lng);
    
    console.log(`✅ Location resolved to: ${countryData.name} (${countryData.iso2})`);
    
    res.json(countryData);
  } catch (error) {
    console.error('❌ Location resolution error:', error);
    res.status(500).json({ 
      error: 'Failed to resolve location',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get emergency contacts for a country
router.get('/emergency/:countryCode', async (req, res) => {
  try {
    const { countryCode } = req.params;
    
    if (!countryCode) {
      return res.status(400).json({ 
        error: 'Country code is required' 
      });
    }

    console.log(`📞 Fetching emergency contacts for country: ${countryCode}`);
    
    const contacts = await emergencyContactService.getEmergencyContacts(countryCode.toUpperCase());
    
    console.log(`✅ Found ${contacts.length} emergency contacts for ${countryCode}`);
    
    res.json({
      country: countryCode.toUpperCase(),
      contacts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Emergency contacts error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch emergency contacts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get emergency contacts with location detection
router.post('/emergency/detect', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    
    if (!lat || !lng) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }

    console.log(`🔍 Detecting emergency contacts for location: ${lat}, ${lng}`);
    
    // First resolve location to country
    const countryData = await emergencyContactService.resolveLocationToCountry(lat, lng);
    
    // Then get emergency contacts for that country
    const contacts = await emergencyContactService.getEmergencyContacts(countryData.iso2);
    
    console.log(`✅ Found ${contacts.length} emergency contacts for ${countryData.name}`);
    
    res.json({
      country: countryData,
      contacts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Emergency detection error:', error);
    res.status(500).json({ 
      error: 'Failed to detect emergency contacts',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
