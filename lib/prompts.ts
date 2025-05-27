/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

export const SPEC_FROM_VIDEO_PROMPT = `You are a pedagogist and product designer with deep expertise in crafting engaging learning experiences via interactive web apps.

Examine the contents of the attached video. Then, write a detailed and carefully considered spec for an interactive web app designed to complement the video and reinforce its key idea or ideas. The recipient of the spec does not have access to the video, so the spec must be thorough and self-contained (the spec must not mention that it is based on a video). Here is an example of a spec written in response to a video about functional harmony:

"In music, chords create expectations of movement toward certain other chords and resolution towards a tonal center. This is called functional harmony.

Build me an interactive web app to help a learner understand the concept of functional harmony.

SPECIFICATIONS:
1. The app must feature an interactive keyboard.
2. The app must showcase all 7 diatonic triads that can be created in a major key (i.e., tonic, supertonic, mediant, subdominant, dominant, submediant, leading chord).
3. The app must somehow describe the function of each of the diatonic triads, and state which other chords each triad tends to lead to.
4. The app must provide a way for users to play different chords in sequence and see the results.
[etc.]"

The goal of the app that is to be built based on the spec is to enhance understanding through simple and playful design. The provided spec should not be overly complex, i.e., a junior web developer should be able to implement it in a single html file (with all styles and scripts inline). Most importantly, the spec must clearly outline the core mechanics of the app, and those mechanics must be highly effective in reinforcing the given video's key idea(s).

Provide the result as a JSON object containing a single field called "spec", whose value is the spec for the web app.`;

export const SPEC_FROM_TEXT_PROMPT = `You are a pedagogist and product designer with deep expertise in crafting engaging learning experiences via interactive web apps.

Based on the following text description, write a detailed and carefully considered spec for an interactive web app designed to reinforce its key idea or ideas. The recipient of the spec does not have access to the original text, so the spec must be thorough and self-contained.

Text description: "{text}"

The goal of the app that is to be built based on the spec is to enhance understanding through simple and playful design. The provided spec should not be overly complex, i.e., a junior web developer should be able to implement it in a single html file (with all styles and scripts inline). Most importantly, the spec must clearly outline the core mechanics of the app, and those mechanics must be highly effective in reinforcing the key idea(s) from the text.

Provide the result as a JSON object containing a single field called "spec", whose value is the spec for the web app.`;

export const SPEC_FROM_FILENAME_PROMPT = `You are a pedagogist and product designer with deep expertise in crafting engaging learning experiences via interactive web apps.

A file named "{filename}" will be used as the basis for an interactive learning app. Infer the likely content or purpose based on this filename. Write a detailed and carefully considered spec for an interactive web app designed to complement the likely content of the file and reinforce its potential key ideas. The recipient of the spec does not have access to the file itself, so the spec must be thorough and self-contained, based on the inferred purpose from the filename.

The goal of the app that is to be built based on the spec is to enhance understanding through simple and playful design. The provided spec should not be overly complex, i.e., a junior web developer should be able to implement it in a single html file (with all styles and scripts inline). Most importantly, the spec must clearly outline the core mechanics of the app, and those mechanics must be highly effective in reinforcing the potential key idea(s) related to the file.

Provide the result as a JSON object containing a single field called "spec", whose value is the spec for the web app.`;

export const SPEC_FROM_WEBLINK_PROMPT = `You are a pedagogist and product designer with deep expertise in crafting engaging learning experiences via interactive web apps.

Examine the main purpose and features of the website at the following URL: {url}. Then, write a detailed and carefully considered spec for an interactive web app designed to complement this website and reinforce its key idea or ideas. The recipient of the spec does not have access to the website content directly for this task, so the spec must be thorough and self-contained based on the information you can infer or already know about the URL.

Website URL: "{url}"

The goal of the app that is to be built based on the spec is to enhance understanding through simple and playful design. The provided spec should not be overly complex, i.e., a junior web developer should be able to implement it in a single html file (with all styles and scripts inline). Most importantly, the spec must clearly outline the core mechanics of the app, and those mechanics must be highly effective in reinforcing the website's key idea(s).

Provide the result as a JSON object containing a single field called "spec", whose value is the spec for the web app.`;

export const SPEC_FROM_TOPIC_PROMPT = `You are a pedagogist and product designer with deep expertise in crafting engaging learning experiences via interactive web apps.

Based on the following topic, write a detailed and carefully considered spec for an interactive web app designed to help a user learn about this topic. The spec must be thorough and self-contained.

Topic: "{topic}"

The goal of the app that is to be built based on the spec is to enhance understanding through simple and playful design. The provided spec should not be overly complex, i.e., a junior web developer should be able to implement it in a single html file (with all styles and scripts inline). Most importantly, the spec must clearly outline the core mechanics of the app, and those mechanics must be highly effective in helping a user learn about the given topic.

Provide the result as a JSON object containing a single field called "spec", whose value is the spec for the web app.`;

export const SPEC_FROM_PDF_CONTENT_PROMPT = `
Generate a web app specification based on the text content extracted from the provided PDF document.
The extracted text is as follows:
"{pdfText}"

Your response should be a JSON object with a single key "spec", which is a string.
The spec should be a concise summary of the application's purpose and features, suitable for generating HTML code for a functional prototype.
`;
// Note: SPEC_ADDENDUM will be appended in ContentContainer.tsx after this prompt is used for SPEC_FROM_PDF_CONTENT_PROMPT.

export const SPEC_FROM_WEBCONTENT_PROMPT = `
Generate a web app specification based on the following text content extracted from the website {sourceUrl}.
Extracted text:
"{webText}"

Your response should be a JSON object with a single key "spec", which is a string.
The spec should be a concise summary of the application's purpose and features, suitable for generating HTML code for a functional prototype.
${SPEC_ADDENDUM}
`;

export const CODE_REGION_OPENER = '```';
export const CODE_REGION_CLOSER = '```';

export const SPEC_ADDENDUM = `\n\nThe app must be fully responsive and function properly on both desktop and mobile. Provide the code as a single, self-contained HTML document. All styles and scripts must be inline. In the result, encase the code between "${CODE_REGION_OPENER}" and "${CODE_REGION_CLOSER}" for easy parsing.`;
