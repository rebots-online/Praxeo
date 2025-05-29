/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pdfjsLib from 'pdfjs-dist';

// Required for pdfjs-dist to work in Vite/modern web environments
// Use the recommended workerSrc path from the pdfjs-dist documentation for Vite:
// node_modules/pdfjs-dist/build/pdf.worker.min.mjs
// The import below might need adjustment based on how Vite handles static assets
// or if you copy the worker to the public directory.
// For a standard setup, you might need to ensure the worker file is served.
// A common pattern is to copy it to the public folder and reference it from there.
// If direct import isn't working, this is the typical fallback:
// pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
// We'll try a dynamic import path first.

// Try to set workerSrc using a dynamic import for ES modules
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();


/**
 * Processes an uploaded PDF file to extract its text content.
 * @param file The PDF file to process.
 * @returns A promise that resolves to the extracted text content as a string.
 *          Returns an empty string if processing fails.
 */
export const processPdfFile = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  let allText = '';

  try {
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => (item as any).str).join(' ');
      allText += pageText + '\n\n'; // Add double newline between pages
    }
    return allText.trim();
  } catch (error) {
    console.error('Error processing PDF file:', error);
    alert('Failed to process PDF file. Ensure it is a valid PDF.');
    return ''; // Or throw error if preferred
  }
};

/**
 * Processes an uploaded plain text file (.txt, .md, etc.) to read its content.
 * @param file The text file to process.
 * @returns A promise that resolves to the file content as a string.
 *          Returns an empty string if processing fails.
 */
export const processTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target && typeof event.target.result === 'string') {
        resolve(event.target.result);
      } else {
        resolve(''); // Resolve with empty if result is not string or null
      }
    };
    reader.onerror = (error) => {
      console.error('Error reading text file:', error);
      alert('Failed to read text file.');
      reject(error); // Or resolve with ''
    };
    reader.readAsText(file);
  });
};

/**
 * "Processes" an uploaded audio file.
 * Currently, this function is a placeholder and returns the File object itself.
 * Actual transcription or preparation for the AI model will be handled
 * in later stages or by the AI model directly if it supports audio file inputs.
 * @param file The audio file.
 * @returns A promise that resolves to the File object.
 */
export const processAudioFile = async (file: File): Promise<File> => {
  // Placeholder: In the future, this might involve client-side validation,
  // basic metadata extraction, or chunking for streaming if needed.
  // For now, we assume the AI service or a subsequent step handles transcription.
  console.log('Audio file selected:', file.name, 'Type:', file.type);
  return Promise.resolve(file);
};

/**
 * Determines the type of content and processes it accordingly.
 * @param contentSource The file object (PDF, TXT, MD, Audio) or a string (YouTube URL, text prompt).
 * @param inputType The type of the input ('pdf', 'text_file', 'audio_file', 'youtube_url', 'text_prompt').
 * @returns A promise that resolves to the processed content (string for text-based, File for audio) or null.
 */
export const processInput = async (
  contentSource: File | string,
  inputType: 'pdf' | 'text_file' | 'audio_file' | 'youtube_url' | 'text_prompt'
): Promise<string | File | null> => {
  if (typeof contentSource === 'string') {
    // For YouTube URL or direct text prompt, no further client-side processing needed here.
    // Validation for YouTube URL happens in App.tsx.
    return Promise.resolve(contentSource);
  }

  // Handle File inputs
  switch (inputType) {
    case 'pdf':
      if (contentSource.type === 'application/pdf') {
        return processPdfFile(contentSource);
      } else {
        alert('Invalid file type. Expected PDF.');
        return null;
      }
    case 'text_file':
      // Assuming .txt, .md are passed with this type
      return processTextFile(contentSource);
    case 'audio_file':
      // Add more specific audio type checks if necessary
      if (contentSource.type.startsWith('audio/')) {
        return processAudioFile(contentSource);
      } else {
        alert('Invalid file type. Expected audio.');
        return null;
      }
    default:
      console.warn('Unknown input type for processing:', inputType);
      return null;
  }
};
