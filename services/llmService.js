// services/llmService.js
// LLM Gateway service for AI-powered insights
// Supports Anthropic Claude API with safe error handling and model fallback

const fetch = require('node-fetch');

// Configuration from environment
const LLM_PROVIDER = process.env.LLM_PROVIDER || 'anthropic';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Model configuration with fallback chain
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const FALLBACK_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
  'claude-3-sonnet-20240229',
];

/**
 * Get the configured model, validating it's not empty/invalid
 * @returns {string} Valid model string
 */
function getConfiguredModel() {
  const envModel = process.env.LLM_MODEL;

  // Check if model is set and not empty
  if (envModel && envModel.trim() && envModel.trim() !== 'undefined' && envModel.trim() !== 'null') {
    return envModel.trim();
  }

  console.log(`[llm] LLM_MODEL not set or invalid, using default: ${DEFAULT_MODEL}`);
  return DEFAULT_MODEL;
}

const LLM_MODEL = getConfiguredModel();

// Safety limits
const MAX_CONTEXT_SIZE = 50000; // characters
const MAX_RESPONSE_TOKENS = 2048;
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Truncate and limit context to prevent excessive API costs
 * @param {object} context - The context object to limit
 * @returns {object} Limited context object
 */
function limitContext(context) {
  const serialized = JSON.stringify(context);

  if (serialized.length <= MAX_CONTEXT_SIZE) {
    return context;
  }

  console.log(`[llm] Context too large (${serialized.length} chars), truncating...`);

  // Create a limited copy
  const limited = { ...context };

  // Truncate arrays to reduce size
  if (limited.top_refunded_products && Array.isArray(limited.top_refunded_products)) {
    limited.top_refunded_products = limited.top_refunded_products.slice(0, 5);
  }

  if (limited.top_return_stores && Array.isArray(limited.top_return_stores)) {
    limited.top_return_stores = limited.top_return_stores.slice(0, 3);
  }

  if (limited.per_store_breakdown && Array.isArray(limited.per_store_breakdown)) {
    limited.per_store_breakdown = limited.per_store_breakdown.slice(0, 5);
  }

  // Truncate any large strings
  for (const key of Object.keys(limited)) {
    if (typeof limited[key] === 'string' && limited[key].length > 1000) {
      limited[key] = limited[key].substring(0, 1000) + '...[truncated]';
    }
  }

  const newSize = JSON.stringify(limited).length;
  console.log(`[llm] Context reduced from ${serialized.length} to ${newSize} chars`);

  return limited;
}

/**
 * Check if an error indicates model not found
 * @param {number} status - HTTP status code
 * @param {string} errorText - Error response text
 * @returns {boolean} True if model not found error
 */
function isModelNotFoundError(status, errorText) {
  if (status === 404) return true;
  if (status === 400) {
    const lower = (errorText || '').toLowerCase();
    if (lower.includes('model') && (lower.includes('not found') || lower.includes('invalid') || lower.includes('does not exist'))) {
      return true;
    }
  }
  return false;
}

/**
 * Make a single API call to Anthropic
 * @param {object} options - Request options
 * @returns {Promise<object>} Response or error
 */
async function makeAnthropicRequest({ model, maxTokens, system, fullUserMessage }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [
          {
            role: 'user',
            content: fullUserMessage,
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return {
        ok: false,
        status: response.status,
        errorText,
        isModelError: isModelNotFoundError(response.status, errorText),
      };
    }

    const data = await response.json();
    return { ok: true, data };
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Generate JSON response from Claude API
 * Includes automatic retry with fallback models if model not found
 *
 * @param {object} options - Generation options
 * @param {string} options.system - System prompt
 * @param {string} options.user - User prompt
 * @param {object} options.jsonContext - JSON context to include
 * @param {string} [options.model] - Model override
 * @param {number} [options.maxTokens] - Max tokens override
 * @returns {Promise<object>} Parsed JSON response or error object
 */
async function generateJSON({ system, user, jsonContext, model, maxTokens }) {
  const requestedModel = model || LLM_MODEL;
  const usedMaxTokens = maxTokens || MAX_RESPONSE_TOKENS;

  console.log(`[llm] Generating JSON with ${LLM_PROVIDER}/${requestedModel}`);

  if (LLM_PROVIDER !== 'anthropic') {
    console.error(`[llm] Unsupported provider: ${LLM_PROVIDER}`);
    return {
      error: true,
      message: `Unsupported LLM provider: ${LLM_PROVIDER}`,
    };
  }

  if (!ANTHROPIC_API_KEY) {
    console.error(`[llm] Missing ANTHROPIC_API_KEY`);
    return {
      error: true,
      message: 'Missing ANTHROPIC_API_KEY environment variable',
    };
  }

  // Limit context size
  const limitedContext = limitContext(jsonContext);
  const contextStr = JSON.stringify(limitedContext, null, 2);

  console.log(`[llm] Context size: ${contextStr.length} chars`);

  // Build the user message with context
  const fullUserMessage = `${user}\n\nContext data (JSON):\n\`\`\`json\n${contextStr}\n\`\`\``;

  // Build list of models to try: requested model first, then fallbacks
  const modelsToTry = [requestedModel];
  for (const fallback of FALLBACK_MODELS) {
    if (!modelsToTry.includes(fallback)) {
      modelsToTry.push(fallback);
    }
  }

  let lastError = null;
  let usedModel = requestedModel;

  // Try models in order until one works
  for (let i = 0; i < modelsToTry.length; i++) {
    const tryModel = modelsToTry[i];
    const isRetry = i > 0;

    if (isRetry) {
      console.log(`[llm] Retrying with fallback model: ${tryModel}`);
    }

    try {
      const result = await makeAnthropicRequest({
        model: tryModel,
        maxTokens: usedMaxTokens,
        system,
        fullUserMessage,
      });

      if (!result.ok) {
        console.error(`[llm] API error ${result.status} for model ${tryModel}: ${result.errorText}`);

        // If model not found and we have more models to try, continue
        if (result.isModelError && i < modelsToTry.length - 1) {
          console.log(`[llm] Model ${tryModel} not found, will try fallback`);
          lastError = { status: result.status, errorText: result.errorText };
          continue;
        }

        // No more fallbacks or different error
        return {
          error: true,
          message: `Anthropic API error: ${result.status}`,
          details: result.errorText,
        };
      }

      // Success
      usedModel = tryModel;
      const data = result.data;

      if (isRetry) {
        console.log(`[llm] Successfully used fallback model: ${tryModel}`);
      }

      // Extract text content
      const textContent = data.content?.find(c => c.type === 'text')?.text;

      if (!textContent) {
        console.error(`[llm] No text content in response`);
        return {
          error: true,
          message: 'No text content in API response',
        };
      }

      console.log(`[llm] Received response: ${textContent.length} chars (model: ${usedModel})`);

      // Parse JSON from response
      // Claude sometimes wraps JSON in markdown code blocks
      let jsonStr = textContent.trim();

      // Remove markdown code blocks if present
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.slice(3);
      }

      if (jsonStr.endsWith('```')) {
        jsonStr = jsonStr.slice(0, -3);
      }

      jsonStr = jsonStr.trim();

      try {
        const parsed = JSON.parse(jsonStr);

        console.log(`[llm] Successfully parsed JSON response`);

        return {
          error: false,
          result: parsed,
          model: usedModel,
          usage: {
            input_tokens: data.usage?.input_tokens,
            output_tokens: data.usage?.output_tokens,
          },
        };
      } catch (parseErr) {
        console.error(`[llm] Failed to parse JSON response:`, parseErr.message);
        console.error(`[llm] Raw response:`, textContent.substring(0, 500));

        return {
          error: true,
          message: 'Failed to parse JSON from API response',
          raw_response: textContent.substring(0, 1000),
        };
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error(`[llm] Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
        return {
          error: true,
          message: `Request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds`,
        };
      }

      console.error(`[llm] Request failed for model ${tryModel}:`, err);
      lastError = err;

      // For network errors, don't retry with different model
      return {
        error: true,
        message: err.message || 'Unknown error',
      };
    }
  }

  // All models failed
  return {
    error: true,
    message: lastError?.message || 'All models failed',
    details: lastError?.errorText,
  };
}

/**
 * Check if LLM service is configured and available
 * @returns {object} { available, provider, model, reason? }
 */
function getStatus() {
  if (!ANTHROPIC_API_KEY) {
    return {
      available: false,
      provider: LLM_PROVIDER,
      model: LLM_MODEL,
      reason: 'Missing ANTHROPIC_API_KEY',
    };
  }

  return {
    available: true,
    provider: LLM_PROVIDER,
    model: LLM_MODEL,
  };
}

module.exports = {
  generateJSON,
  getStatus,
  LLM_MODEL,
  LLM_PROVIDER,
};
