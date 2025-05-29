# Praxeo Auto-didactapp

Praxeo Auto-didactapp is an innovative application that transforms various content sources—YouTube videos, text inputs, PDF documents, and audio files—into interactive web-based learning applications. It leverages generative AI to create educational specs and code, and integrates with Alby for Bitcoin Lightning Network micropayments.

## Features

*   **Diverse Input Sources:**
    *   **YouTube Videos:** Generate learning apps directly from YouTube video URLs.
    *   **Text Prompts:** Input topics, subject areas, or raw text to form the basis of your learning app.
    *   **PDF/Document Upload:** Upload PDF files (or .txt, .md) to extract text and generate an app.
    *   **Audio Upload:** Upload audio files (e.g., MP3, WAV) to generate content (current audio processing is client-side and best for smaller files).
*   **AI-Powered Content Generation:**
    *   Utilizes Google's Gemini models to generate a detailed specification ("spec") for the learning app.
    *   Generates HTML, CSS, and JavaScript code based on the spec to create a functional web app.
*   **User Guidance:** Provide optional specific instructions to the AI to tailor the generated app (e.g., target audience, style, key concepts).
*   **Alby Integration (Bitcoin Lightning Network):**
    *   **Authentication:** Log in securely using your Alby browser extension (WebLN).
    *   **Micropayments:** Pay for content generation using Bitcoin Lightning. Costs are calculated based on AI resource usage plus a configurable admin markup.
*   **Interactive Learning Experience:**
    *   View the generated specification.
    *   Edit the specification and regenerate code.
    *   View and interact with the rendered HTML application.
*   **Responsive Design:** Generated apps are designed to be functional on both desktop and mobile.

## How It Works

1.  **Select Input Type:** Choose your content source (YouTube, Text, PDF, Audio).
2.  **Provide Content:** Paste a URL, type text, or upload a file.
3.  **(Optional) Add Guidance:** Give the AI specific instructions on what to focus on or how to style the app.
4.  **Login with Alby:** If you haven't already, log in using your Alby extension.
5.  **Generate App:** Click "Generate App".
    *   The system first processes your input (e.g., extracts text from PDF).
    *   Then, it generates a specification for the learning app.
    *   Finally, it generates the HTML/CSS/JS code from the spec.
6.  **Review Cost:** After generation, the cost in satoshis (and USD equivalent) is displayed.
7.  **Pay Invoice:** Click "Pay with Alby" to generate a Lightning invoice. Pay it using your Alby wallet.
8.  **Access Content:** Once payment is (simulated as) confirmed, the generated spec, code, and rendered app become fully accessible.

## Run Locally

**Prerequisites:**
*   Node.js (version 18.x or higher recommended)
*   npm (usually comes with Node.js)
*   Alby Browser Extension (or another WebLN-compatible extension) for login and payment.

**Setup:**

1.  **Clone the repository (if you haven't already):**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables:**
    Create a file named `.env` in the root of the project (or copy `.env.example` if one exists) and add your Google Gemini API Key:
    ```env
    # Required: Your Google Gemini API Key
    VITE_GEMINI_API_KEY=your_gemini_api_key_here

    # Optional: For serverConfig.ts defaults (these are typically set server-side in production)
    # VITE_ADMIN_MARKUP_PERCENTAGE=0.15 
    # VITE_LIGHTNING_INTEGRATION_METHOD=alby_api 
    ```
    *   **Important:** The application currently uses `process.env.API_KEY` directly in `lib/textGeneration.ts`. For Vite projects, environment variables prefixed with `VITE_` are exposed to the client-side code. Ensure your `lib/textGeneration.ts` (and `lib/serverConfig.ts` if you use the VITE_ prefixes there) correctly accesses the API key. If `process.env.API_KEY` is used, it might be better suited for a Node.js backend context. For a pure client-side Vite app, `import.meta.env.VITE_GEMINI_API_KEY` is the standard way to access such variables. This README assumes you'll adapt key access as needed for your build setup.
    *   **Note on `lib/serverConfig.ts`:** This file simulates server-side configuration. In a production environment, `adminMarkupPercentage` and Alby API keys for payment verification would be securely managed on a backend, not exposed client-side.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    This will usually start the app on `http://localhost:5173` (or another port if 5173 is busy).

## Future Enhancements (User Feedback from Prompt)

Based on user feedback during development, potential future enhancements include:
*   **Purchasable Transcripts:** Offer transcripts of YouTube videos, uploaded media, etc., as a separate purchasable add-on.
*   **Adjunct Teaching Materials:** Allow users to optionally generate and purchase other lesson plans and teaching materials (e.g., quizzes, summaries) as upsells or cross-sells.
*   **Alternative Payment Providers:** Architect the solution to potentially support traditional payment providers (e.g., Etsy, Gumroad, Lemon Squeezy) as alternatives to or alongside Alby/BTCLN. This would involve abstracting the payment and authentication layers.
*   **LMS/Business Learning Formatting:** Options to format generated materials appropriately for Learning Management Systems or business learning contexts.

## Contributing

Contributions are welcome! Please refer to the project's issue tracker and consider discussing your proposed changes before submitting a pull request.
