/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UsageMetadata } from '@google/genai';
import { ServerConfig } from './serverConfig';

// --- Configuration for AI Model Pricing ---
// TODO: This should be made more dynamic in the future, perhaps fetched from a config
// or a backend service, especially if multiple models or pricing tiers are used.

// Example pricing for a model like Gemini 2.5 Flash (Paid Tier, prices per 1 million tokens in USD)
// Based on documentation fetched earlier.
const GEMINI_FLASH_PRICING = {
  INPUT_PRICE_PER_MILLION_TOKENS_TEXT_VIDEO_IMAGE: 0.15, // USD
  INPUT_PRICE_PER_MILLION_TOKENS_AUDIO: 1.00,           // USD
  OUTPUT_PRICE_PER_MILLION_TOKENS_NON_THINKING: 0.60,   // USD
  OUTPUT_PRICE_PER_MILLION_TOKENS_THINKING: 3.50,       // USD 
                                                        // (Assuming non-thinking for now for simplicity)
  // For this basic calculator, we'll assume the output tokens are "non-thinking".
  // A more advanced calculator would need to know if "thinking" tokens are applicable.
};

// --- Configuration for Currency Conversion ---
// TODO: This should be fetched from a live exchange rate API for real-world use.
const USD_TO_SATOSHIS_EXCHANGE_RATE = 30000 * 100_000_000 / 1; // Example: 1 BTC = $30,000 USD
                                                               // (1 BTC = 100,000,000 satoshis)
                                                               // So, $1 = (100,000,000 / 30000) satoshis
const SATOSHIS_PER_USD = 100_000_000 / 30000;


export interface CostCalculationResult {
  baseAICostUSD: number;
  markupAmountUSD: number;
  totalCostUSD: number;
  totalCostSatoshis: number;
  details: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
    pricePerMillionInputTokensUSD: number;
    pricePerMillionOutputTokensUSD: number;
    adminMarkupPercentage: number;
    usdToSatoshisRate: number;
  };
}

/**
 * Calculates the estimated cost of an AI generation task.
 *
 * @param usageMetadata The token usage metadata from the Gemini API response.
 * @param serverConfig The server configuration containing the admin markup percentage.
 * @param inputType The type of input, to determine pricing tier (e.g., 'text', 'audio').
 *                  For simplicity, we'll use a generic pricing for now or distinguish text vs audio.
 * @param modelName Optional: Name of the model used, for future pricing variations.
 * @returns A CostCalculationResult object or null if essential data is missing.
 */
export const calculateGenerationCost = (
  usageMetadata: UsageMetadata,
  serverConfig: ServerConfig,
  inputType: 'text' | 'audio' | 'video_image', // Simplified input types for pricing
  modelName?: string // For future use
): CostCalculationResult | null => {
  if (!usageMetadata || typeof usageMetadata.promptTokenCount !== 'number' || typeof usageMetadata.candidatesTokenCount !== 'number') {
    console.error('Cannot calculate cost: Essential token information is missing from usageMetadata.', usageMetadata);
    return null;
  }
  
  // For now, we are using totalTokenCount if available, otherwise sum of prompt and candidates.
  // Gemini API usually provides promptTokenCount and candidatesTokenCount.
  // totalTokenCount might include these and potentially other overhead.
  // Let's assume promptTokenCount is for input and candidatesTokenCount is for output for pricing.
  const promptTokens = usageMetadata.promptTokenCount || 0;
  const candidatesTokens = usageMetadata.candidatesTokenCount || 0;
  // const totalTokens = usageMetadata.totalTokenCount || (promptTokens + candidatesTokens);


  let inputPricePerMillionTokens: number;
  // TODO: Differentiate pricing based on modelName in the future
  switch (inputType) {
    case 'audio':
      inputPricePerMillionTokens = GEMINI_FLASH_PRICING.INPUT_PRICE_PER_MILLION_TOKENS_AUDIO;
      break;
    case 'text':
    case 'video_image':
    default:
      inputPricePerMillionTokens = GEMINI_FLASH_PRICING.INPUT_PRICE_PER_MILLION_TOKENS_TEXT_VIDEO_IMAGE;
      break;
  }
  // Using non-thinking output price for now
  const outputPricePerMillionTokens = GEMINI_FLASH_PRICING.OUTPUT_PRICE_PER_MILLION_TOKENS_NON_THINKING;

  const inputCostUSD = (promptTokens / 1_000_000) * inputPricePerMillionTokens;
  const outputCostUSD = (candidatesTokens / 1_000_000) * outputPricePerMillionTokens;
  
  const baseAICostUSD = inputCostUSD + outputCostUSD;

  const adminMarkupPercentage = serverConfig.adminMarkupPercentage || 0;
  const markupAmountUSD = baseAICostUSD * adminMarkupPercentage;
  const totalCostUSD = baseAICostUSD + markupAmountUSD;

  // Convert total cost to satoshis (integer amount)
  const totalCostSatoshis = Math.ceil(totalCostUSD * SATOSHIS_PER_USD);

  return {
    baseAICostUSD,
    markupAmountUSD,
    totalCostUSD,
    totalCostSatoshis,
    details: {
      promptTokens,
      candidatesTokens,
      totalTokens: promptTokens + candidatesTokens, // Sum for clarity, though API might provide its own total
      pricePerMillionInputTokensUSD: inputPricePerMillionTokens,
      pricePerMillionOutputTokensUSD: outputPricePerMillionTokens,
      adminMarkupPercentage,
      usdToSatoshisRate: SATOSHIS_PER_USD,
    },
  };
};

/**
 * Converts a USD amount to satoshis using a predefined exchange rate.
 * @param amountUSD The amount in USD.
 * @returns The equivalent amount in satoshis (integer).
 */
export const usdToSatoshis = (amountUSD: number): number => {
  return Math.ceil(amountUSD * SATOSHIS_PER_USD);
};

/**
 * Formats satoshis into a more readable string (e.g., "1,234 sats").
 * @param satoshis The amount in satoshis.
 * @returns A formatted string.
 */
export const formatSatoshis = (satoshis: number): string => {
  return `${satoshis.toLocaleString()} sats`;
};
