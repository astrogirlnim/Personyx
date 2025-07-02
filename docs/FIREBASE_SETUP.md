# 🔥 Firebase Setup Guide - PersonaPulse

**Quick setup guide to get Firebase working with your PersonaPulse app.**

## 📋 Prerequisites

- Google account
- Node.js installed
- PersonaPulse codebase ready

## 🚀 Quick Setup (10 minutes)

### 1. Copy Environment Configuration

```bash
cp firebase-config.env .env
```

Your Firebase configuration is already set up in `firebase-config.env`. Just copy it to `.env`.

### 2. Enable Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your **Personyx** project
3. Click **Authentication** in the left sidebar
4. Click **Get started**
5. Go to **Sign-in method** tab
6. Click **Email/Password**
7. Enable both **Email/Password** and **Email link (passwordless sign-in)**
8. Click **Save**

### 3. Add OpenAI API Key to Functions

The Cloud Functions need an OpenAI API key to generate embeddings:

```bash
cd functions
firebase functions:config:set openai.api_key="your_openai_api_key_here"
```

Replace `your_openai_api_key_here` with your actual OpenAI API key.

### 4. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

This will deploy:

- `embeddings` - Single text embedding
- `batchEmbeddings` - Batch text embeddings
- `healthCheck` - Service health monitoring
- `getSupportedModels` - Available embedding models

### 5. Test the Setup

```bash
npm run check-firebase
```

## Configuration Details

Your actual Firebase configuration:

- **Project ID**: personyx-42c74
- **App ID**: 1:632516053530:web:436b256f521f8a303a5fa3
- **Functions URL**: https://us-central1-personyx-42c74.cloudfunctions.net

## Next Steps

After setup, your Personyx desktop app will:

- Allow users to choose between local OpenAI API key or managed Firebase service
- Automatically fall back to local OpenAI if Firebase is unavailable
- Store Firebase credentials securely with AES-256-GCM encryption

## Cost Information

- **Firebase**: Free tier includes 10K function invocations/month
- **OpenAI**: You pay for actual embedding API usage
- **Estimated cost**: ~$1-5/month for typical usage

## Troubleshooting

**Functions deployment fails**: Make sure OpenAI API key is set:

```bash
firebase functions:config:get
```

**Authentication errors**: Verify Email/Password is enabled in Firebase Console

**Environment issues**: Run the config checker:

```bash
npm run check-firebase
```

## ✅ Testing Your Setup

### Test Firebase Connection

```bash
npm run dev
```

The app should start without Firebase errors. Check the console for:

- ✅ `Firebase Auth initialized`
- ✅ `Firebase Embedding Provider initialized`

### Test Authentication (In App UI)

1. Try to use Firebase cloud embedding option
2. App should prompt for email/password
3. Create test account or sign in

## 🔧 Configuration Options

### Option A: Config File (Recommended)

Use `firebase.config.js` - easier to manage, automatically loaded.

### Option B: Environment Variables

Set these in your shell or `.env` file:

```bash
export FIREBASE_API_KEY="your_api_key"
export FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
export FIREBASE_PROJECT_ID="your-project-id"
# ... etc
```

## 🚨 Common Issues

### "Firebase not configured" Error

- Check that `firebase.config.js` exists and has correct values
- Verify project ID matches your Firebase project

### "Authentication failed" Error

- Ensure Email/Password is enabled in Firebase Console
- Check that authDomain matches your project

### "Functions not found" Error

- Cloud Functions not deployed yet (that's ok for basic testing)
- Will fall back to OpenAI provider automatically

## 📞 Need Help?

1. **Check `docs/firebase_functions_setup.md`** for detailed setup
2. **Verify Firebase Console settings**
3. **Check browser console** for detailed error messages

## 🎯 What's Next?

Once this basic setup is working:

1. **Deploy Cloud Functions** for full Firebase embedding support
2. **Test the provider switching** between OpenAI and Firebase
3. **Add production security rules**
4. **Set up monitoring and alerts**

---

**Current Status**: Basic Firebase integration ready for testing! 🎉
