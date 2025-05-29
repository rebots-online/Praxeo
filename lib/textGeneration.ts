/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
/* tslint:disable */

import {
  FinishReason,
  GenerateContentConfig,
  // GenerateContentParameters, // No longer directly used for the call
  GoogleGenAI,
  Part,
  SafetySetting,
  GenerateContentResponse, // Ensure this is imported
  UsageMetadata, // Import for typing
} from '@google/genai';

// Use process.env.API_KEY directly as per guidelines.
const GEMINI_API_KEY = process.env.API_KEY;

// Supported input types for content generation
export type InputContentType = 
  | 'youtube_url'      // Content is a YouTube URL string
  | 'text_prompt'      // Content is a direct text string
  | 'pdf_text'         // Content is text extracted from a PDF (string)
  | 'audio_file'       // Content is an audio File object (requires further handling)
  | 'generic_file';    // For other file types that might be supported via Files API

// Interface for the structured response from generateText
export interface GenerationResult {
  text: string;
  usageMetadata?: UsageMetadata; // Includes totalTokenCount, etc.
}

export interface GenerateTextOptions {
  modelName: string;
  baseInstruction: string; 
  contentBasis: string | File; 
  inputType: InputContentType;
  userGuidance?: string; 
  temperature?: number;
  safetySettings?: SafetySetting[];
  responseMimeType?: string;
}

/**
 * Generate content using the Gemini API, handling various input types.
 *
 * @param options - Configuration options for the generation request.
 * @returns An object containing the generated text and token usage metadata.
 */
export async function generateText(
  options: GenerateTextOptions,
): Promise<GenerationResult> {
  const {
    modelName,
    baseInstruction,
    contentBasis,
    inputType,
    userGuidance,
    temperature = 0.75,
    safetySettings,
    responseMimeType,
  } = options;

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key is missing or empty. Please configure it in your environment.');
  }

  const ai = new GoogleGenAI({apiKey: GEMINI_API_KEY});

  let combinedPromptText = baseInstruction;
  if (userGuidance) {
    combinedPromptText += `\n\nUser Guidance: ${userGuidance}`;
  }

  const parts: Part[] = [];

  if (inputType === 'text_prompt' || inputType === 'pdf_text') {
    combinedPromptText += `\n\nContent to process:\n${contentBasis}`;
    parts.push({text: combinedPromptText});
  } else {
    parts.push({text: combinedPromptText});
  }

  if (inputType === 'youtube_url' && typeof contentBasis === 'string') {
    try {
      parts.push({
        fileData: {
          mimeType: 'video/mp4',
          fileUri: contentBasis,
        },
      });
    } catch (error) {
      console.error('Error processing YouTube URL for Gemini:', error);
      throw new Error(`Failed to prepare YouTube URL input: ${contentBasis}`);
    }
  } else if (inputType === 'audio_file' && contentBasis instanceof File) {
    console.warn(
      'Audio file input: Direct processing of local File objects via data URI. ' +
      'This has size limitations and may not be supported by all models. ' + 
      'Files API integration or server-side upload is recommended for robust audio handling.'
    );
    try {
      // Using inlineData for local files as it's more appropriate than fileUri for base64 data
      const arrayBuffer = await contentBasis.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64'); // Requires Buffer
      parts.push({
        inlineData: {
          mimeType: contentBasis.type || 'audio/mp3', // Or determine more accurately
          data: base64Data,
        }
      });
    } catch (error) {
      console.error('Error preparing audio file input for inlineData:', error);
      // Attempt to alert the user or provide a more specific message if possible
      let message = 'Failed to prepare audio file input.';
      if (error instanceof Error) {
        message += ` Error: ${error.message}`;
      }
      alert(message + " Please ensure the file is not too large and the browser can process it.");
      throw new Error(message);
    }
  } else if (inputType === 'generic_file' && contentBasis instanceof File) {
    console.warn('Generic file input: Requires Files API integration. This will likely fail.');
    parts.push({ text: `[Placeholder for file: ${contentBasis.name}]` });
  }

  const generationConfig: GenerateContentConfig = {
    temperature,
  };

  if (responseMimeType) {
    generationConfig.responseMimeType = responseMimeType;
  }
  
  const model = ai.getGenerativeModel({ model: modelName, safetySettings, generationConfig });

  try {
    const result = await model.generateContent({contents: [{role: 'user', parts}]});
    const response = result.response;

    if (!response) {
        throw new Error('Content generation failed: No response object returned.');
    }

    if (response.promptFeedback?.blockReason) {
      throw new Error(
        `Content generation failed: Prompt blocked (reason: ${response.promptFeedback.blockReason})`,
      );
    }

    if (!response.candidates || response.candidates.length === 0) {
      if (response.promptFeedback?.blockReason) {
         throw new Error(
          `Content generation failed: No candidates returned. Prompt feedback: ${response.promptFeedback.blockReason}`,
        );
      }
      throw new Error('Content generation failed: No candidates returned.');
    }

    const firstCandidate = response.candidates[0];

    if (
      firstCandidate.finishReason &&
      firstCandidate.finishReason !== FinishReason.STOP
    ) {
      if (firstCandidate.finishReason === FinishReason.SAFETY) {
        console.error('Safety ratings:', firstCandidate.safetyRatings);
        throw new Error(
          'Content generation failed: Response blocked due to safety settings. Check console for details.',
        );
      } else {
        throw new Error(
          `Content generation failed: Stopped due to ${firstCandidate.finishReason}.`,
        );
      }
    }
    
    if (typeof response.text !== 'function') {
        console.error("Response.text is not a function. Full response:", response);
        throw new Error('Content generation failed: Response format error, text is not available.');
    }
    
    // Extract text and usage metadata
    const generatedText = response.text();
    const usageMetadata = response.usageMetadata;

    if (usageMetadata) {
      console.log('Token usage: Prompt =', usageMetadata.promptTokenCount, 
                  'Candidates =', usageMetadata.candidatesTokenCount, 
                  'Total =', usageMetadata.totalTokenCount);
    } else {
      console.warn('Usage metadata not available in the response.');
    }

    return {
      text: generatedText,
      usageMetadata: usageMetadata, // Will be undefined if not present
    };

  } catch (error) {
    console.error(
      'An error occurred during Gemini API call or response processing:',
      error,
    );
    throw error;
  }
}
