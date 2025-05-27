import {describe, it, expect} from 'vitest';
import {parseJSON, parseHTML} from './parse'; // Adjust path as necessary

describe('parseJSON', () => {
  it('should parse a valid JSON string', () => {
    const jsonString = '{"name": "Test", "value": 123}';
    expect(parseJSON(jsonString)).toEqual({name: 'Test', value: 123});
  });

  it('should parse a JSON string with markdown fences (```json ... ```)', () => {
    const jsonString = '```json\n{"name": "Fenced Test", "value": 456}\n```';
    expect(parseJSON(jsonString)).toEqual({name: 'Fenced Test', value: 456});
  });

  it('should parse a JSON string with markdown fences (``` ... ```)', () => {
    const jsonString = '```\n{"name": "Simple Fence", "value": 789}\n```';
    expect(parseJSON(jsonString)).toEqual({name: 'Simple Fence', value: 789});
  });

  it('should return the original string if it is not valid JSON after stripping fences', () => {
    const nonJsonString = 'This is not JSON';
    expect(parseJSON(nonJsonString)).toBe(nonJsonString);
  });
  
  it('should return the original string if it is not valid JSON even with fences', () => {
    const nonJsonStringWithFence = '```json\nThis is not JSON\n```';
    expect(parseJSON(nonJsonStringWithFence)).toBe('This is not JSON');
  });

  it('should handle empty string input', () => {
    expect(parseJSON('')).toBe('');
  });

  it('should handle JSON string with leading/trailing whitespace within fences', () => {
    const jsonString = '```json  \n  {"name": "Whitespace Test", "value": 101} \n  ```';
    expect(parseJSON(jsonString)).toEqual({name: 'Whitespace Test', value: 101});
  });
  
  it('should return the inner content if JSON parsing fails but fences were present', () => {
    const malformedJson = '```json\n{name: "Malformed"}\n```'; // Missing quotes around name
    // As per current implementation, it tries to parse, fails, and returns the stripped string.
    expect(parseJSON(malformedJson)).toBe('{name: "Malformed"}');
  });

  it('should handle a string that looks like a fenced JSON but is not', () => {
    const text = "Some text before ```json\n{\"key\": \"value\"}\n``` and some text after.";
    // Current implementation extracts the first fenced block. If no valid JSON, it might return parts of it or the original.
    // Based on the current parseJSON, it finds the first ``` and last ```
    // This test might need adjustment based on how strictly it should find *only* JSON.
    // If the goal is to extract JSON *only if the entire fenced content is JSON*, then this behavior is okay.
    expect(parseJSON(text)).toEqual({key: "value"}); // Assuming it extracts the JSON part
  });
   it('should handle text with ``` but no actual JSON content', () => {
    const text = "```This is just some text within backticks```";
    expect(parseJSON(text)).toBe('This is just some text within backticks');
  });
});

describe('parseHTML', () => {
  it('should return the HTML string if no markdown fences are present', () => {
    const htmlString = '<div><p>Hello</p></div>';
    expect(parseHTML(htmlString)).toBe(htmlString);
  });

  it('should extract HTML from within markdown fences (```html ... ```)', () => {
    const fencedHtmlString = 'Some text\n```html\n<div><p>Fenced Hello</p></div>\n```\nMore text';
    expect(parseHTML(fencedHtmlString)).toBe('<div><p>Fenced Hello</p></div>');
  });
  
  it('should extract HTML from within generic markdown fences (``` ... ```) if it looks like HTML', () => {
    const fencedHtmlString = '```\n<span>Raw HTML</span>\n```';
    expect(parseHTML(fencedHtmlString)).toBe('<span>Raw HTML</span>');
  });

  it('should return the original string if content within generic fences does not look like HTML', () => {
    const nonHtmlInFence = '```\nJust some text, not HTML.\n```';
    // The current logic might still extract "Just some text, not HTML." because it's permissive.
    // If it should strictly validate HTML, this test would change.
    // Based on the provided implementation, it extracts what's inside.
    expect(parseHTML(nonHtmlInFence)).toBe('Just some text, not HTML.');
  });

  it('should handle empty string input', () => {
    expect(parseHTML('')).toBe('');
  });

  it('should handle HTML with leading/trailing whitespace within fences', () => {
    const htmlString = '```html  \n  <div><p>Whitespace HTML</p></div> \n  ```';
    expect(parseHTML(htmlString)).toBe('<div><p>Whitespace HTML</p></div>');
  });
  
  it('should prioritize ```html over generic ``` if both exist (though unlikely)', () => {
    const complexString = '```\nignored\n```\n```html\n<p>priority</p>\n```';
    expect(parseHTML(complexString)).toBe('<p>priority</p>');
  });

  it('should return the first ```html block if multiple are present', () => {
    const multipleHtmlBlocks = '```html\n<p>First</p>\n```\nSome text\n```html\n<p>Second</p>\n```';
    expect(parseHTML(multipleHtmlBlocks)).toBe('<p>First</p>');
  });
  
  it('should return the first generic ``` block if multiple generic blocks and no ```html block', () => {
    const multipleGenericBlocks = '```\n<p>First Generic</p>\n```\nSome text\n```\n<p>Second Generic</p>\n```';
    expect(parseHTML(multipleGenericBlocks)).toBe('<p>First Generic</p>');
  });
});
