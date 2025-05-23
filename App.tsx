/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

import ContentContainer from '@/components/ContentContainer';
import ExampleGallery from '@/components/ExampleGallery';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import {DataContext} from '@/context';
import {Example} from '@/lib/types';
import {
  getYoutubeEmbedUrl,
  validateYoutubeUrl,
} from '@/lib/youtube';
import {useContext, useEffect, useRef, useState} from 'react';

// Whether to validate the input URL before attempting to generate content
const VALIDATE_INPUT_URL = true;

// Whether to pre-seed with example content
const PRESEED_CONTENT = false;

export default function App() {
  const {defaultExample, examples} =
    useContext(DataContext);

  const [videoUrl, setVideoUrl] = useState(
    PRESEED_CONTENT ? defaultExample?.url : '',
  );

  const [urlValidating, setUrlValidating] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);

  const contentContainerRef = useRef<{
    getSpec: () => string;
    getCode: () => string;
  } | null>(null);

  const [reloadCounter, setReloadCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedExample, setSelectedExample] = useState<Example | null>(
    PRESEED_CONTENT ? defaultExample : null,
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !urlValidating && !contentLoading) {
      handleSubmit();
    }
  };

  const handleExampleSelect = (example: Example) => {
    if (inputRef.current) {
      inputRef.current.value = example.url;
    }
    setVideoUrl(example.url);
    setSelectedExample(example);
    setReloadCounter((c) => c + 1);
  };

  const handleSubmit = async () => {
    const inputValue = inputRef.current?.value.trim() || '';

    if (!inputValue) {
      inputRef.current?.focus();
      return;
    }

    if (urlValidating) return;

    setUrlValidating(true);
    setVideoUrl(''); 
    setContentLoading(false);
    setSelectedExample(null);

    const isPreSeededExample = [defaultExample, ...examples].some(
      (example) => example.url === inputValue,
    );

    if (isPreSeededExample) {
      proceedWithVideo(inputValue);
      return;
    }

    if (VALIDATE_INPUT_URL) {
      const validationResult = await validateYoutubeUrl(inputValue);
      if (validationResult.isValid) {
        proceedWithVideo(inputValue);
      } else {
        alert(validationResult.error || 'Invalid YouTube URL');
        setUrlValidating(false);
      }
    } else {
      proceedWithVideo(inputValue);
    }
  };

  const proceedWithVideo = (url: string) => {
    setVideoUrl(url);
    setReloadCounter((c) => c + 1);
    setUrlValidating(false);
  };

  const handleContentLoadingStateChange = (isLoading: boolean) => {
    setContentLoading(isLoading);
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
          subTitle="Generate interactive learning apps from YouTube content"
        />
        <div className="content-pusher">
          <main className="main-container">
            <div className="left-side">
              {/* Input elements moved up for better flow under fixed header */}
              <div className="input-section">
                <div className="input-container">
                  <label htmlFor="youtube-url" className="input-label">
                    Paste a URL from YouTube:
                  </label>
                  <input
                    ref={inputRef}
                    id="youtube-url"
                    className="youtube-input"
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=..."
                    defaultValue={PRESEED_CONTENT ? defaultExample?.url : ''}
                    disabled={urlValidating || contentLoading}
                    onKeyDown={handleKeyDown}
                    onChange={() => {
                      setVideoUrl('');
                      setSelectedExample(null);
                    }}
                  />
                </div>
                <div className="button-container">
                  <button
                    onClick={handleSubmit}
                    className="button-primary submit-button"
                    disabled={urlValidating || contentLoading}
                  >
                    {urlValidating
                      ? 'Validating URL...'
                      : contentLoading
                        ? 'Generating...'
                        : 'Generate app'}
                  </button>
                </div>
              </div>

              <div className="video-container">
                {videoUrl ? (
                  <iframe
                    className="video-iframe"
                    src={getYoutubeEmbedUrl(videoUrl)}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen></iframe>
                ) : (
                  <div className="video-placeholder">Video will appear here</div>
                )}
              </div>

              <div className="gallery-container desktop-gallery-container">
                {exampleGallery}
              </div>
            </div>

            <div className="right-side">
              <div className="content-area">
                {videoUrl ? (
                  <ContentContainer
                    key={reloadCounter}
                    contentBasis={videoUrl}
                    onLoadingStateChange={handleContentLoadingStateChange}
                    preSeededSpec={selectedExample?.spec}
                    preSeededCode={selectedExample?.code}
                    ref={contentContainerRef}
                  />
                ) : (
                  <div className="content-placeholder">
                    <p>
                      {urlValidating
                        ? 'Validating URL...'
                        : 'Paste a YouTube URL or select an example to begin'}
                    </p>
                  </div>
                )}
              </div>

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