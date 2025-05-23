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
  // Fix: CODE_REGION_CLOSER and CODE_REGION_OPENER are not needed for the new parseHTML
  SPEC_ADDENDUM,
  SPEC_FROM_VIDEO_PROMPT,
} from '@/lib/prompts';
import {generateText} from '@/lib/textGeneration';
import { HarmCategory, HarmBlockThreshold, SafetySetting } from '@google/genai';

interface ContentContainerProps {
  contentBasis: string;
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
  const [iframeKey, setIframeKey] = useState(0);
  const [saveMessage, setSaveMessage] = useState('');
  const [loadingState, setLoadingState] = useState<LoadingState>(
    preSeededSpec && preSeededCode ? 'ready' : 'loading-spec',
  );
  const [error, setError] = useState<string | null>(null);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [editedSpec, setEditedSpec] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0); // 0: Spec, 1: Code, 2: Render

  // Expose methods to the parent component through ref
  useImperativeHandle(ref, () => ({
    getSpec: () => spec,
    getCode: () => code,
  }));

  // Helper function to generate content spec from video
  const generateSpecFromVideo = async (videoUrl: string): Promise<string> => {
    // Fix: Update model name and add responseMimeType for JSON
    const specResponseText = await generateText({
      modelName: 'gemini-2.5-flash-preview-04-17',
      prompt: SPEC_FROM_VIDEO_PROMPT,
      videoUrl: videoUrl,
      responseMimeType: "application/json",
      safetySettings: defaultSafetySettings, // Pass safety settings
    });

    // Fix: Use updated parseJSON to handle potential markdown fences
    const parsedData = parseJSON(specResponseText);
    let generatedSpec = parsedData.spec;

    if (typeof generatedSpec !== 'string') {
      console.error("Parsed spec is not a string:", parsedData);
      throw new Error("The 'spec' field in the JSON response was not a string.");
    }
    
    generatedSpec += SPEC_ADDENDUM;

    return generatedSpec;
  };

  // Helper function to generate code from content spec
  const generateCodeFromSpec = async (spec: string): Promise<string> => {
    // Fix: Update model name
    const codeResponseText = await generateText({
      modelName: 'gemini-2.5-flash-preview-04-17',
      prompt: spec,
      safetySettings: defaultSafetySettings, // Pass safety settings
    });

    // Fix: Use updated parseHTML (no longer needs opener/closer arguments)
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

  // On mount (or when contentBasis changes), generate a content spec and then use that spec to generate code
  useEffect(() => {
    async function generateContent() {
      // If we have pre-seeded content, skip generation
      if (preSeededSpec && preSeededCode) {
        setSpec(preSeededSpec);
        setCode(preSeededCode);
        setLoadingState('ready');
        setActiveTabIndex(2); // If pre-seeded, jump to render tab
        return;
      }

      try {
        // Reset states
        setLoadingState('loading-spec');
        setActiveTabIndex(0); // Start on Spec tab
        setError(null);
        setSpec('');
        setCode('');

        // Generate a content spec based on video content
        const generatedSpec = await generateSpecFromVideo(contentBasis);
        setSpec(generatedSpec);
        setLoadingState('loading-code');
        setActiveTabIndex(1); // Switch to Code tab after spec generation

        // Generate code using the generated content spec
        const generatedCode = await generateCodeFromSpec(generatedSpec);
        setCode(generatedCode);
        setLoadingState('ready');
        setActiveTabIndex(2); // Switch to Render tab after code generation
      } catch (err) {
        console.error(
          'An error occurred while attempting to generate content:',
          err,
        );
        setError(
          err instanceof Error ? err.message : 'An unknown error occurred',
        );
        setLoadingState('error');
        // Stay on current tab or switch to Spec tab if error occurred during spec generation
        if (loadingState === 'loading-spec') {
            setActiveTabIndex(0);
        } else if (loadingState === 'loading-code') {
            setActiveTabIndex(1);
        }
      }
    }

    generateContent();
  }, [contentBasis, preSeededSpec, preSeededCode]);

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
          ? 'Generating content spec from video...'
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
      {!contentBasis.startsWith('http://') &&
      !contentBasis.startsWith('https://') ? (
        <p style={{marginTop: '0.5rem'}}>
          (<strong>NOTE:</strong> URL must begin with http:// or https://)
        </p>
      ) : null}
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