/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import Editor from '@monaco-editor/react';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import {Tab, TabList, TabPanel, Tabs} from 'react-tabs';

// import 'react-tabs/style/react-tabs.css'

import {parseHTML, parseJSON} from '@/lib/parse';
import {
  SPEC_ADDENDUM,
  SPEC_FROM_FILENAME_PROMPT,
  SPEC_FROM_PDF_CONTENT_PROMPT, // Added for PDF
  SPEC_FROM_TEXT_PROMPT,
  SPEC_FROM_TOPIC_PROMPT,
  SPEC_FROM_VIDEO_PROMPT,
  SPEC_FROM_WEBCONTENT_PROMPT, // Added for web content
  SPEC_FROM_WEBLINK_PROMPT,
} from '@/lib/prompts';
import {generateText, GenerateTextProps} from '@/lib/textGeneration';
import {InputContentType} from '@/lib/types';
import {HarmCategory, HarmBlockThreshold, SafetySetting} from '@google/genai';
import * as pdfjsLib from 'pdfjs-dist';

// Setup PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface ContentContainerProps {
  contentBasis: InputContentType | string; // Allow string for backward compatibility with examples
  preSeededSpec?: string;
  preSeededCode?: string;
  onLoadingStateChange?: (isLoading: boolean) => void;
}

type LoadingState = 'loading-spec' | 'loading-code' | 'ready' | 'error';

// Define default safety settings to be less restrictive
const defaultSafetySettings: SafetySetting[] = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];


// Export the ContentContainer component as a forwardRef component
export default forwardRef(function ContentContainer(
  {
    contentBasis,
    preSeededSpec,
    preSeededCode,
    onLoadingStateChange,
  }: ContentContainerProps,
  ref,
) {
  const [spec, setSpec] = useState<string>(preSeededSpec || '');
  const [code, setCode] = useState<string>(preSeededCode || '');
  // Determine initial loading state based on whether contentBasis is a string (old example) or InputContentType
  const initialLoadingState = () => {
    if (preSeededSpec && preSeededCode) return 'ready';
    if (typeof contentBasis === 'string' && contentBasis) return 'loading-spec'; // Legacy example string
    if (typeof contentBasis === 'object' && contentBasis.type) return 'loading-spec'; // New input type
    return 'ready'; // Default if no contentBasis
  };

  const [iframeKey, setIframeKey] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(initialLoadingState());
  const [error, setError] = useState<string | null>(null);
  const [currentContentBasis, setCurrentContentBasis] = useState<InputContentType | null>(null);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [editedSpec, setEditedSpec] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0); // 0: Spec, 1: Code, 2: Render

  // Expose methods to the parent component through ref
  useImperativeHandle(ref, () => ({
    getSpec: () => spec,
    getCode: () => code,
  }));

  // Helper function to extract text from a PDF file
  const getTextFromPdfFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return fullText;
  };

  // Helper function to attempt to fetch and extract text from a website
  const getTextFromWebsite = async (url: string): Promise<string | null> => {
    try {
      // setLoadingState('loading-spec'); // Indicate fetching
      // setError("Attempting to fetch website content..."); // Temporary status
      const response = await fetch(url, { mode: 'cors' }); // CORS limitation applies
      if (!response.ok) {
        //setError(`Failed to fetch website: ${response.status} ${response.statusText}. Using URL for spec.`);
        console.warn(`Failed to fetch website: ${response.status} ${response.statusText}`);
        return null;
      }
      const htmlString = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');
      // Basic text extraction
      let extractedText = doc.body.innerText || "";
      // Remove excessive newlines and whitespace
      extractedText = extractedText.replace(/\s\s+/g, ' ').trim();
      //setError(null); // Clear temporary status
      return extractedText;
    } catch (error) {
      console.error('Error fetching or parsing website content:', error);
      //setError(`Error fetching website content: ${error instanceof Error ? error.message : String(error)}. Using URL for spec.`);
      return null;
    }
  };


  // Helper function to generate content spec from various input types
    const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
    }
    return fullText;
  };


  // Helper function to generate content spec from various input types
  const generateSpecFromInput = async (
    input: InputContentType,
  ): Promise<string> => {
    let prompt = '';
    const genTextProps: GenerateTextProps = {
      modelName: 'gemini-1.5-flash-latest',
      responseMimeType: 'application/json',
      safetySettings: defaultSafetySettings,
    };
    let specNeedsAddendum = true; // Most prompts need it, PDF prompt includes it.

    switch (input.type) {
      case 'youtube':
        prompt = SPEC_FROM_VIDEO_PROMPT;
        genTextProps.videoUrl = input.url;
        break;
      case 'text':
        prompt = SPEC_FROM_TEXT_PROMPT.replace('{text}', input.description);
        genTextProps.inputText = input.description;
        break;
      case 'file':
        if (input.file.type === 'application/pdf') {
          setLoadingState('loading-spec'); // Or a more specific "processing-file"
          try {
            const pdfText = await getTextFromPdfFile(input.file);
            // Check if pdfText is empty or too short, fallback to filename
            if (!pdfText.trim() || pdfText.trim().length < 50) { // Arbitrary threshold
                console.warn("Extracted PDF text is very short or empty, falling back to filename.");
                prompt = SPEC_FROM_FILENAME_PROMPT.replace('{filename}', input.name);
                genTextProps.inputText = input.name;
            } else {
                prompt = SPEC_FROM_PDF_CONTENT_PROMPT.replace('{pdfText}', pdfText);
                genTextProps.inputText = pdfText; // Send extracted PDF text
                specNeedsAddendum = false; // SPEC_FROM_PDF_CONTENT_PROMPT already includes addendum
            }
          } catch (pdfError) {
            console.error('Error parsing PDF, falling back to filename:', pdfError);
            setError('Error processing PDF. Using filename for spec generation.');
            // Fallback to using filename if PDF parsing fails
            prompt = SPEC_FROM_FILENAME_PROMPT.replace('{filename}', input.name);
            genTextProps.inputText = input.name;
          }
        } else {
          // For other file types, use filename
          prompt = SPEC_FROM_FILENAME_PROMPT.replace('{filename}', input.name);
          genTextProps.inputText = input.name;
        }
        break;
      case 'weblink':
        // eslint-disable-next-line no-case-declarations
        const websiteUrl = input.url;
        //setError(null); // Clear previous errors before attempting fetch
        setLoadingState('loading-spec'); // Indicate general spec loading
        // Set a more specific message if desired, but global loadingState handles the spinner
        console.log("Attempting to fetch website content..."); // For console feedback

        // eslint-disable-next-line no-case-declarations
        const fetchedText = await getTextFromWebsite(websiteUrl);

        if (fetchedText && fetchedText.trim().length > 100) { // Arbitrary length check
          console.log("Successfully fetched website content.");
          prompt = SPEC_FROM_WEBCONTENT_PROMPT
            .replace('{webText}', fetchedText)
            .replace('{sourceUrl}', websiteUrl);
          genTextProps.inputText = fetchedText;
          specNeedsAddendum = false; // Webcontent prompt includes addendum
          setError(null); // Clear any previous non-blocking error from fetching
        } else {
          if (fetchedText) { // Content was fetched but too short
            console.warn("Fetched website content was too short. Falling back to URL.");
            setError("Fetched website content was too short. Using URL for spec generation.");
          } else { // Fetching failed
            console.warn("Failed to fetch website content directly. Falling back to URL.");
            setError("Could not fetch website content directly due to browser restrictions (e.g., CORS). Using URL for spec generation.");
          }
          prompt = SPEC_FROM_WEBLINK_PROMPT.replace('{url}', websiteUrl);
          genTextProps.inputText = websiteUrl;
          specNeedsAddendum = true; // WEBLINK_PROMPT needs addendum
        }
        break;
      case 'topic':
        prompt = SPEC_FROM_TOPIC_PROMPT.replace('{topic}', input.topic);
        genTextProps.inputText = input.topic;
        break;
      default:
        throw new Error('Unsupported input type for spec generation');
    }
    genTextProps.prompt = prompt;

    const specResponseText = await generateText(genTextProps);
    const parsedData = parseJSON(specResponseText);
    let generatedSpec = parsedData.spec;

    if (typeof generatedSpec !== 'string') {
      console.error('Parsed spec is not a string:', parsedData);
      throw new Error("The 'spec' field in the JSON response was not a string.");
    }

    if (specNeedsAddendum) {
      generatedSpec += SPEC_ADDENDUM;
    }
    return generatedSpec;
  };

  // Helper function to generate code from content spec
  const generateCodeFromSpec = async (specToUse: string): Promise<string> => {
    const codeResponseText = await generateText({
      modelName: 'gemini-1.5-flash-latest', // Updated model name
      prompt: specToUse,
      safetySettings: defaultSafetySettings,
    });
    const generatedCode = parseHTML(codeResponseText);
    return generatedCode;
  };

  // Propagate loading state changes as a boolean
  useEffect(() => {
    if (onLoadingStateChange) {
      const isLoading =
        loadingState === 'loading-spec' || loadingState === 'loading-code';
      onLoadingStateChange(isLoading);
    }
  }, [loadingState, onLoadingStateChange]);

  // Effect to normalize contentBasis and trigger content generation
  useEffect(() => {
    let inputToProcess: InputContentType | null = null;

    if (typeof contentBasis === 'string') {
      // Handle legacy string contentBasis (assumed to be YouTube URL for examples)
      if (contentBasis) { // Ensure it's not an empty string
        inputToProcess = {type: 'youtube', url: contentBasis};
      }
    } else if (contentBasis && typeof contentBasis === 'object' && contentBasis.type) {
      // Handle new InputContentType object
      inputToProcess = contentBasis;
    }
    setCurrentContentBasis(inputToProcess); // Store the processed basis
  }, [contentBasis]);


  // Main effect for generating spec and code when currentContentBasis changes
  useEffect(() => {
    async function generateContent() {
      if (!currentContentBasis) {
         // If there's no valid content basis after processing, set to ready or error.
         // This can happen if contentBasis was an empty string or undefined.
        if (!preSeededSpec && !preSeededCode) { // Avoid resetting if pre-seeded
          setLoadingState('ready'); // Or 'error' with a specific message
          setError("No valid input provided to generate content.");
          setActiveTabIndex(0); // Go to spec tab to show error or empty state
        }
        return;
      }
      // If we have pre-seeded content, skip generation for this specific basis
      if (preSeededSpec && preSeededCode) {
        setSpec(preSeededSpec);
        setCode(preSeededCode);
        setLoadingState('ready');
        setActiveTabIndex(2); // Jump to render tab
        return;
      }

      try {
        setLoadingState('loading-spec');
        setActiveTabIndex(0);
        setError(null);
        setSpec('');
        setCode('');

        const generatedSpec = await generateSpecFromInput(currentContentBasis);
        setSpec(generatedSpec);
        setLoadingState('loading-code');
        setActiveTabIndex(1);

        const generatedCode = await generateCodeFromSpec(generatedSpec);
        setCode(generatedCode);
        setLoadingState('ready');
        setActiveTabIndex(2);
      } catch (err) {
        console.error('Error generating content:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoadingState('error');
        // Determine active tab based on when the error occurred
        if (loadingState === 'loading-spec' || !spec) {
          setActiveTabIndex(0); // Error during spec generation or spec is empty
        } else {
          setActiveTabIndex(1); // Error during code generation
        }
      }
    }
    // Only run if not pre-seeded or if the currentContentBasis has changed
    // and is not null.
    if (currentContentBasis && !(preSeededSpec && preSeededCode)) {
       generateContent();
    } else if (preSeededSpec && preSeededCode) {
      // This handles the initial load with pre-seeded content correctly.
      setSpec(preSeededSpec);
      setCode(preSeededCode);
      setLoadingState('ready');
      setActiveTabIndex(2);
    }
  }, [currentContentBasis, preSeededSpec, preSeededCode]); // Removed spec from dependencies to avoid re-triggering on spec edit


  // Re-render iframe when code changes
  useEffect(() => {
    if (code) {
      setIframeKey((prev) => prev + 1);
    }
  }, [code]);

  // Show save message when code changes manually (not during initial load)
  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => {
        setSaveMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  const handleCodeChange = (value: string | undefined) => {
    setCode(value || '');
    setSaveMessage('HTML updated. Changes will appear in the Render tab.');
  };

  const handleSpecEdit = () => {
    setEditedSpec(spec);
    setIsEditingSpec(true);
  };

  const handleSpecSave = async () => {
    const trimmedEditedSpec = editedSpec.trim();

    // Only regenerate if the spec has actually changed
    if (trimmedEditedSpec === spec) {
      setIsEditingSpec(false); // Close the editor
      setEditedSpec(''); // Reset edited spec state
      return;
    }

    try {
      setLoadingState('loading-code');
      setError(null);
      setSpec(trimmedEditedSpec); // Update spec state with trimmed version
      setIsEditingSpec(false);
      setActiveTabIndex(1); // Switch to code tab while code generates

      // Generate code using the edited content spec
      const generatedCode = await generateCodeFromSpec(trimmedEditedSpec);
      setCode(generatedCode);
      setLoadingState('ready');
      setActiveTabIndex(2); // Switch to Render tab after code regeneration
    } catch (err) {
      console.error(
        'An error occurred while attempting to generate code:',
        err,
      );
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred',
      );
      setLoadingState('error');
      setActiveTabIndex(1); // If error, stay on or go to Code tab
    }
  };

  const handleSpecCancel = () => {
    setIsEditingSpec(false);
    setEditedSpec('');
  };

  const renderLoadingSpinner = () => (
    <div
      style={{
        alignItems: 'center',
        color: '#666',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        marginTop: '-2.5rem',
      }}>
      <div className="loading-spinner"></div>
      <p
        style={{
          color: 'light-dark(#787878, #f4f4f4)',
          fontSize: '1.125rem',
          marginTop: '20px',
        }}>
        {loadingState === 'loading-spec'
          ? `Generating content spec from ${currentContentBasis?.type || 'input'}...${
              currentContentBasis?.type === 'file' && currentContentBasis.file.type === 'application/pdf' ? ' (processing PDF)' :
              currentContentBasis?.type === 'weblink' ? ' (fetching website)' : ''
            }`
          : 'Generating code from content spec...'}
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div
      style={{
        alignItems: 'center',
        color: 'var(--color-error)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'center',
        marginTop: '-2.5rem',
        textAlign: 'center',
      }}>
      <div
        style={{
          fontFamily: 'var(--font-symbols)',
          fontSize: '5rem',
        }}>
        error
      </div>
      <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>Error</h3>
      <p>{error || 'Something went wrong'}</p>
      {/* Conditional error message for URL format removed as contentBasis is now an object */}
    </div>
  );

  // Styles for tab list
  const tabListStyle = {
    backgroundColor: 'transparent',
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: '0 12px',
  };

  // Styles for tabs
  const tabStyle = {
    borderTopLeftRadius: '4px',
    borderTopRightRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    marginRight: '4px',
    padding: '8px 12px',
  };

  // Base style for button container in spec tab
  const buttonContainerStyle = {padding: '0 1rem 1rem'};

  const renderSpecContent = () => {
    if (loadingState === 'error') {
      return spec ? (
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-technical)',
            lineHeight: 1.75,
            flex: 1,
            overflow: 'auto',
            padding: '1rem 2rem',
            maskImage:
              'linear-gradient(to bottom, black 95%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 95%, transparent 100%)',
          }}>
          {spec}
        </div>
      ) : (
        renderErrorState()
      );
    }

    if (loadingState === 'loading-spec') {
      return renderLoadingSpinner();
    }

    if (isEditingSpec) {
      return (
        <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
          <Editor
            height="100%"
            defaultLanguage="text"
            value={editedSpec}
            onChange={(value) => setEditedSpec(value || '')}
            theme="light"
            options={{
              minimap: {enabled: false},
              fontSize: 14,
              wordWrap: 'on',
              lineNumbers: 'off',
            }}
          />
          <div style={{display: 'flex', gap: '6px', ...buttonContainerStyle}}>
            <button onClick={handleSpecSave} className="button-primary">
              Save & regenerate code
            </button>
            <button onClick={handleSpecCancel} className="button-secondary">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-technical)',
            lineHeight: 1.75,
            flex: 1,
            overflow: 'auto',
            padding: '1rem 2rem',
            maskImage:
              'linear-gradient(to bottom, black 95%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, black 95%, transparent 100%)',
          }}>
          {spec}
        </div>
        <div style={buttonContainerStyle}>
          <button
            style={{display: 'flex', alignItems: 'center', gap: '5px'}}
            onClick={handleSpecEdit}
            className="button-primary">
            Edit{' '}
            <span
              style={{
                fontFamily: 'var(--font-symbols)',
                fontSize: '1.125rem',
              }}>
              edit
            </span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        border: '2px solid light-dark(#000, #fff)',
        borderRadius: '8px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: 'inherit',
        minHeight: 'inherit',
        overflow: 'hidden',
        position: 'relative',
      }}>
      <Tabs
        style={{
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          left: 0,
          position: 'absolute',
          right: 0,
          top: 0,
        }}
        selectedIndex={activeTabIndex}
        onSelect={(index) => {
          // If currently editing spec and switching away from spec tab (now index 0)
          if (isEditingSpec && index !== 0) { 
            setIsEditingSpec(false); // Exit edit mode
            setEditedSpec(''); // Clear edited content
          }
          setActiveTabIndex(index); // Update the active tab index
        }}>
        <TabList style={tabListStyle}>
          <Tab style={tabStyle} selectedClassName="selected-tab">
            Spec
          </Tab>
          <Tab style={tabStyle} selectedClassName="selected-tab">
            Code
          </Tab>
          <Tab style={tabStyle} selectedClassName="selected-tab">
            Render
          </Tab>
        </TabList>

        <div style={{flex: 1, overflow: 'hidden'}}>
          {/* Spec Panel (Index 0) */}
          <TabPanel
            style={{
              height: '100%',
              padding: '1rem',
              overflow: 'auto',
              boxSizing: 'border-box',
            }}>
            {renderSpecContent()}
          </TabPanel>

          {/* Code Panel (Index 1) */}
          <TabPanel style={{height: '100%', padding: '0'}}>
            {loadingState === 'error' ? (
              renderErrorState()
            ) : loadingState === 'loading-spec' || (loadingState === 'loading-code' && !code) ? ( // Show spinner if loading code and code isn't ready yet
              renderLoadingSpinner()
            ) : (
              <div style={{height: '100%', position: 'relative'}}>
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  value={code}
                  onChange={handleCodeChange}
                  theme="vs-dark"
                  options={{
                    minimap: {enabled: false},
                    fontSize: 14,
                    wordWrap: 'on',
                    formatOnPaste: true,
                    formatOnType: true,
                  }}
                />
                {saveMessage && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      background: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      fontSize: '12px',
                    }}>
                    {saveMessage}
                  </div>
                )}
              </div>
            )}
          </TabPanel>

          {/* Render Panel (Index 2) */}
          <TabPanel style={{height: '100%', padding: '0'}}>
            {loadingState === 'error' ? (
              renderErrorState()
            ) : loadingState !== 'ready' ? (
              renderLoadingSpinner()
            ) : (
              <div
                style={{height: '100%', width: '100%', position: 'relative'}}>
                <iframe
                  key={iframeKey}
                  srcDoc={code}
                  style={{
                    border: 'none',
                    width: '100%',
                    height: '100%',
                  }}
                  title="rendered-html"
                  sandbox="allow-scripts"
                />
              </div>
            )}
          </TabPanel>
        </div>
      </Tabs>

      <style>{`
        .selected-tab {
          background: light-dark(#f0f0f0, #fff);
          color: light-dark(#000, var(--color-background));
          font-weight: bold;
        }

        .react-tabs {
          width: 100%;
        }

        .react-tabs__tab-panel {
          border-top: 1px solid light-dark(#000, #fff);
        }

        .loading-spinner {
          animation: spin 1s ease-in-out infinite;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: var(--color-accent);
          height: 60px;
          width: 60px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
});