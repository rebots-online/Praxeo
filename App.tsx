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
import {getYoutubeEmbedUrl, validateYoutubeUrl} from '@/lib/youtube';
import React, {useContext, useEffect, useRef, useState} from 'react';

import { calculateGenerationCost, formatSatoshis, CostCalculationResult } from '@/lib/costCalculator';
import { getServerConfig, ServerConfig } from '@/lib/serverConfig';
import { GenerationResult } from '@/lib/textGeneration'; // Make sure this is exported

// Whether to validate the input URL before attempting to generate content
const VALIDATE_INPUT_URL = true;

// Whether to pre-seed with example content
const PRESEED_CONTENT = false;

export default function App() {
  const {defaultExample, examples, userInfo } = useContext(DataContext); // For checking login status

  const [videoUrl, setVideoUrl] = useState(
    PRESEED_CONTENT && defaultExample ? defaultExample.url : '',
  );

  const [urlValidating, setUrlValidating] = useState(false); // Used for general input processing lock
  const [contentLoading, setContentLoading] = useState(false);

  const contentContainerRef = useRef<{
    getSpec: () => string;
    getCode: () => string;
  } | null>(null);

  const [reloadCounter, setReloadCounter] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null); // For YouTube URL
  const [selectedExample, setSelectedExample] = useState<Example | null>(
    PRESEED_CONTENT ? defaultExample : null,
  );

  // Input type state variables
  const [textPrompt, setTextPrompt] = useState('');
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [activeInputType, setActiveInputType] = useState('youtube'); // 'youtube', 'text', 'pdf', 'audio'
  const [userGuidance, setUserGuidance] = useState(''); // Added userGuidance state

  // New state variables for cost and payment
  const [serverConfig, setServerConfig] = useState<ServerConfig | null>(null);
  const [currentCost, setCurrentCost] = useState<CostCalculationResult | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'none' | 'generating' | 'cost_calculated' | 'invoice_generated' | 'paid' | 'failed'>('none');

  // Fetch server config on mount
  useEffect(() => {
    const config = getServerConfig(); // This is synchronous as per current lib/serverConfig.ts
    setServerConfig(config);
  }, []);

  const clearInputs = (preserveActiveType: boolean = false) => {
    if (inputRef.current) inputRef.current.value = '';
    setTextPrompt('');
    setSelectedPdfFile(null);
    setSelectedAudioFile(null);
    setVideoUrl(''); 
    setSelectedExample(null);
    setCurrentCost(null); // Reset cost when inputs change
    setPaymentInvoice(null);
    setPaymentStatus('none');
    if (!preserveActiveType) {
      // Potentially reset other states if needed
    }
  };
  
  const handleInputTypeChange = (type: string) => {
    setActiveInputType(type);
    clearInputs(true); 
    setUrlValidating(false);
    setContentLoading(false);
  };

  const handleTextPromptChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setTextPrompt(e.target.value);
    if (videoUrl) setVideoUrl(''); 
    if (selectedExample) setSelectedExample(null);
    setCurrentCost(null); setPaymentStatus('none');
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedPdfFile(e.target.files[0]);
      if (videoUrl) setVideoUrl('');
      if (selectedExample) setSelectedExample(null);
      setCurrentCost(null); setPaymentStatus('none');
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedAudioFile(e.target.files[0]);
      if (videoUrl) setVideoUrl('');
      if (selectedExample) setSelectedExample(null);
      setCurrentCost(null); setPaymentStatus('none');
    }
  };
  
  const handleYouTubeInputChange = () => {
    if (textPrompt) setTextPrompt('');
    if (selectedPdfFile) setSelectedPdfFile(null);
    if (selectedAudioFile) setSelectedAudioFile(null);
    if (videoUrl) setVideoUrl(''); 
    if (selectedExample) setSelectedExample(null);
    setCurrentCost(null); setPaymentStatus('none');
  };

  const handleUserGuidanceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserGuidance(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !urlValidating && !contentLoading) {
       if (activeInputType === 'youtube' || activeInputType === 'text'){ 
        handleSubmit();
       }
    }
  };

  const handleExampleSelect = (example: Example) => {
    handleInputTypeChange('youtube');
    if (inputRef.current) {
      inputRef.current.value = example.url;
    }
    setVideoUrl(example.url);
    setSelectedExample(example);
    setReloadCounter((c) => c + 1);
    // Reset payment/cost states for new example
    setCurrentCost(null);
    setPaymentInvoice(null);
    setPaymentStatus('generating'); // Assume generation starts immediately for example
  };

  const handleSubmit = async () => {
    setContentLoading(true);
    setUrlValidating(true); 
    setPaymentStatus('generating'); // New status
    setCurrentCost(null); 
    setPaymentInvoice(null); 

    let basisForContent: string | File | null = null;
    let inputTypeForGeneration = activeInputType;

    switch (activeInputType) {
      case 'youtube':
        const inputValue = inputRef.current?.value.trim() || '';
        if (!inputValue) {
          inputRef.current?.focus();
          setUrlValidating(false); setContentLoading(false); setPaymentStatus('none');
          return;
        }
        basisForContent = inputValue;
        const isPreSeeded = examples.find(ex => ex.url === inputValue);
        if (isPreSeeded) {
            setVideoUrl(inputValue); setSelectedExample(isPreSeeded);
            setReloadCounter(c => c + 1); setUrlValidating(false); 
            // ContentContainer will trigger onGenerationComplete
            return; 
        }
        if (VALIDATE_INPUT_URL) {
          const validationResult = await validateYoutubeUrl(inputValue);
          if (validationResult.isValid) {
            setVideoUrl(inputValue); setSelectedExample(null);
          } else {
            alert(validationResult.error || 'Invalid YouTube URL');
            setUrlValidating(false); setContentLoading(false); setPaymentStatus('none');
            return;
          }
        } else {
          setVideoUrl(inputValue); setSelectedExample(null);
        }
        break;
      case 'text':
        if (!textPrompt.trim()) {
          alert('Please enter a text prompt.');
          setUrlValidating(false); setContentLoading(false); setPaymentStatus('none');
          return;
        }
        basisForContent = textPrompt; setVideoUrl(''); setSelectedExample(null);
        break;
      case 'pdf':
        if (!selectedPdfFile) {
          alert('Please select a PDF/document file.');
          setUrlValidating(false); setContentLoading(false); setPaymentStatus('none');
          return;
        }
        basisForContent = selectedPdfFile; setVideoUrl(''); setSelectedExample(null);
        break;
      case 'audio':
        if (!selectedAudioFile) {
          alert('Please select an audio file.');
          setUrlValidating(false); setContentLoading(false); setPaymentStatus('none');
          return;
        }
        basisForContent = selectedAudioFile; setVideoUrl(''); setSelectedExample(null);
        break;
      default:
        setUrlValidating(false); setContentLoading(false); setPaymentStatus('none');
        return;
    }

    if (basisForContent) {
      setReloadCounter((c) => c + 1);
    }
  };
  
  const handleGenerationComplete = (generationResult: GenerationResult | null) => {
    setContentLoading(false); 
    setUrlValidating(false);  

    if (generationResult && generationResult.usageMetadata && serverConfig) {
      let costInputType: 'text' | 'audio' | 'video_image' = 'text';
      if (activeInputType === 'youtube') costInputType = 'video_image';
      else if (activeInputType === 'audio') costInputType = 'audio';

      const cost = calculateGenerationCost(generationResult.usageMetadata, serverConfig, costInputType);
      setCurrentCost(cost);
      if (cost) {
        setPaymentStatus('cost_calculated');
        console.log('Cost calculated:', cost);
      } else {
        setPaymentStatus('failed'); 
        alert("Could not calculate the cost for the generated content. Token information might be missing.");
      }
    } else {
      setCurrentCost(null);
      setPaymentStatus('failed'); 
    }
  };

  const handleContentLoadingStateChange = (isLoading: boolean) => {
    setContentLoading(isLoading);
    if (isLoading) {
      setPaymentStatus('generating');
      setCurrentCost(null);
      setPaymentInvoice(null);
    }
    // If no longer loading, and cost calculation hasn't happened (e.g. error before that)
    // ensure urlValidating is false. handleGenerationComplete will set it for successful cases.
    if (!isLoading && paymentStatus === 'generating') {
        setUrlValidating(false);
        // if an error happened within ContentContainer before onGenerationComplete could be called.
        // setPaymentStatus('failed'); // Consider if this is the right place
    }
  };

  const handleProceedToPay = async () => {
    if (!currentCost || !userInfo) {
      alert("Cannot proceed to payment. Cost not calculated or user not logged in.");
      return;
    }
    if (!window.webln) {
      alert("Please install Alby or another WebLN-compatible extension to pay.");
      return;
    }
    try {
      await window.webln.enable();
      const invoice = await window.webln.makeInvoice({
        amount: currentCost.totalCostSatoshis,
        defaultMemo: `Payment for AI-generated content (${activeInputType}) - RobinsAI.World`,
      });
      if (invoice && invoice.paymentRequest) {
        setPaymentInvoice(invoice.paymentRequest);
        setPaymentStatus('invoice_generated');
        alert(`Invoice generated: ${invoice.paymentRequest}. Amount: ${currentCost.totalCostSatoshis} sats. Please implement payment sending and verification.`);
      } else {
        throw new Error("Failed to generate invoice via WebLN.");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      alert(`Payment failed: ${error.message}`);
      setPaymentStatus('failed');
    }
  };

  const exampleGallery = (
    <ExampleGallery
      title={PRESEED_CONTENT ? 'More examples' : 'Examples'}
      onSelectExample={handleExampleSelect}
      selectedExample={selectedExample}
    />
  );
  
  let contentBasisForContainer: string | File | Example | null = null;
  let inputTypeForGenerationProp = activeInputType; // Renamed to avoid conflict
  if (selectedExample) { 
    contentBasisForContainer = selectedExample.url; 
    inputTypeForGenerationProp = 'youtube'; 
  } else {
    switch (activeInputType) {
        case 'youtube': contentBasisForContainer = videoUrl; break; 
        case 'text': contentBasisForContainer = textPrompt; break;
        case 'pdf': contentBasisForContainer = selectedPdfFile; break;
        case 'audio': contentBasisForContainer = selectedAudioFile; break;
    }
  }

  // New logic for showContentContainer
  let showContentContainer = false;
  if (contentBasisForContainer || (selectedExample && activeInputType === 'youtube')) {
      // We have something to process or display
      if (paymentStatus === 'paid' || paymentStatus === 'none' || paymentStatus === 'generating') {
          // Show content if paid, or if no payment has been initiated yet (e.g. free example), or currently generating
          showContentContainer = true;
      } else if (paymentStatus === 'cost_calculated' || paymentStatus === 'invoice_generated' || paymentStatus === 'failed') {
          // If cost is calculated or invoice is out, or failed, we also "show" ContentContainer
          // but it will be internally disabled by its `disableDisplay` prop.
          // This allows ContentContainer to manage its "Awaiting Payment" message.
          // Or, if it failed, CC will show its error state.
          showContentContainer = true;
      }
  }

  return (
    <>
      <div className="app-wrapper">
        <Header
          siteTitle="Video to Learning App"
          subTitle="Generate interactive learning apps from diverse content sources"
        />
        <div className="content-pusher">
          <main className="main-container">
            <div className="left-side">
              <div className="input-section">
                <div className="input-type-selector">
                  <label>
                    <input type="radio" name="inputType" value="youtube" checked={activeInputType === 'youtube'} onChange={() => handleInputTypeChange('youtube')} /> YouTube
                  </label>
                  <label>
                    <input type="radio" name="inputType" value="text" checked={activeInputType === 'text'} onChange={() => handleInputTypeChange('text')} /> Text
                  </label>
                  <label>
                    <input type="radio" name="inputType" value="pdf" checked={activeInputType === 'pdf'} onChange={() => handleInputTypeChange('pdf')} /> PDF/Doc
                  </label>
                  <label>
                    <input type="radio" name="inputType" value="audio" checked={activeInputType === 'audio'} onChange={() => handleInputTypeChange('audio')} /> Audio
                  </label>
                </div>

                {activeInputType === 'youtube' && (
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
                      defaultValue={selectedExample ? selectedExample.url : (PRESEED_CONTENT && defaultExample ? defaultExample.url : '')}
                      disabled={urlValidating || contentLoading}
                      onKeyDown={handleKeyDown}
                      onChange={handleYouTubeInputChange}
                    />
                  </div>
                )}
                {activeInputType === 'text' && (
                  <div className="input-container">
                    <label htmlFor="text-prompt" className="input-label">
                      Enter Topic, Subject, or Text Prompt:
                    </label>
                    <textarea
                      id="text-prompt"
                      className="text-input"
                      value={textPrompt}
                      onChange={handleTextPromptChange}
                      onKeyDown={handleKeyDown}
                      disabled={urlValidating || contentLoading}
                      placeholder="Describe the learning app you want to create..."
                    />
                  </div>
                )}
                {activeInputType === 'pdf' && (
                  <div className="input-container">
                    <label htmlFor="pdf-file" className="input-label">
                      Upload PDF or Document (.pdf, .txt, .md):
                    </label>
                    <input
                      type="file"
                      id="pdf-file"
                      className="file-input"
                      accept=".pdf,.txt,.md"
                      onChange={handlePdfFileChange}
                      disabled={urlValidating || contentLoading}
                    />
                    {selectedPdfFile && (
                      <p className="file-name-display">
                        Selected: {selectedPdfFile.name}
                      </p>
                    )}
                  </div>
                )}
                {activeInputType === 'audio' && (
                  <div className="input-container">
                    <label htmlFor="audio-file" className="input-label">
                      Upload Audio File (e.g., .mp3, .wav):
                    </label>
                    <input
                      type="file"
                      id="audio-file"
                      className="file-input"
                      accept="audio/*"
                      onChange={handleAudioFileChange}
                      disabled={urlValidating || contentLoading}
                    />
                    {selectedAudioFile && (
                      <p className="file-name-display">
                        Selected: {selectedAudioFile.name}
                      </p>
                    )}
                  </div>
                )}

                {/* User Guidance Input */}
                <div className="input-container guidance-container">
                  <label htmlFor="user-guidance" className="input-label">
                    Optional: Specific guidance for the AI (e.g., target audience, desired style, key concepts to include/exclude):
                  </label>
                  <textarea
                    id="user-guidance"
                    className="text-input guidance-input" // Can reuse 'text-input' class or define new
                    value={userGuidance}
                    onChange={handleUserGuidanceChange}
                    disabled={urlValidating || contentLoading}
                    placeholder="e.g., Make it suitable for beginners, focus on practical applications..."
                    rows={3}
                  />
                </div>
                
                <div className="button-container">
                  <button
                    onClick={handleSubmit}
                    className="button-primary submit-button"
                    disabled={urlValidating || contentLoading || (paymentStatus === 'cost_calculated' && !userInfo) || paymentStatus === 'invoice_generated' }
                  >
                    {urlValidating
                      ? 'Processing...'
                      : contentLoading
                        ? 'Generating...'
                        : paymentStatus === 'cost_calculated' && !userInfo
                          ? 'Login to Pay'
                          : paymentStatus === 'invoice_generated'
                            ? 'Invoice Generated'
                            : 'Generate App'}
                  </button>
                </div>
              </div>

              {activeInputType === 'youtube' && videoUrl ? (
                <div className="video-container">
                  <iframe
                    className="video-iframe"
                    src={getYoutubeEmbedUrl(videoUrl)}
                    title="YouTube video player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen></iframe>
                </div>
              ) : (
                 (activeInputType === 'youtube') && 
                <div className="video-container">
                    <div className="video-placeholder">YouTube video will appear here</div>
                </div>
              )}
              
              <div className="gallery-container desktop-gallery-container">
                {exampleGallery}
              </div>
            </div>

            <div className="right-side">
              <div className="content-area">
                {showContentContainer ? (
                  <ContentContainer
                    key={reloadCounter}
                    contentBasis={contentBasisForContainer}
                    inputType={inputTypeForGenerationProp as any}
                    userGuidance={userGuidance} 
                    onLoadingStateChange={handleContentLoadingStateChange}
                    onGenerationComplete={handleGenerationComplete}
                    preSeededSpec={(selectedExample && activeInputType === 'youtube' && selectedExample.url === (contentBasisForContainer as Example)?.url) ? selectedExample.spec : undefined}
                    preSeededCode={(selectedExample && activeInputType === 'youtube' && selectedExample.url === (contentBasisForContainer as Example)?.url) ? selectedExample.code : undefined}
                    ref={contentContainerRef}
                    disableDisplay={paymentStatus === 'cost_calculated' || paymentStatus === 'invoice_generated'}
                  />
                ) : (
                  <div className="content-placeholder">
                    <p>
                      {urlValidating ? 'Processing input...' : 
                       (contentLoading && paymentStatus === 'generating') ? 'Generating content...' : 
                       'Select an input type and provide content, or choose an example to begin.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Payment Section UI */}
              {paymentStatus === 'cost_calculated' && currentCost && userInfo && (
                <div className="payment-section">
                  <h3>Confirm & Pay</h3>
                  <p>Total Cost: <strong>{formatSatoshis(currentCost.totalCostSatoshis)}</strong> ({currentCost.totalCostUSD.toFixed(2)} USD)</p>
                  <p>Details: {currentCost.details.totalTokens} tokens. Markup: {(currentCost.details.adminMarkupPercentage * 100).toFixed(0)}%.</p>
                  <button onClick={handleProceedToPay} className="button-primary">
                    Pay with Alby
                  </button>
                </div>
              )}
              {paymentStatus === 'cost_calculated' && currentCost && !userInfo && (
                 <div className="payment-section">
                    <h3>Login to Pay</h3>
                    <p>Total Cost: <strong>{formatSatoshis(currentCost.totalCostSatoshis)}</strong> ({currentCost.totalCostUSD.toFixed(2)} USD)</p>
                    <p>Please log in with Alby to proceed with payment.</p>
                 </div>
              )}
              {paymentStatus === 'invoice_generated' && paymentInvoice && (
                <div className="payment-section">
                  <h3>Pay Invoice</h3>
                  <p>Please pay the following Lightning invoice:</p>
                  <textarea value={paymentInvoice} readOnly rows={5} style={{width: "100%"}} />
                  <p>Amount: <strong>{currentCost?.totalCostSatoshis && formatSatoshis(currentCost.totalCostSatoshis)}</strong></p>
                  <p><em>Note: Actual payment sending and verification are not yet implemented in this demo.</em></p>
                </div>
              )}
              {paymentStatus === 'paid' && (
                <div className="payment-section">
                  <p><strong>Payment successful! Your content is now available.</strong></p>
                </div>
              )}
              {paymentStatus === 'failed' && currentCost === null && ( // Only show general failure if cost calc also failed
                 <div className="payment-section">
                  <p><strong>Content generation or cost calculation failed. Please try again.</strong></p>
                </div>
              )}
               {paymentStatus === 'failed' && currentCost !== null && ( // Specific message if payment part failed
                 <div className="payment-section">
                  <p><strong>Payment failed. Please try again or contact support.</strong></p>
                </div>
              )}


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