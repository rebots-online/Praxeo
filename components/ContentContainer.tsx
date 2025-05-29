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
import {parseHTML, parseJSON} from '@/lib/parse';
import {
  SPEC_ADDENDUM,
  SPEC_FROM_VIDEO_PROMPT, 
  TEXT_TO_SPEC_PROMPT, 
  AUDIO_TO_SPEC_PROMPT, 
  SPEC_TO_CODE_PROMPT, 
} from '@/lib/prompts'; 
import {
  generateText,
  InputContentType,
  GenerationResult,
} from '@/lib/textGeneration';
import { processInput } from '@/lib/inputProcessor'; // Import processInput
import {HarmCategory, HarmBlockThreshold, SafetySetting, UsageMetadata} from '@google/genai'; 

interface ContentContainerProps {
  contentBasis: string | File | null; 
  inputType: InputContentType;
  userGuidance?: string;
  preSeededSpec?: string;
  preSeededCode?: string;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onGenerationComplete: (result: InternalGenerationResult | null) => void; 
  disableDisplay?: boolean; 
}

type LoadingState = 'idle' | 'loading-spec' | 'loading-code' | 'ready' | 'error';

const defaultSafetySettings: SafetySetting[] = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Define a type for the extended GenerationResult that ContentContainer might pass up, including errors
interface InternalGenerationResult extends GenerationResult {
    error?: string;
    modelName?: string; // To pass model name used, for cost calc
}


export default forwardRef(function ContentContainer(
  {
    contentBasis,
    inputType,
    userGuidance,
    preSeededSpec,
    preSeededCode,
    onLoadingStateChange,
    onGenerationComplete,
    disableDisplay = false,
  }: ContentContainerProps,
  ref,
) {
  const [spec, setSpec] = useState<string>(preSeededSpec || '');
  const [code, setCode] = useState<string>(preSeededCode || '');
  const [iframeKey, setIframeKey] = useState(0);
  const [saveMessage, setSaveMessage] = useState(''); // For code editor saves
  const [loadingState, setLoadingState] = useState<LoadingState>(
    preSeededSpec && preSeededCode ? 'ready' : 'idle',
  );
  const [error, setError] = useState<string | null>(null);
  const [isEditingSpec, setIsEditingSpec] = useState(false);
  const [editedSpec, setEditedSpec] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  
  const modelName = 'gemini-1.5-flash-latest'; // Configurable model

  useImperativeHandle(ref, () => ({
    getSpec: () => spec,
    getCode: () => code,
  }));

  const generateSpec = async (currentContentBasis: string | File, currentInputType: InputContentType, currentModelName: string): Promise<GenerationResult> => {
    let baseInstructionForSpec = '';
    // Ensure prompts exist in lib/prompts.ts or define defaults here
    const currentPrompts = {
        SPEC_FROM_VIDEO_PROMPT: SPEC_FROM_VIDEO_PROMPT || "Generate a detailed specification for a web-based learning application based on the following video content. Output should be JSON with a 'spec' field containing the textual specification.",
        TEXT_TO_SPEC_PROMPT: TEXT_TO_SPEC_PROMPT || "Generate a detailed specification for a web-based learning application based on the following text. Output should be JSON with a 'spec' field containing the textual specification.",
        AUDIO_TO_SPEC_PROMPT: AUDIO_TO_SPEC_PROMPT || "Generate a detailed specification for a web-based learning application based on the transcript/summary of the following audio content. Output should be JSON with a 'spec' field containing the textual specification.",
    };

    switch (currentInputType) {
      case 'youtube_url':
        baseInstructionForSpec = currentPrompts.SPEC_FROM_VIDEO_PROMPT;
        break;
      case 'text_prompt':
      case 'pdf_text': 
        baseInstructionForSpec = currentPrompts.TEXT_TO_SPEC_PROMPT;
        break;
      case 'audio_file':
        baseInstructionForSpec = currentPrompts.AUDIO_TO_SPEC_PROMPT;
        break;
      default:
        console.warn(`Using default spec generation prompt for unknown input type: ${currentInputType}`);
        baseInstructionForSpec = currentPrompts.TEXT_TO_SPEC_PROMPT; // Fallback
    }

    return generateText({
      modelName: currentModelName,
      baseInstruction: baseInstructionForSpec,
      contentBasis: currentContentBasis,
      inputType: currentInputType, 
      userGuidance: userGuidance, 
      responseMimeType: "application/json", 
      safetySettings: defaultSafetySettings,
    });
  };

  const generateCodeFromSpecText = async (currentSpec: string, currentModelName: string): Promise<GenerationResult> => {
    const baseSpecToCodePrompt = SPEC_TO_CODE_PROMPT || "Generate HTML, CSS, and JavaScript code for a web application based on the following specification. The output should be a single HTML file with embedded CSS and JavaScript. Ensure the code is functional and directly renderable in a browser. Output the HTML code block directly.";
    return generateText({
      modelName: currentModelName,
      baseInstruction: baseSpecToCodePrompt, 
      contentBasis: currentSpec, 
      inputType: 'text_prompt', 
      safetySettings: defaultSafetySettings,
    });
  };
  
  useEffect(() => {
    if (onLoadingStateChange) {
      onLoadingStateChange(loadingState === 'loading-spec' || loadingState === 'loading-code');
    }
  }, [loadingState, onLoadingStateChange]);

  useEffect(() => {
    async function performGeneration() {
      if (!contentBasis) {
        setLoadingState('idle');
        setSpec(''); setCode(''); setError(null);
        onGenerationComplete(null); // Notify parent if contentBasis is cleared
        return;
      }

      // Check if contentBasis matches a preSeededSpec's assumed source (e.g., URL)
      // This check is simplified; a more robust check might involve comparing contentBasis to example.url
      const isPreSeeded = preSeededSpec && preSeededCode && 
                          typeof contentBasis === 'string' && 
                          (preSeededSpec.includes(contentBasis) || contentBasis.includes(preSeededSpec)); // Simple check


      if (isPreSeeded) {
        setSpec(preSeededSpec);
        setCode(preSeededCode);
        setLoadingState('ready');
        setActiveTabIndex(disableDisplay ? 0 : 2);
        // For pre-seeded, usageMetadata is unknown or zero.
        onGenerationComplete({ text: preSeededCode, usageMetadata: {promptTokenCount:0, candidatesTokenCount:0, totalTokenCount:0}, modelName: modelName });
        return;
      }

      setLoadingState('loading-spec');
      setActiveTabIndex(0);
      setError(null);
      setSpec(''); setCode('');
      let specGenerationResult: GenerationResult | null = null;
      let codeGenerationResult: GenerationResult | null = null;
      let finalSpecText = '';
      let processedContent: string | File | null = null;
      let inputTypeForSpecGen: InputContentType = inputType; // Default to original inputType

      try {
        // --- Process Input First ---
        let processorInputType: 'pdf' | 'text_file' | 'audio_file' | 'youtube_url' | 'text_prompt' = 'text_prompt';

        if (inputType === 'youtube_url' && typeof contentBasis === 'string') {
          processedContent = contentBasis;
          processorInputType = 'youtube_url';
          inputTypeForSpecGen = 'youtube_url';
        } else if (inputType === 'text_prompt' && typeof contentBasis === 'string') {
          processedContent = contentBasis;
          processorInputType = 'text_prompt';
          inputTypeForSpecGen = 'text_prompt';
        } else if (contentBasis instanceof File) {
          if (inputType === 'pdf_file') { // Assuming App.tsx sends 'pdf_file' for PDFs
            processorInputType = 'pdf';
          } else if (inputType === 'audio_file') {
            processorInputType = 'audio_file';
          } else if (contentBasis.type === 'text/plain' || contentBasis.type === 'text/markdown') {
            processorInputType = 'text_file';
          } else {
            throw new Error(`Unsupported file type for processing: ${contentBasis.type}`);
          }
          processedContent = await processInput(contentBasis, processorInputType);
        } else if (typeof contentBasis === 'string' && inputType === 'pdf_text') { // Should not happen if App.tsx sends File for PDF
            processedContent = contentBasis;
            inputTypeForSpecGen = 'pdf_text'; // Already processed text from PDF
        } else {
          if (typeof contentBasis === 'string') {
            processedContent = contentBasis; // Fallback for other string types
          } else {
            throw new Error('Invalid contentBasis type or unhandled inputType for processing.');
          }
        }
        
        if (processedContent === null) {
          throw new Error('Input processing failed or returned null.');
        }

        // Adjust inputTypeForSpecGen based on the actual content after processing
        if (typeof processedContent === 'string') {
            if (inputType === 'pdf_file') inputTypeForSpecGen = 'pdf_text'; // Original was PDF, now it's text
            else if (inputType !== 'youtube_url') inputTypeForSpecGen = 'text_prompt'; // General text
            // if it was youtube_url, it remains youtube_url
        } else if (processedContent instanceof File && inputType === 'audio_file') {
            inputTypeForSpecGen = 'audio_file'; // Stays as audio_file for generateSpec
        }
        // --- End of Input Processing ---

        specGenerationResult = await generateSpec(processedContent, inputTypeForSpecGen, modelName);
        const parsedSpecData = parseJSON(specGenerationResult.text);
        finalSpecText = parsedSpecData.spec || specGenerationResult.text;
        
        if (typeof finalSpecText !== 'string' || !finalSpecText.trim()) {
          throw new Error("Failed to generate a valid textual specification.");
        }
        finalSpecText += SPEC_ADDENDUM || "\nEnsure the application is interactive and user-friendly.";
        setSpec(finalSpecText);
        setLoadingState('loading-code');
        setActiveTabIndex(1);

        codeGenerationResult = await generateCodeFromSpecText(finalSpecText, modelName);
        const generatedCode = parseHTML(codeGenerationResult.text);
        setCode(generatedCode);
        setLoadingState('ready');
        if (!disableDisplay) setActiveTabIndex(2); else setActiveTabIndex(0);
        
        const combinedUsage: UsageMetadata = { 
            promptTokenCount: (specGenerationResult?.usageMetadata?.promptTokenCount || 0) + (codeGenerationResult?.usageMetadata?.promptTokenCount || 0),
            candidatesTokenCount: (specGenerationResult?.usageMetadata?.candidatesTokenCount || 0) + (codeGenerationResult?.usageMetadata?.candidatesTokenCount || 0),
            totalTokenCount: (specGenerationResult?.usageMetadata?.totalTokenCount || 0) + (codeGenerationResult?.usageMetadata?.totalTokenCount || 0),
        };
        onGenerationComplete({ text: generatedCode, usageMetadata: combinedUsage, modelName: modelName });

      } catch (err: any) {
        console.error('Error during content generation pipeline:', err);
        const errorMessage = err.message || 'An unknown error occurred during generation.';
        setError(errorMessage);
        setLoadingState('error');
        const finalUsage = codeGenerationResult?.usageMetadata || specGenerationResult?.usageMetadata;
        onGenerationComplete({ text: '', usageMetadata: finalUsage, modelName: modelName, error: errorMessage }); // Ensure modelName is passed
      }
    }

    performGeneration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentBasis, inputType, preSeededSpec, preSeededCode, userGuidance, disableDisplay]); // Added disableDisplay to deps

  useEffect(() => {
    if (code && !disableDisplay) {
      setIframeKey((prev) => prev + 1);
    }
  }, [code, disableDisplay]);
  
   useEffect(() => {
    if (disableDisplay && (loadingState === 'ready' || loadingState === 'loading-code' || loadingState === 'loading-spec') ) {
      if(activeTabIndex === 1 || activeTabIndex === 2) setActiveTabIndex(0);
    }
  }, [disableDisplay, loadingState, activeTabIndex]);

  const handleSpecSave = async () => {
    const trimmedEditedSpec = editedSpec.trim();
    if (trimmedEditedSpec === spec) {
      setIsEditingSpec(false); return;
    }
    try {
      setLoadingState('loading-code'); setError(null);
      setSpec(trimmedEditedSpec); setIsEditingSpec(false); setActiveTabIndex(1);

      const codeGenResult = await generateCodeFromSpecText(trimmedEditedSpec, modelName);
      const generatedCode = parseHTML(codeGenResult.text);
      setCode(generatedCode); setLoadingState('ready');
      if (!disableDisplay) setActiveTabIndex(2); else setActiveTabIndex(0);
      onGenerationComplete({ text: generatedCode, usageMetadata: codeGenResult.usageMetadata, modelName: modelName });
    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred while regenerating code.';
      setError(errorMessage); setLoadingState('error');
      onGenerationComplete({ text: '', usageMetadata: undefined, modelName: modelName, error: errorMessage });
    }
  };
  
  const handleCodeChange = (value: string | undefined) => {
    setCode(value || '');
    setSaveMessage('HTML updated. Changes will appear in the Render tab if not disabled.');
  };

  const handleSpecEdit = () => {
    setEditedSpec(spec);
    setIsEditingSpec(true);
  };

  const handleSpecCancel = () => {
    setIsEditingSpec(false);
    setEditedSpec('');
  };

  const renderLoadingSpinner = () => (
    <div style={{ alignItems: 'center', color: '#666', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', marginTop: '-2.5rem' }}>
      <div className="loading-spinner"></div>
      <p style={{ color: 'light-dark(#787878, #f4f4f4)', fontSize: '1.125rem', marginTop: '20px' }}>
        {loadingState === 'loading-spec' ? 'Generating content spec...' : 'Generating code from spec...'}
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div style={{ alignItems: 'center', color: 'var(--color-error)', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', marginTop: '-2.5rem', textAlign: 'center', padding: '1rem' }}>
      <div style={{ fontFamily: 'var(--font-symbols)', fontSize: '5rem' }}>error</div>
      <h3 style={{fontSize: '1.5rem', marginBottom: '0.5rem'}}>Error Generating Content</h3>
      <p>{error || 'Something went wrong'}</p>
    </div>
  );
  
  const renderSpecPanelContent = () => {
    if (loadingState === 'error' && !spec) return renderErrorState(); 
    if (loadingState === 'loading-spec' && !spec) return renderLoadingSpinner();

    if (isEditingSpec) {
      return (
        <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
          <Editor height="calc(100% - 40px)" defaultLanguage="text" value={editedSpec} onChange={(value) => setEditedSpec(value || '')} theme="light" options={{ minimap: {enabled: false}, fontSize: 14, wordWrap: 'on', lineNumbers: 'off' }} />
          <div style={{display: 'flex', gap: '6px', padding: '0.5rem 1rem'}}>
            <button onClick={handleSpecSave} className="button-primary">Save & Regenerate Code</button>
            <button onClick={handleSpecCancel} className="button-secondary">Cancel</button>
          </div>
        </div>
      );
    }
    return (
      <div style={{height: '100%', display: 'flex', flexDirection: 'column'}}>
        <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-technical)', lineHeight: 1.75, flex: 1, overflow: 'auto', padding: '1rem', WebkitMaskImage: 'linear-gradient(to bottom, black 95%, transparent 100%)' }}>
          {spec || (loadingState === 'loading-code' ? "Spec generated, loading code..." : "Spec will appear here...")}
          {loadingState === 'error' && error && <pre style={{color: 'red', marginTop: '1rem'}}>Error details: {error}</pre>}
        </div>
        {spec && loadingState === 'ready' && !disableDisplay && (
          <div style={{padding: '0 1rem 1rem'}}>
            <button style={{display: 'flex', alignItems: 'center', gap: '5px'}} onClick={handleSpecEdit} className="button-primary">Edit Spec <span style={{fontFamily: 'var(--font-symbols)', fontSize: '1.125rem'}}>edit</span></button>
          </div>
        )}
      </div>
    );
  };


  // Main return logic
  if (loadingState === 'idle' && !contentBasis) {
    return <div className="content-placeholder" style={{height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center'}}><p>Select an input type and provide content to start.</p></div>;
  }
  
  if (disableDisplay && (loadingState === 'ready' || (loadingState === 'loading-code' && spec) || (loadingState === 'loading-spec' && !error) )) {
     return (
      <div style={{ padding: '2rem', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px solid light-dark(#000, #fff)', borderRadius: '8px' }}>
        <h3>Content Generation {loadingState === 'ready' ? 'Complete' : 'In Progress'}</h3>
        <p>Please complete payment to view the generated learning app.</p>
        {(loadingState === 'loading-spec' || loadingState === 'loading-code') && !error && (
          <>
            <div className="loading-spinner" style={{marginTop: '1rem'}}></div>
            <p style={{marginTop: '0.5rem'}}>Current stage: {loadingState.replace('loading-', 'Generating ')}</p>
          </>
        )}
         {loadingState === 'ready' && <p style={{color: 'green', marginTop: '1rem'}}>Ready! Awaiting payment.</p>}
         {error && <div style={{color: 'red', marginTop: '1rem'}}>Error: {error}</div>}
      </div>
    );
  }


  return (
    <div style={{ border: '2px solid light-dark(#000, #fff)', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'inherit', minHeight: 'inherit', overflow: 'hidden', position: 'relative' }}>
      <Tabs style={{ bottom: 0, display: 'flex', flexDirection: 'column', height: '100%', left: 0, position: 'absolute', right: 0, top: 0}} selectedIndex={activeTabIndex} onSelect={(index) => { if (isEditingSpec && index !== 0) { setIsEditingSpec(false); setEditedSpec(''); } setActiveTabIndex(index); }}>
        <TabList style={{backgroundColor: 'transparent', display: 'flex', listStyle: 'none', margin: 0, padding: '0 12px'}}>
          <Tab style={{borderTopLeftRadius: '4px', borderTopRightRadius: '4px', cursor: 'pointer', fontSize: '14px', marginRight: '4px', padding: '8px 12px'}} selectedClassName="selected-tab">Spec</Tab>
          <Tab style={{borderTopLeftRadius: '4px', borderTopRightRadius: '4px', cursor: 'pointer', fontSize: '14px', marginRight: '4px', padding: '8px 12px'}} selectedClassName="selected-tab">Code</Tab>
          <Tab style={{borderTopLeftRadius: '4px', borderTopRightRadius: '4px', cursor: 'pointer', fontSize: '14px', marginRight: '4px', padding: '8px 12px'}} selectedClassName="selected-tab">Render</Tab>
        </TabList>

        <div style={{flex: 1, overflow: 'hidden'}}>
          <TabPanel style={{height: '100%', overflow: 'auto', boxSizing: 'border-box'}}>
            {renderSpecPanelContent()}
          </TabPanel>
          <TabPanel style={{height: '100%', padding: '0'}}>
            {loadingState === 'error' ? renderErrorState() : (loadingState !== 'ready' && loadingState !== 'loading-spec' && !code) ? renderLoadingSpinner() : 
             (<div style={{height: '100%', position: 'relative'}}>
                <Editor height="100%" language="html" value={code} onChange={handleCodeChange} theme="vs-dark" options={{ minimap: {enabled: false}, fontSize: 14, wordWrap: 'on', formatOnPaste: true, formatOnType: true }} />
                {saveMessage && (<div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', color: 'white', padding: '5px 10px', borderRadius: '4px', fontSize: '12px' }}>{saveMessage}</div>)}
              </div>)
            }
          </TabPanel>
          <TabPanel style={{height: '100%', padding: '0'}}>
            {loadingState === 'error' ? renderErrorState() : (loadingState !== 'ready') ? renderLoadingSpinner() : 
             (<iframe key={iframeKey} srcDoc={code} style={{border: 'none', width: '100%', height: '100%'}} title="rendered-html" sandbox="allow-scripts" />)
            }
          </TabPanel>
        </div>
      </Tabs>
      <style>{`
        .selected-tab { background: light-dark(#f0f0f0, #fff); color: light-dark(#000, var(--color-background)); font-weight: bold; }
        .react-tabs { width: 100%; } .react-tabs__tab-panel { border-top: 1px solid light-dark(#000, #fff); }
        .loading-spinner { animation: spin 1s ease-in-out infinite; border: 3px solid rgba(0, 0, 0, 0.1); border-radius: 50%; border-top-color: var(--color-accent); height: 60px; width: 60px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
});