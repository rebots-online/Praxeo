/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import {
  FinishReason,
  GenerateContentConfig,
  GenerateContentParameters,
  GoogleGenAI,
  HarmBlockThreshold,
  HarmCategory,
  Part,
  SafetySetting,
} from '@google/genai';

// Fix: Use process.env.API_KEY directly as per guidelines.
const GEMINI_API_KEY = process.env.API_KEY;

interface GenerateTextOptions {
  modelName: string;
  prompt: string;
  videoUrl?: string;
  temperature?: number;
  safetySettings?: SafetySetting[];
  responseMimeType?: string; // Added for specifying response MIME type
}

/**
 * Generate text content using the Gemini API, optionally including video data.
 *
 * @param options - Configuration options for the generation request.
 * @returns The response from the Gemini API.
 */
export async function generateText(
  options: GenerateTextOptions,
): Promise<string> {
  const {
    modelName,
    prompt,
    videoUrl,
    temperature = 0.75,
    safetySettings, // Use provided safetySettings
    responseMimeType, // Use provided responseMimeType
  } = options;

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing or empty');
  }

  const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  const parts: Part[] = [{text: prompt}];

  if (videoUrl) {
    try {
      parts.push({
        fileData: {
          mimeType: 'video/mp4',
          fileUri: videoUrl,
        },
      });
    } catch (error) {
      console.error('Error processing video input:', error);
      throw new Error(`Failed to process video input from URL: ${videoUrl}`);
    }
  }

  const generationConfig: GenerateContentConfig = {
    temperature,
  };

  // Fix: Add responseMimeType to generationConfig if provided
  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }

  const request: GenerateContentParameters = {
    model: modelName,
    contents: [{role: 'user', parts}],
    config: generationConfig,
  };

  // Fix: Apply safetySettings to the request if provided
  if (safetySettings) {
    request.safetySettings = safetySettings;
  }

  try {
    const response = await ai.models.generateContent(request);

    // Check for prompt blockage
    if (response.promptFeedback?.blockReason) {
      throw new Error(
        `Content generation failed: Prompt blocked (reason: ${response.promptFeedback.blockReason})`,
      );
    }

    // Check for response blockage
    if (!response.candidates || response.candidates.length === 0) {
      // Try to get more info from promptFeedback if available
      if (response.promptFeedback?.blockReason) {
         throw new Error(
          `Content generation failed: No candidates returned. Prompt feedback: ${response.promptFeedback.blockReason}`,
        );
      }
      throw new Error('Content generation failed: No candidates returned.');
    }

    const firstCandidate = response.candidates[0];

    // Check for finish reasons other than STOP
    if (
      firstCandidate.finishReason &&
      firstCandidate.finishReason !== FinishReason.STOP
    ) {
      if (firstCandidate.finishReason === FinishReason.SAFETY) {
        // Log safety ratings for debugging
        console.error('Safety ratings:', firstCandidate.safetyRatings);
        throw new Error(
          'Content generation failed: Response blocked due to safety settings.',
        );
      } else {
        throw new Error(
          `Content generation failed: Stopped due to ${firstCandidate.finishReason}.`,
        );
      }
    }

    return response.text;
  } catch (error) {
    console.error(
      'An error occurred during Gemini API call or response processing:',
      error,
    );
    throw error;
  }
}
