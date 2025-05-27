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

export interface GenerateTextProps { // Renamed from GenerateTextOptions
  modelName: string;
  prompt: string;
  inputText?: string; // For text, topic, filename, weblink URL
  videoUrl?: string; // Kept for specific YouTube processing by the model
  // file?: File; // Placeholder for future direct file handling by the model
  temperature?: number;
  safetySettings?: SafetySetting[];
  responseMimeType?: string;
}

/**
 * Generate text content using the Gemini API.
 *
 * @param props - Configuration properties for the generation request.
 * @returns The response from the Gemini API.
 */
export async function generateText(
  props: GenerateTextProps,
): Promise<string> {
  const {
    modelName,
    prompt,
    inputText,
    videoUrl,
    temperature = 0.75,
    safetySettings,
    responseMimeType,
  } = props;

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing or empty');
  }

  const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  // Initialize parts with the main prompt text.
  // If inputText is provided, it's assumed to be part of the prompt or the primary text content.
  // The specific prompts (SPEC_FROM_TEXT_PROMPT, etc.) should correctly incorporate this.
  const parts: Part[] = [{text: prompt}];

  // If videoUrl is provided (specifically for YouTube videos or direct video links),
  // add it as fileData. For other input types like text, weblink, topic, filename,
  // their content is expected to be embedded within the `prompt` itself (using `inputText`).
  if (videoUrl) {
    try {
      parts.push({
        fileData: {
          mimeType: 'video/mp4', // Assuming video/mp4 for URLs, might need adjustment for other file types if directly supported
          fileUri: videoUrl,
        },
      });
    } catch (error) {
      console.error('Error processing video input:', error);
      // It's crucial to decide if this should be a fatal error.
      // If a video URL is provided but fails, it might be better to throw.
      throw new Error(`Failed to process video input from URL: ${videoUrl}`);
    }
  }
  // Note: Direct file objects (props.file) are not handled here yet.
  // That would require a different mechanism, possibly involving multipart requests
  // or uploading the file and then passing a URI, depending on the model's capabilities.
  // For now, file-based input relies on the filename being incorporated into the prompt (via inputText).

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
