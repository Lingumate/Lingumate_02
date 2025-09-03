<<<<<<< HEAD
# Server Deployment Guide - Render

This guide explains how to deploy the Lingumate server to Render.

## Prerequisites

- Render account
- PostgreSQL database (can be created on Render)
- All API keys and secrets ready

## Environment Variables Setup

1. Create a `.env` file in the server directory based on `env.example`
2. Set up the following environment variables in Render:

### Required Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# JWT and Session Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
SESSION_SECRET=your_super_secret_session_key_here_make_it_long_and_random

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_CLIENT_X509_CERT_URL=your_firebase_client_cert_url

# CORS Configuration
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. Ensure your repository has the `render.yaml` file in the root
2. Go to [render.com](https://render.com)
3. Click "New +" and select "Blueprint"
4. Connect your Git repository
5. Render will automatically detect and create all services
6. Set environment variables for each service

### Option 2: Manual Service Creation

#### Main API Service

1. Create a new Web Service
2. Connect your Git repository
3. Configure:
   - **Name**: `lingumate-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Plan**: Starter (or higher)

#### Handshake Service

1. Create another Web Service
2. Configure:
   - **Name**: `lingumate-handshake`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:handshake`
   - **Environment**: Node
   - **Plan**: Starter

#### Realtime Translation Service

1. Create another Web Service
2. Configure:
   - **Name**: `lingumate-realtime`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:realtime`
   - **Environment**: Node
   - **Plan**: Starter

#### Database

1. Create a new PostgreSQL service
2. Configure:
   - **Name**: `lingumate-db`
   - **Database**: `lingumate`
   - **User**: `lingumate_user`
   - **Plan**: Starter (or higher)

## Service Configuration

### Environment Variables

For each service, add the appropriate environment variables:

- **Main API**: All variables
- **Handshake**: Database, JWT, Session, CORS
- **Realtime**: Database, API keys, CORS

### Health Checks

Each service includes a `/health` endpoint for monitoring:
- Main API: `https://your-api.onrender.com/health`
- Handshake: `https://your-handshake.onrender.com/health`
- Realtime: `https://your-realtime.onrender.com/health`

### CORS Configuration

Update `ALLOWED_ORIGINS` to include:
- Your Vercel client domain
- Local development URLs
- Any other domains that need access

## Post-Deployment

1. Test all API endpoints
2. Verify WebSocket connections work
3. Test authentication flows
4. Check database connections
5. Monitor service health

## Monitoring

- Use Render's built-in monitoring
- Check service logs regularly
- Monitor database performance
- Set up alerts for service failures

## Troubleshooting

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check build command syntax

### Runtime Errors
- Review service logs
- Check environment variables
- Verify database connectivity
- Test health endpoints

### Database Issues
- Verify DATABASE_URL format
- Check database service status
- Ensure proper permissions

### CORS Errors
- Verify ALLOWED_ORIGINS includes client domain
- Check request headers
- Test with different origins

## Scaling

- Upgrade service plans as needed
- Monitor resource usage
- Set up auto-scaling if required
- Consider load balancing for high traffic

## Security

- Use strong, unique secrets
- Regularly rotate API keys
- Monitor for suspicious activity
- Keep dependencies updated

## Support

For deployment issues:
1. Check Render service logs
2. Verify environment variables
3. Test endpoints individually
4. Review service configuration
5. Contact Render support if needed
=======
# Server Deployment Guide - Render

This guide explains how to deploy the Lingumate server to Render.

## Prerequisites

- Render account
- PostgreSQL database (can be created on Render)
- All API keys and secrets ready

## Environment Variables Setup

1. Create a `.env` file in the server directory based on `env.example`
2. Set up the following environment variables in Render:

### Required Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database

# JWT and Session Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
SESSION_SECRET=your_super_secret_session_key_here_make_it_long_and_random

# API Keys
OPENAI_API_KEY=your_openai_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here

# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here

# Firebase Admin Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_firebase_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_CLIENT_ID=your_firebase_client_id
FIREBASE_CLIENT_X509_CERT_URL=your_firebase_client_cert_url

# CORS Configuration
ALLOWED_ORIGINS=https://your-vercel-app.vercel.app,http://localhost:3000
```

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. Ensure your repository has the `render.yaml` file in the root
2. Go to [render.com](https://render.com)
3. Click "New +" and select "Blueprint"
4. Connect your Git repository
5. Render will automatically detect and create all services
6. Set environment variables for each service

### Option 2: Manual Service Creation

#### Main API Service

1. Create a new Web Service
2. Connect your Git repository
3. Configure:
   - **Name**: `lingumate-api`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Plan**: Starter (or higher)

#### Handshake Service

1. Create another Web Service
2. Configure:
   - **Name**: `lingumate-handshake`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:handshake`
   - **Environment**: Node
   - **Plan**: Starter

#### Realtime Translation Service

1. Create another Web Service
2. Configure:
   - **Name**: `lingumate-realtime`
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start:realtime`
   - **Environment**: Node
   - **Plan**: Starter

#### Database

1. Create a new PostgreSQL service
2. Configure:
   - **Name**: `lingumate-db`
   - **Database**: `lingumate`
   - **User**: `lingumate_user`
   - **Plan**: Starter (or higher)

## Service Configuration

### Environment Variables

For each service, add the appropriate environment variables:

- **Main API**: All variables
- **Handshake**: Database, JWT, Session, CORS
- **Realtime**: Database, API keys, CORS

### Health Checks

Each service includes a `/health` endpoint for monitoring:
- Main API: `https://your-api.onrender.com/health`
- Handshake: `https://your-handshake.onrender.com/health`
- Realtime: `https://your-realtime.onrender.com/health`

### CORS Configuration

Update `ALLOWED_ORIGINS` to include:
- Your Vercel client domain
- Local development URLs
- Any other domains that need access

## Post-Deployment

1. Test all API endpoints
2. Verify WebSocket connections work
3. Test authentication flows
4. Check database connections
5. Monitor service health

## Monitoring

- Use Render's built-in monitoring
- Check service logs regularly
- Monitor database performance
- Set up alerts for service failures

## Troubleshooting

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are in package.json
- Check build command syntax

### Runtime Errors
- Review service logs
- Check environment variables
- Verify database connectivity
- Test health endpoints

### Database Issues
- Verify DATABASE_URL format
- Check database service status
- Ensure proper permissions

### CORS Errors
- Verify ALLOWED_ORIGINS includes client domain
- Check request headers
- Test with different origins

## Scaling

- Upgrade service plans as needed
- Monitor resource usage
- Set up auto-scaling if required
- Consider load balancing for high traffic

## Security

- Use strong, unique secrets
- Regularly rotate API keys
- Monitor for suspicious activity
- Keep dependencies updated

## Support

For deployment issues:
1. Check Render service logs
2. Verify environment variables
3. Test endpoints individually
4. Review service configuration
5. Contact Render support if needed
>>>>>>> 5886e40123c43fc2ba56868bfe94655deb4d9e53
