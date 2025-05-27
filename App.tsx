/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import ContentContainer from '@/components/ContentContainer';
import ExampleGallery from '@/components/ExampleGallery';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {Tabs, Tab, TextareaAutosize, TextField} from '@mui/material';
import {DataContext}from '@/context';
import {Example, InputType, InputContentType} from '@/lib/types'; // Added InputContentType
import {
  getYoutubeEmbedUrl,
  validateYoutubeUrl,
} from '@/lib/youtube';
import {isValidHttpUrl} from '@/lib/validation'; // Import the new validator
import {useContext, useEffect, useRef, useState} from 'react';

// Whether to validate the input URL before attempting to generate content
const VALIDATE_INPUT_URL = true;

// Whether to pre-seed with example content
const PRESEED_CONTENT = false;

export default function App() {
  const {defaultExample, examples} = useContext(DataContext);

  const [videoUrl, setVideoUrl] = useState( // Used for YouTube iframe preview
    PRESEED_CONTENT ? defaultExample?.url : '',
  );
  // New state for the structured input passed to ContentContainer
  const [currentContentInput, setCurrentContentInput] = useState<InputContentType | null>(
    PRESEED_CONTENT && defaultExample ? {type: 'youtube', url: defaultExample.url} : null
  );

  const [selectedInputType, setSelectedInputType] =
    useState<InputType>('youtube');
  const [textInputValue, setTextInputValue] = useState('');
  const [fileInputValue, setFileInputValue] = useState<File | null>(null);
  const [webLinkInputValue, setWebLinkInputValue] = useState('');
  const [topicInputValue, setTopicInputValue] = useState('');

  const [urlValidating, setUrlValidating] = useState(false); // Remains for URL-specific validation like YouTube
  const [contentLoading, setContentLoading] = useState(false);

  const contentContainerRef = useRef<{
    getSpec: () => string;
    getCode: () => string;
  } | null>(null);

  const [reloadCounter, setReloadCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const webLinkInputRef = useRef<HTMLInputElement>(null);
  const topicInputRef = useRef<HTMLInputElement>(null);

  const [selectedExample, setSelectedExample] = useState<Example | null>(
    PRESEED_CONTENT ? defaultExample : null,
  );

  const handleInputTypeChange = (
    event: React.SyntheticEvent,
    newValue: InputType,
  ) => {
    setSelectedInputType(newValue);
    // Clear specific input values
    if (inputRef.current) inputRef.current.value = ''; // YouTube URL input
    setTextInputValue('');
    if (fileInputRef.current) fileInputRef.current.value = ''; // Clear file input display
    setFileInputValue(null);
    setWebLinkInputValue('');
    setTopicInputValue('');

    // Reset states related to content generation and display
    setVideoUrl(''); // Clear YouTube preview URL
    setCurrentContentInput(null); // Clear the structured content input
    setSelectedExample(null);
    setContentLoading(false);
    setUrlValidating(false);
    // setReloadCounter(c => c + 1); // Optionally reset ContentContainer by changing key
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !urlValidating && !contentLoading) {
      // For text area, allow shift+enter for new line
      if (selectedInputType === 'text' && e.shiftKey) {
        return;
      }
      handleSubmit();
    }
  };

  const handleExampleSelect = (example: Example) => {
    // Ensure example selection only works when 'youtube' input type is selected
    // Ensure example selection only works when 'youtube' input type is selected or switches to it
    if (selectedInputType !== 'youtube') {
      setSelectedInputType('youtube');
    }
    if (inputRef.current) {
      inputRef.current.value = example.url; // Set the input field
    }
    setVideoUrl(example.url); // For the iframe preview
    setSelectedExample(example);
    setCurrentContentInput({type: 'youtube', url: example.url}); // Set for ContentContainer
    setReloadCounter((c) => c + 1);

    // Reset other specific input values
    setTextInputValue('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFileInputValue(null);
    setWebLinkInputValue('');
    setTopicInputValue('');
  };

  const handleSubmit = async () => {
    if (urlValidating || contentLoading) return; // Global loading check

    // Reset common states
    if (urlValidating || contentLoading) return;

    // Reset common states before validation
    setSelectedExample(null);
    setVideoUrl(''); // Cleared here, will be set on successful YouTube validation
    setCurrentContentInput(null); // Cleared here, will be set on successful validation of any type

    let inputForProcessing: InputContentType | null = null;
    let errorToShow: string | null = null;
    let fieldToFocus: React.RefObject<HTMLInputElement | HTMLTextAreaElement> | null = null;

    try {
      // General validating state set true at start of processing this specific type
      setUrlValidating(true); 

      switch (selectedInputType) {
        case 'youtube':
          // eslint-disable-next-line no-case-declarations
          const youtubeUrl = inputRef.current?.value.trim() || '';
          if (!youtubeUrl) {
            errorToShow = 'YouTube URL is required.';
            fieldToFocus = inputRef;
            break;
          }
          // eslint-disable-next-line no-case-declarations
          const isPreSeeded = examples.some(ex => ex.url === youtubeUrl) || defaultExample?.url === youtubeUrl;
          if (isPreSeeded) {
            setSelectedExample(examples.find(ex => ex.url === youtubeUrl) || defaultExample);
            setVideoUrl(youtubeUrl);
            inputForProcessing = {type: 'youtube', url: youtubeUrl};
            // setUrlValidating(false) will be handled in finally
          } else if (VALIDATE_INPUT_URL) {
            const validationResult = await validateYoutubeUrl(youtubeUrl); // This is async
            if (validationResult.isValid) {
              setVideoUrl(youtubeUrl);
              inputForProcessing = {type: 'youtube', url: youtubeUrl};
            } else {
              errorToShow = validationResult.error || 'Invalid YouTube URL.';
              fieldToFocus = inputRef;
            }
            // setUrlValidating(false) will be handled in finally after await
          } else {
            setVideoUrl(youtubeUrl);
            inputForProcessing = {type: 'youtube', url: youtubeUrl};
            // setUrlValidating(false) will be handled in finally
          }
          break;
        case 'text':
          // eslint-disable-next-line no-case-declarations
          const text = textInputValue.trim();
          if (!text) {
            errorToShow = 'Text description cannot be empty.';
            fieldToFocus = textInputRef;
            break;
          }
          inputForProcessing = {type: 'text', description: text};
          break;
        case 'file':
          if (!fileInputValue) {
            // fileInputRef cannot be focused programmatically for security.
            errorToShow = 'A file must be selected.';
            break;
          }
          // Optional: Add further file type validation here if needed
          // For now, we rely on the 'accept' attribute and ContentContainer's handling
          inputForProcessing = {type: 'file', file: fileInputValue, name: fileInputValue.name};
          break;
        case 'weblink':
          // eslint-disable-next-line no-case-declarations
          const webLink = webLinkInputValue.trim();
          if (!webLink) {
            errorToShow = 'Website link cannot be empty.';
            fieldToFocus = webLinkInputRef;
            break;
          }
          if (!isValidHttpUrl(webLink)) {
            errorToShow = 'Invalid website URL format. Must start with http:// or https://.';
            fieldToFocus = webLinkInputRef;
            break;
          }
          inputForProcessing = {type: 'weblink', url: webLink};
          break;
        case 'topic':
          // eslint-disable-next-line no-case-declarations
          const topic = topicInputValue.trim();
          if (!topic) {
            errorToShow = 'Topic cannot be empty.';
            fieldToFocus = topicInputRef;
            break;
          }
          inputForProcessing = {type: 'topic', topic: topic};
          break;
        default:
          errorToShow = 'Invalid input type selected. Please try again.';
          break;
      }

      if (errorToShow) {
        throw new Error(errorToShow); // Caught by catch block
      }

      if (inputForProcessing) {
        setCurrentContentInput(inputForProcessing);
        setContentLoading(true); // Start content loading AFTER validation passes
        setReloadCounter((c) => c + 1);
      } else {
        // Should not happen if errorToShow logic is correct, but as a fallback:
        setContentLoading(false);
        setUrlValidating(false); // Reset if no input to process and no error thrown
      }

    } catch (error: any) {
      alert(error.message || 'An unexpected error occurred.');
      setContentLoading(false); // Ensure loading is false on error
      setUrlValidating(false); // Reset validating state on error
      setCurrentContentInput(null);
      if (fieldToFocus && fieldToFocus.current) {
        fieldToFocus.current.focus();
      }
    } finally {
      // For synchronous validations or if YouTube validation was skipped
      if (selectedInputType !== 'youtube' || !VALIDATE_INPUT_URL || errorToShow) {
         setUrlValidating(false);
      }
      // If validateYoutubeUrl was called and finished, it would have setUrlValidating(false)
      // This finally block ensures it's false if an error occurred before or during async validation
      // or for non-YouTube types.
      // However, if validateYoutubeUrl is the *last* thing and it's async,
      // it needs its own .then/.catch/.finally or await to manage setUrlValidating(false)
      // The structure above for YouTube now implies setUrlValidating(false) will be hit
      // correctly after await or if it's pre-seeded/validation disabled.
    }
  };

  const handleContentLoadingStateChange = (isLoading: boolean) => {
    setContentLoading(isLoading);
    if (!isLoading) { 
      setUrlValidating(false); 
    }
  };

  const exampleGallery = (
    <ExampleGallery
      title={PRESEED_CONTENT ? 'More examples' : 'Examples'}
      onSelectExample={handleExampleSelect}
      selectedExample={selectedExample}
    />
  );

  return (
    <>
      <div className="app-wrapper">
        <Header 
          siteTitle="Video to Learning App"
          subTitle="Generate interactive learning apps from various content types"
        />
        <div className="content-pusher">
          <main className="main-container">
            <div className="left-side">
              <div className="input-section">
                <Tabs
                  value={selectedInputType}
                  onChange={handleInputTypeChange}
                  aria-label="Input type selection"
                  variant="scrollable"
                  scrollButtons="auto"
                >
                  <Tab label="YouTube URL" value="youtube" />
                  <Tab label="Text Description" value="text" />
                  <Tab label="Upload File" value="file" />
                  <Tab label="Website Link" value="weblink" />
                  <Tab label="Topic" value="topic" />
                </Tabs>

                <div className="input-container">
                  {selectedInputType === 'youtube' && (
                    <>
                      <label htmlFor="youtube-url" className="input-label">
                        Paste a URL from YouTube:
                      </label>
                      <input
                        ref={inputRef}
                        id="youtube-url"
                        className="youtube-input"
                        type="text"
                        placeholder="https://www.youtube.com/watch?v=..."
                        defaultValue={PRESEED_CONTENT && selectedInputType === 'youtube' ? defaultExample?.url : ''}
                        disabled={urlValidating || contentLoading}
                        onKeyDown={handleKeyDown}
                        onChange={() => {
                          // setVideoUrl(''); // Handled by handleInputTypeChange or handleSubmit
                          // setSelectedExample(null); // Handled by handleInputTypeChange or handleSubmit
                        }}
                      />
                    </>
                  )}
                  {selectedInputType === 'text' && (
                    <>
                      <label htmlFor="text-input" className="input-label">
                        Enter a text description:
                      </label>
                      <TextareaAutosize
                        ref={textInputRef}
                        id="text-input"
                        className="text-input"
                        minRows={3}
                        placeholder="Describe the content you want to learn about..."
                        value={textInputValue}
                        disabled={urlValidating || contentLoading}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setTextInputValue(e.target.value)}
                        style={{width: '100%', marginTop: '8px', padding: '10px', border: '1px solid #ccc', borderRadius: '4px'}}
                      />
                    </>
                  )}
                  {selectedInputType === 'file' && (
                    <>
                      <label htmlFor="file-input" className="input-label">
                        Upload a file:
                      </label>
                      <input
                        ref={fileInputRef}
                        id="file-input"
                        className="file-input"
                        type="file"
                        accept="video/*, audio/*, .pdf, .txt, .md"
                        disabled={urlValidating || contentLoading}
                        onChange={(e) => setFileInputValue(e.target.files ? e.target.files[0] : null)}
                        style={{marginTop: '8px'}}
                      />
                    </>
                  )}
                  {selectedInputType === 'weblink' && (
                    <>
                      <label htmlFor="weblink-input" className="input-label">
                        Paste a website URL:
                      </label>
                      <TextField
                        inputRef={webLinkInputRef}
                        id="weblink-input"
                        className="weblink-input"
                        type="url"
                        placeholder="https://www.example.com"
                        value={webLinkInputValue}
                        disabled={urlValidating || contentLoading}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setWebLinkInputValue(e.target.value)}
                        fullWidth
                        variant="outlined"
                        size="small"
                        style={{marginTop: '8px'}}
                      />
                    </>
                  )}
                  {selectedInputType === 'topic' && (
                    <>
                      <label htmlFor="topic-input" className="input-label">
                        Enter a topic:
                      </label>
                      <TextField
                        inputRef={topicInputRef}
                        id="topic-input"
                        className="topic-input"
                        type="text"
                        placeholder="e.g., Quantum Physics, Machine Learning basics"
                        value={topicInputValue}
                        disabled={urlValidating || contentLoading}
                        onKeyDown={handleKeyDown}
                        onChange={(e) => setTopicInputValue(e.target.value)}
                        fullWidth
                        variant="outlined"
                        size="small"
                        style={{marginTop: '8px'}}
                      />
                    </>
                  )}
                </div>
                <div className="button-container">
                  <button
                    onClick={handleSubmit}
                    className="button-primary submit-button"
                    disabled={urlValidating || contentLoading || (selectedInputType === 'file' && !fileInputValue && !contentLoading)}
                  >
                    {urlValidating
                      ? 'Validating...'
                      : contentLoading
                        ? 'Generating...'
                        : 'Generate app'}
                  </button>
                </div>
              </div>

              <div className="video-container">
                {selectedInputType === 'youtube' && videoUrl ? (
                  <iframe
                    className="video-iframe"
                    src={getYoutubeEmbedUrl(videoUrl)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen></iframe>
                ) : (
                  <div className="video-placeholder">
                    {selectedInputType === 'youtube' ? 'Video will appear here' : 'Preview area for selected input'}
                  </div>
                )}
              </div>

              {/* Show gallery only if YouTube input is selected or if it's pre-seeded */}
              {(selectedInputType === 'youtube' || (PRESEED_CONTENT && !selectedInputType) ) && (
                <div className="gallery-container desktop-gallery-container">
                  {exampleGallery}
                </div>
              )}
            </div>

            <div className="right-side">
              <div className="content-area">
                {currentContentInput || (PRESEED_CONTENT && defaultExample && selectedExample === defaultExample) ? (
                  <ContentContainer
                    key={reloadCounter}
                    contentBasis={currentContentInput || (selectedExample ? {type: 'youtube', url: selectedExample.url} : defaultExample ? { type: 'youtube', url: defaultExample.url } : '')} // Fallback for initial preseed
                    onLoadingStateChange={handleContentLoadingStateChange}
                    preSeededSpec={selectedExample?.spec}
                    preSeededCode={selectedExample?.code}
                    ref={contentContainerRef}
                  />
                ) : (
                  <div className="content-placeholder">
                    <p>
                      {urlValidating
                        ? 'Validating...'
                        : contentLoading
                          ? 'Loading content...'
                          : `Select an input type and provide content, or choose an example to begin.`
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Show gallery only if YouTube input is selected or if it's pre-seeded and no specific input type has been interacted with yet */}
              {(selectedInputType === 'youtube' || (PRESEED_CONTENT && !currentContentInput && !textInputValue && !fileInputValue && !webLinkInputValue && !topicInputValue) ) && (
              <div className="gallery-container mobile-gallery-container">
                {exampleGallery}
              </div>
            </div>
          </main>
        </div>
        <Footer 
          attributionText="An experiment by <strong>Robin L. M. Cheung, MBA</strong>"
        />
      </div>
    </>
  );
}