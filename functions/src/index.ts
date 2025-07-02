/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall, HttpsError, onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import cors from "cors";
import OpenAI from "openai";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// Initialize OpenAI client lazily to avoid deployment issues
let openai: OpenAI | null = null;

/**
 * Get OpenAI client instance
 * @return {OpenAI} OpenAI client
 */
function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

// CORS configuration for desktop app
const corsHandler = cors({
  origin: true, // Allow all origins for desktop app
  credentials: true,
});

// Embedding models configuration
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_TOKENS = 8191;
const MAX_BATCH_SIZE = 50;

/**
 * Helper function to validate authentication
 * @param {any} request - Firebase callable function request
 * @return {any} The authenticated user context
 */
function validateAuth(request: any): any {
  if (!request.auth) {
    logger.warn("Unauthenticated request to embedding function");
    throw new HttpsError("unauthenticated", "Authentication required");
  }
  return request.auth;
}

/**
 * Helper function to estimate tokens (rough estimation)
 * @param {string} text - Input text to estimate
 * @return {number} Estimated token count
 */
function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

/**
 * Helper function to validate text input
 * @param {string} text - Text to validate
 */
function validateText(text: string): void {
  if (!text || typeof text !== "string") {
    throw new HttpsError("invalid-argument", "Text must be a non-empty string");
  }

  if (text.length > 20000) {
    // Reasonable limit for text length
    throw new HttpsError(
      "invalid-argument",
      "Text too long (max 20,000 characters)",
    );
  }

  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens > MAX_TOKENS) {
    throw new HttpsError(
      "invalid-argument",
      `Text too long (estimated ${estimatedTokens} tokens, max ${MAX_TOKENS})`,
    );
  }
}

/**
 * Single text embedding generation
 * Authenticated callable function
 */
export const embeddings = onCall(
  {
    maxInstances: 5,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    const startTime = Date.now();

    try {
      // Validate authentication
      const auth = validateAuth(request);
      logger.info(`Embedding request from user: ${auth.uid}`);

      // Validate input
      const {text, model = EMBEDDING_MODEL} = request.data;
      validateText(text);

      // Generate embedding
      logger.info(`Generating embedding for text length: ${text.length}`);
      const response = await getOpenAIClient().embeddings.create({
        model: model,
        input: text,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const embedding = response.data[0];
      const processingTime = Date.now() - startTime;

      logger.info(`Embedding generated successfully in ${processingTime}ms`);

      return {
        embedding: embedding.embedding,
        model: model,
        dimensions: EMBEDDING_DIMENSIONS,
        usage: {
          tokens: response.usage?.total_tokens || 0,
        },
        processing_time: processingTime,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error("Embedding generation failed", {
        error: errorMessage,
        stack: errorStack,
        userId: request.auth?.uid,
      });

      // Handle specific OpenAI errors
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "insufficient_quota") {
          throw new HttpsError(
            "resource-exhausted",
            "OpenAI API quota exceeded",
          );
        }
        if (error.code === "rate_limit_exceeded") {
          throw new HttpsError("resource-exhausted", "Rate limit exceeded");
        }
      }
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to generate embedding");
    }
  },
);

/**
 * Batch text embedding generation
 * Authenticated callable function
 */
export const batchEmbeddings = onCall(
  {
    maxInstances: 3,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (request) => {
    const startTime = Date.now();

    try {
      // Validate authentication
      const auth = validateAuth(request);
      logger.info(`Batch embedding request from user: ${auth.uid}`);

      // Validate input
      const {texts, model = EMBEDDING_MODEL} = request.data;

      if (!Array.isArray(texts) || texts.length === 0) {
        throw new HttpsError(
          "invalid-argument",
          "Texts must be a non-empty array",
        );
      }

      if (texts.length > MAX_BATCH_SIZE) {
        throw new HttpsError(
          "invalid-argument",
          `Too many texts (max ${MAX_BATCH_SIZE})`,
        );
      }

      // Validate each text
      texts.forEach((text, index) => {
        try {
          validateText(text);
        } catch (error) {
          throw new HttpsError(
            "invalid-argument",
            `Text at index ${index}: ${error}`,
          );
        }
      });

      // Generate embeddings
      logger.info(`Generating batch embeddings for ${texts.length} texts`);
      const response = await getOpenAIClient().embeddings.create({
        model: model,
        input: texts,
        dimensions: EMBEDDING_DIMENSIONS,
      });

      const processingTime = Date.now() - startTime;
      const embeddings = response.data.map((item) => ({
        embedding: item.embedding,
        model: model,
        dimensions: EMBEDDING_DIMENSIONS,
        usage: {
          tokens: Math.ceil((response.usage?.total_tokens || 0) / texts.length),
        },
        processing_time: Math.ceil(processingTime / texts.length),
      }));

      logger.info(
        `Batch embeddings generated successfully in ${processingTime}ms`,
      );

      return {
        embeddings,
        total_tokens: response.usage?.total_tokens || 0,
        processing_time: processingTime,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;

      logger.error("Batch embedding generation failed", {
        error: errorMessage,
        stack: errorStack,
        userId: request.auth?.uid,
      });

      // Handle specific OpenAI errors
      if (error && typeof error === "object" && "code" in error) {
        if (error.code === "insufficient_quota") {
          throw new HttpsError(
            "resource-exhausted",
            "OpenAI API quota exceeded",
          );
        }
        if (error.code === "rate_limit_exceeded") {
          throw new HttpsError("resource-exhausted", "Rate limit exceeded");
        }
      }
      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to generate batch embeddings");
    }
  },
);

/**
 * Health check endpoint
 * Public HTTP endpoint for monitoring
 */
export const healthCheck = onRequest(
  {
    maxInstances: 1,
    timeoutSeconds: 10,
    memory: "128MiB",
  },
  (request, response) => {
    corsHandler(request, response, () => {
      const status = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        service: "personyx-embedding-service",
        version: "1.0.0",
        openai_configured: !!process.env.OPENAI_API_KEY,
      };

      response.json(status);
    });
  },
);

/**
 * Get supported models
 * Authenticated callable function
 */
export const getSupportedModels = onCall(
  {
    maxInstances: 1,
    timeoutSeconds: 10,
    memory: "128MiB",
  },
  async (request) => {
    try {
      // Validate authentication
      validateAuth(request);

      return {
        models: [
          {
            name: "text-embedding-3-small",
            dimensions: 1536,
            max_tokens: 8191,
            description: "High performance embedding model (recommended)",
          },
          {
            name: "text-embedding-3-large",
            dimensions: 3072,
            max_tokens: 8191,
            description: "Highest quality embedding model",
          },
        ],
        default_model: EMBEDDING_MODEL,
        max_batch_size: MAX_BATCH_SIZE,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      logger.error("Get supported models failed", {
        error: errorMessage,
        userId: request.auth?.uid,
      });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError("internal", "Failed to get supported models");
    }
  },
);
