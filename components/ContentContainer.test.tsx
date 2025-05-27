import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, waitFor, screen} from '@testing-library/react';
import ContentContainer from './ContentContainer'; // Adjust path
import * as textGeneration from '@/lib/textGeneration'; // To mock generateText
import {InputContentType} from '@/lib/types';
import {
  SPEC_FROM_VIDEO_PROMPT,
  SPEC_FROM_TEXT_PROMPT,
  SPEC_FROM_FILENAME_PROMPT,
  SPEC_FROM_PDF_CONTENT_PROMPT,
  SPEC_FROM_WEBLINK_PROMPT,
  SPEC_FROM_WEBCONTENT_PROMPT,
  SPEC_FROM_TOPIC_PROMPT,
  SPEC_ADDENDUM
} from '@/lib/prompts';

// Mock pdfjs-dist
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn().mockReturnValue({
    promise: Promise.resolve({
      numPages: 1,
      getPage: vi.fn().mockResolvedValue({
        getTextContent: vi.fn().mockResolvedValue({
          items: [{ str: 'mock pdf text' }],
        }),
      }),
    }),
  }),
}));


describe('ContentContainer.tsx Spec Generation Logic', () => {
  let generateTextSpy: ReturnType<typeof vi.spyOn>;

  const mockSpecResponse = { spec: 'Mocked spec content' };
  const mockHtmlResponse = '<html><body>Mocked HTML</body></html>';

  beforeEach(() => {
    vi.resetAllMocks();
    generateTextSpy = vi.spyOn(textGeneration, 'generateText');
    // First call for spec, second for code
    generateTextSpy
      .mockResolvedValueOnce(JSON.stringify(mockSpecResponse)) // For spec generation
      .mockResolvedValueOnce(mockHtmlResponse); // For code generation

    // Suppress console.error/warn for expected fallback messages or errors during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderContainer = (contentBasis: InputContentType | string) => {
    return render(
      <ContentContainer
        contentBasis={contentBasis}
        onLoadingStateChange={vi.fn()}
      />
    );
  };

  it('should generate spec for YouTube URL input', async () => {
    const youtubeInput: InputContentType = { type: 'youtube', url: 'https://youtube.com/watch?v=test' };
    renderContainer(youtubeInput);

    await waitFor(() => {
      expect(generateTextSpy).toHaveBeenCalledTimes(2); // Spec + Code
      expect(generateTextSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        prompt: SPEC_FROM_VIDEO_PROMPT,
        videoUrl: youtubeInput.url,
      }));
    });
    // Check if spec is displayed (simplified check)
    expect(screen.getByText(new RegExp(mockSpecResponse.spec))).toBeInTheDocument();
  });

  it('should generate spec for Text input', async () => {
    const textInput: InputContentType = { type: 'text', description: 'A simple text description' };
    renderContainer(textInput);

    await waitFor(() => {
      expect(generateTextSpy).toHaveBeenCalledTimes(2);
      expect(generateTextSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        prompt: SPEC_FROM_TEXT_PROMPT.replace('{text}', textInput.description),
        inputText: textInput.description,
      }));
    });
    expect(screen.getByText(new RegExp(mockSpecResponse.spec))).toBeInTheDocument();
  });

  it('should generate spec for non-PDF File input using filename', async () => {
    const fileInput: InputContentType = {
      type: 'file',
      file: new File(['content'], 'testfile.txt', { type: 'text/plain' }),
      name: 'testfile.txt'
    };
    renderContainer(fileInput);

    await waitFor(() => {
      expect(generateTextSpy).toHaveBeenCalledTimes(2);
      expect(generateTextSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        prompt: SPEC_FROM_FILENAME_PROMPT.replace('{filename}', fileInput.name) + SPEC_ADDENDUM,
        inputText: fileInput.name,
      }));
    });
     expect(screen.getByText(new RegExp(mockSpecResponse.spec))).toBeInTheDocument();
  });

  it('should generate spec for PDF File input using extracted text', async () => {
    const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' });
    const pdfInput: InputContentType = { type: 'file', file: pdfFile, name: 'document.pdf' };
    renderContainer(pdfInput);

    await waitFor(() => {
      expect(generateTextSpy).toHaveBeenCalledTimes(2);
      // The prompt for PDF includes the addendum directly in prompts.ts, so no + SPEC_ADDENDUM here
      expect(generateTextSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        prompt: SPEC_FROM_PDF_CONTENT_PROMPT.replace('{pdfText}', 'mock pdf text\n'),
        inputText: 'mock pdf text\n',
      }));
    });
    expect(screen.getByText(new RegExp(mockSpecResponse.spec))).toBeInTheDocument();
  });

  it('should fall back to filename for PDF if extracted text is too short', async () => {
    // Mock getDocument to return very short text
    vi.mocked(pdfjsLib.getDocument).mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getTextContent: vi.fn().mockResolvedValue({ items: [{ str: 'short' }] }),
        }),
      })
    } as any);

    const pdfFile = new File(['short pdf'], 'short.pdf', { type: 'application/pdf' });
    const pdfInput: InputContentType = { type: 'file', file: pdfFile, name: 'short.pdf' };
    renderContainer(pdfInput);
    
    await waitFor(() => {
        expect(generateTextSpy).toHaveBeenCalledTimes(2);
        expect(generateTextSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
            prompt: SPEC_FROM_FILENAME_PROMPT.replace('{filename}', pdfInput.name) + SPEC_ADDENDUM,
            inputText: pdfInput.name,
        }));
        // Check for the fallback error message being set (ContentContainer sets this via setError)
        // This requires error to be displayed in the component or a way to inspect state.
        // For now, we check the prompt used.
    });
    expect(screen.getByText(new RegExp(mockSpecResponse.spec))).toBeInTheDocument();
  });


  it('should generate spec for Weblink input using fetched content', async () => {
    const webLinkInput: InputContentType = { type: 'weblink', url: 'https://example.com' };
    const mockWebContent = 'This is fetched website content, long enough to be used.';
    
    // Mock global fetch for getTextFromWebsite
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(`<html><body><p>${mockWebContent}</p></body></html>`),
      })
    ) as any;

    renderContainer(webLinkInput);

    await waitFor(() => {
      expect(generateTextSpy).toHaveBeenCalledTimes(2);
      expect(generateTextSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        prompt: SPEC_FROM_WEBCONTENT_PROMPT
          .replace('{webText}', mockWebContent)
          .replace('{sourceUrl}', webLinkInput.url), // SPEC_ADDENDUM is in this prompt
        inputText: mockWebContent,
      }));
    });
    expect(screen.getByText(new RegExp(mockSpecResponse.spec))).toBeInTheDocument();
  });

  it('should fall back to URL for Weblink if fetched content is too short or fetch fails', async () => {
    const webLinkInput: InputContentType = { type: 'weblink', url: 'https://example.com/short' };
    const mockShortWebContent = 'Too short.';

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: () => Promise.resolve(`<html><body><p>${mockShortWebContent}</p></body></html>`),
      })
    ) as any;
    renderContainer(webLinkInput);

    await waitFor(() => {
      expect(generateTextSpy).toHaveBeenCalledTimes(2);
      expect(generateTextSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        prompt: SPEC_FROM_WEBLINK_PROMPT.replace('{url}', webLinkInput.url) + SPEC_ADDENDUM,
        inputText: webLinkInput.url,
      }));
    });
     expect(screen.getByText(new RegExp(mockSpecResponse.spec))).toBeInTheDocument();
     // Check if setError was called to display fallback info
     // This would typically involve checking a UI element that displays the error.
     // Since ContentContainer's setError is internal, we check the prompt.
  });


  it('should generate spec for Topic input', async () => {
    const topicInput: InputContentType = { type: 'topic', topic: 'Quantum Physics' };
    renderContainer(topicInput);

    await waitFor(() => {
      expect(generateTextSpy).toHaveBeenCalledTimes(2);
      expect(generateTextSpy).toHaveBeenNthCalledWith(1, expect.objectContaining({
        prompt: SPEC_FROM_TOPIC_PROMPT.replace('{topic}', topicInput.topic) + SPEC_ADDENDUM,
        inputText: topicInput.topic,
      }));
    });
    expect(screen.getByText(new RegExp(mockSpecResponse.spec))).toBeInTheDocument();
  });

  it('should handle pre-seeded spec and code', async () => {
    const preSeededInput: InputContentType = { type: 'youtube', url: 'https://youtube.com/watch?v=preseed' };
    render(
      <ContentContainer
        contentBasis={preSeededInput}
        preSeededSpec="Pre-seeded Spec"
        preSeededCode="<p>Pre-seeded Code</p>"
        onLoadingStateChange={vi.fn()}
      />
    );

    await waitFor(() => {
      // generateText should NOT be called if pre-seeded content is provided
      expect(generateTextSpy).not.toHaveBeenCalled();
      expect(screen.getByText(/Pre-seeded Spec/)).toBeInTheDocument();
      // Code and Render tabs would show pre-seeded code
    });
  });
});
