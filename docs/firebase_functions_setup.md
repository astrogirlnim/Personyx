# Firebase Functions Setup for PersonaPulse MVP

This document provides setup instructions for Firebase Functions that will handle embedding requests from the PersonaPulse desktop application.

## Prerequisites

1. **Firebase Project**: Create a Firebase project at https://console.firebase.google.com
2. **Firebase CLI**: Install Firebase CLI tools
3. **OpenAI API Key**: For the embedding proxy function

## Installation Steps

### 1. Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Initialize Firebase Functions

```bash
# Login to Firebase
firebase login

# Initialize functions in a separate directory
mkdir personyx-firebase-functions
cd personyx-firebase-functions
firebase init functions

# Select your Firebase project
# Choose TypeScript
# Install dependencies
```

### 3. Install Dependencies

```bash
cd functions
npm install openai firebase-admin firebase-functions
```

### 4. Create Embedding Function

Create `functions/src/embeddings.ts`:

```typescript
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp } from 'firebase-admin/app';
import OpenAI from 'openai';

// Initialize Firebase Admin
initializeApp();

// Initialize OpenAI with environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const embeddings = onCall(async request => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { text, model = 'text-embedding-3-small' } = request.data;

  if (!text) {
    throw new HttpsError('invalid-argument', 'Text is required');
  }

  if (typeof text !== 'string') {
    throw new HttpsError('invalid-argument', 'Text must be a string');
  }

  try {
    const startTime = Date.now();

    const response = await openai.embeddings.create({
      model,
      input: text,
    });

    const processingTime = Date.now() - startTime;

    return {
      embedding: response.data[0].embedding,
      model: response.model,
      dimensions: response.data[0].embedding.length,
      usage: {
        tokens: response.usage.total_tokens,
      },
      processing_time: processingTime,
    };
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new HttpsError('internal', 'Failed to generate embedding');
  }
});

export const batchEmbeddings = onCall(async request => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { texts, model = 'text-embedding-3-small' } = request.data;

  if (!texts || !Array.isArray(texts)) {
    throw new HttpsError('invalid-argument', 'Texts array is required');
  }

  if (texts.length === 0) {
    throw new HttpsError('invalid-argument', 'At least one text is required');
  }

  if (texts.length > 50) {
    throw new HttpsError('invalid-argument', 'Maximum 50 texts per batch');
  }

  try {
    const startTime = Date.now();
    const embeddings = [];

    // Process texts individually to avoid rate limits
    for (const text of texts) {
      const response = await openai.embeddings.create({
        model,
        input: text,
      });

      embeddings.push({
        embedding: response.data[0].embedding,
        model: response.model,
        dimensions: response.data[0].embedding.length,
        usage: {
          tokens: response.usage.total_tokens,
        },
      });
    }

    const processingTime = Date.now() - startTime;

    return {
      embeddings,
      total_tokens: embeddings.reduce((sum, emb) => sum + emb.usage.tokens, 0),
      processing_time: processingTime,
    };
  } catch (error) {
    console.error('OpenAI batch embedding error:', error);
    throw new HttpsError('internal', 'Failed to generate batch embeddings');
  }
});
```

### 5. Update Index File

Update `functions/src/index.ts`:

```typescript
export { embeddings, batchEmbeddings } from './embeddings';
```

### 6. Set Environment Variables

```bash
# Set the OpenAI API key
firebase functions:config:set openai.api_key="your-openai-api-key-here"

# Deploy the configuration
firebase deploy --only functions:config
```

### 7. Deploy Functions

```bash
firebase deploy --only functions
```

## Security Configuration

### 1. Enable Authentication

In Firebase Console:

1. Go to Authentication
2. Enable "Email/Password" provider
3. (Optional) Configure authorized domains

### 2. Set CORS (if needed)

Functions automatically handle CORS for Firebase SDK calls.

### 3. Add Rate Limiting

Consider implementing rate limiting in functions:

```typescript
// In your function
const rateLimiter = new Map();
const RATE_LIMIT = 100; // requests per minute
const WINDOW = 60000; // 1 minute

function checkRateLimit(uid: string): boolean {
  const now = Date.now();
  const userRequests = rateLimiter.get(uid) || [];

  // Clean old requests
  const recentRequests = userRequests.filter(
    (time: number) => now - time < WINDOW
  );

  if (recentRequests.length >= RATE_LIMIT) {
    return false;
  }

  recentRequests.push(now);
  rateLimiter.set(uid, recentRequests);
  return true;
}
```

## Testing

### 1. Test Locally

```bash
# Start Firebase emulators
firebase emulators:start --only functions,auth

# Test with curl
curl -X POST \
  http://localhost:5001/your-project-id/us-central1/embeddings \
  -H 'Authorization: Bearer YOUR_ID_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"data": {"text": "Hello world", "model": "text-embedding-3-small"}}'
```

### 2. Test from Desktop App

The Firebase SDK in the desktop app will automatically use the correct endpoints.

## Cost Considerations

- **Firebase Functions**: Pay per invocation (2M free/month)
- **Firebase Auth**: Free tier covers 50k monthly active users
- **OpenAI API**: Pass-through costs (charged by token usage)

## Monitoring

1. **Firebase Console**: Monitor function invocations and errors
2. **Cloud Logging**: View detailed logs
3. **OpenAI Dashboard**: Monitor API usage and costs

## Production Configuration

1. **Environment Variables**: Use Firebase Functions config
2. **Error Handling**: Implement comprehensive error reporting
3. **Monitoring**: Set up alerts for failures and high usage
4. **Backup**: Consider fallback to direct OpenAI API

## Next Steps

1. Deploy the functions to your Firebase project
2. Update the desktop app Firebase configuration
3. Test the integration end-to-end
4. Add proper error handling and monitoring
