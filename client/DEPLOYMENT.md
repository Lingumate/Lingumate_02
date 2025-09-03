# Client Deployment Guide - Vercel

This guide explains how to deploy the Lingumate client to Vercel.

## Prerequisites

- Vercel account
- Node.js 18+ installed locally
- Git repository set up

## Environment Variables Setup

1. Create a `.env` file in the client directory based on `env.example`
2. Set up the following environment variables in Vercel:

### Required Environment Variables

```bash
# API Base URLs
VITE_API_BASE_URL=https://your-render-server.onrender.com
VITE_WEBSOCKET_URL=wss://your-render-server.onrender.com

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# Google AI Configuration
VITE_GOOGLE_AI_API_KEY=your_google_ai_api_key

# OpenAI Configuration
VITE_OPENAI_API_KEY=your_openai_api_key
```

## Deployment Steps

### Option 1: Vercel CLI (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from the client directory:
   ```bash
   cd client
   vercel
   ```

4. Follow the prompts to configure your project

### Option 2: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure the following settings:
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

5. Add all environment variables from the list above

6. Deploy!

## Build Configuration

The project uses the following build configuration:

- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Framework**: Vite
- **Node.js Version**: 18.x

## Post-Deployment

1. Update your server's `ALLOWED_ORIGINS` environment variable to include your Vercel domain
2. Test all features to ensure they work with the production API
3. Set up custom domain if needed

## Troubleshooting

### Build Errors
- Ensure all dependencies are properly installed
- Check that all environment variables are set
- Verify Node.js version compatibility

### Runtime Errors
- Check browser console for client-side errors
- Verify API endpoints are accessible
- Ensure CORS is properly configured on the server

### Environment Variables
- Double-check all VITE_ prefixed variables are set
- Ensure no typos in variable names
- Verify Firebase configuration is correct

## Support

For deployment issues, check:
1. Vercel deployment logs
2. Browser console errors
3. Network tab for API calls
4. Server logs for backend issues
