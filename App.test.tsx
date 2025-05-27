import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import App from './App'; // Adjust path as necessary
import { DataContext, DataContextType } from './context'; // Adjust path
import * as youtubeUtils from './lib/youtube'; // To mock validateYoutubeUrl

// Mock DataContext
const mockDefaultExample = {
  title: 'Default Example',
  url: 'https://www.youtube.com/watch?v=default',
  spec: 'Default spec',
  code: 'Default code',
};

const mockExamples = [mockDefaultExample];

const mockDataContextValue: DataContextType = {
  defaultExample: mockDefaultExample,
  examples: mockExamples,
  loading: false,
  error: null,
};

// Mock window.alert
global.alert = vi.fn();

describe('App.tsx Input Validation in handleSubmit', () => {
  let validateYoutubeUrlSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(()_ => {
    // Reset mocks before each test
    vi.resetAllMocks();
    validateYoutubeUrlSpy = vi.spyOn(youtubeUtils, 'validateYoutubeUrl');
    // Mock console.error to avoid clutter during tests for expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderApp = () => {
    return render(
      <DataContext.Provider value={mockDataContextValue}>
        <App />
      </DataContext.Provider>
    );
  };

  // Helper to get the submit button
  const getSubmitButton = () => screen.getByRole('button', { name: /generate app/i });

  // --- YouTube URL Tests ---
  describe('YouTube URL Input', () => {
    it('should show error if YouTube URL is empty', async () => {
      renderApp();
      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...');
      fireEvent.change(input, { target: { value: ' ' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('YouTube URL is required.');
      });
    });

    it('should show error for invalid YouTube URL format', async () => {
      validateYoutubeUrlSpy.mockResolvedValue({ isValid: false, error: 'Invalid YouTube URL format from mock' });
      renderApp();
      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...');
      fireEvent.change(input, { target: { value: 'invalid-youtube-url' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Invalid YouTube URL format from mock');
      });
    });

    it('should proceed with valid YouTube URL', async () => {
      validateYoutubeUrlSpy.mockResolvedValue({ isValid: true });
      renderApp();
      const input = screen.getByPlaceholderText('https://www.youtube.com/watch?v=...');
      fireEvent.change(input, { target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).not.toHaveBeenCalled();
        // Further assertions could check if setCurrentContentInput was called correctly
        // This requires more complex state spying or context mocking, beyond simple validation checks.
      });
    });
  });

  // --- Text Description Tests ---
  describe('Text Description Input', () => {
    beforeEach(async () => {
      renderApp();
      // Switch to Text Description Tab
      const textTab = screen.getByRole('tab', { name: /text description/i });
      fireEvent.click(textTab);
      await waitFor(() => expect(screen.getByPlaceholderText('Describe the content you want to learn about...')).toBeInTheDocument());
    });

    it('should show error if text description is empty', async () => {
      const textInput = screen.getByPlaceholderText('Describe the content you want to learn about...');
      fireEvent.change(textInput, { target: { value: ' ' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Text description cannot be empty.');
      });
    });

    it('should proceed with valid text description', async () => {
      const textInput = screen.getByPlaceholderText('Describe the content you want to learn about...');
      fireEvent.change(textInput, { target: { value: 'This is a valid description.' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).not.toHaveBeenCalled();
      });
    });
  });

  // --- File Upload Tests ---
  describe('File Upload Input', () => {
     beforeEach(async () => {
      renderApp();
      const fileTab = screen.getByRole('tab', { name: /upload file/i });
      fireEvent.click(fileTab);
      await waitFor(() => expect(screen.getByLabelText(/upload a file/i)).toBeInTheDocument());
    });

    it('should show error if no file is selected', async () => {
      // File input is tricky to test directly with fireEvent.change for "empty"
      // We rely on the internal state `fileInputValue` being null initially
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('A file must be selected.');
      });
    });

    it('should proceed when a file is selected', async () => {
      const fileInput = screen.getByLabelText(/upload a file/i) as HTMLInputElement;
      const dummyFile = new File(['dummy content'], 'example.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [dummyFile] } });
      
      // Wait for the file state to update (if App.tsx has async operations on file change)
      await waitFor(() => {
        // Check if the file name is reflected or some other UI change indicates file selection
        // This depends on how App.tsx handles file selection display
      });

      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).not.toHaveBeenCalled();
      });
    });
  });

  // --- Website Link Tests ---
  describe('Website Link Input', () => {
    beforeEach(async () => {
      renderApp();
      const webLinkTab = screen.getByRole('tab', { name: /website link/i });
      fireEvent.click(webLinkTab);
      await waitFor(() => expect(screen.getByPlaceholderText('https://www.example.com')).toBeInTheDocument());
    });

    it('should show error if website link is empty', async () => {
      const webLinkInput = screen.getByPlaceholderText('https://www.example.com');
      fireEvent.change(webLinkInput, { target: { value: ' ' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Website link cannot be empty.');
      });
    });

    it('should show error for invalid website URL format', async () => {
      const webLinkInput = screen.getByPlaceholderText('https://www.example.com');
      fireEvent.change(webLinkInput, { target: { value: 'invalid-url' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Invalid website URL format. Must start with http:// or https://.');
      });
    });
    
    it('should proceed with valid website link', async () => {
      const webLinkInput = screen.getByPlaceholderText('https://www.example.com');
      fireEvent.change(webLinkInput, { target: { value: 'https://example.com' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).not.toHaveBeenCalled();
      });
    });
  });

  // --- Topic Tests ---
  describe('Topic Input', () => {
    beforeEach(async () => {
      renderApp();
      const topicTab = screen.getByRole('tab', { name: /topic/i });
      fireEvent.click(topicTab);
      await waitFor(() => expect(screen.getByPlaceholderText('e.g., Quantum Physics, Machine Learning basics')).toBeInTheDocument());
    });

    it('should show error if topic is empty', async () => {
      const topicInput = screen.getByPlaceholderText('e.g., Quantum Physics, Machine Learning basics');
      fireEvent.change(topicInput, { target: { value: ' ' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Topic cannot be empty.');
      });
    });

    it('should proceed with valid topic', async () => {
      const topicInput = screen.getByPlaceholderText('e.g., Quantum Physics, Machine Learning basics');
      fireEvent.change(topicInput, { target: { value: 'Valid Topic' } });
      fireEvent.click(getSubmitButton());
      await waitFor(() => {
        expect(global.alert).not.toHaveBeenCalled();
      });
    });
  });
});
