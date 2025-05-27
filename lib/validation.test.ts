import {describe, it, expect} from 'vitest';
import {isValidHttpUrl} from './validation';

describe('isValidHttpUrl', () => {
  it('should return true for valid http URLs', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true);
    expect(isValidHttpUrl('http://www.example.com')).toBe(true);
    expect(isValidHttpUrl('http://example.com/path?query=value#hash')).toBe(true);
  });

  it('should return true for valid https URLs', () => {
    expect(isValidHttpUrl('https://example.com')).toBe(true);
    expect(isValidHttpUrl('https://www.example.com')).toBe(true);
    expect(isValidHttpUrl('https://example.com/path?query=value#hash')).toBe(true);
  });

  it('should return false for invalid URLs', () => {
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    expect(isValidHttpUrl('example.com')).toBe(false); // No protocol
    expect(isValidHttpUrl('just a string')).toBe(false);
    expect(isValidHttpUrl('')).toBe(false);
    expect(isValidHttpUrl('http:/example.com')).toBe(false); // Malformed
    expect(isValidHttpUrl('https//example.com')).toBe(false); // Malformed
    expect(isValidHttpUrl('://example.com')).toBe(false); // Missing protocol scheme
  });

  it('should return false for URLs with unsupported protocols', () => {
    expect(isValidHttpUrl('ws://example.com')).toBe(false);
    expect(isValidHttpUrl('mailto:user@example.com')).toBe(false);
    expect(isValidHttpUrl('tel:1234567890')).toBe(false);
  });

  it('should handle URLs with ports', () => {
    expect(isValidHttpUrl('http://example.com:8080')).toBe(true);
    expect(isValidHttpUrl('https://example.com:8443/path')).toBe(true);
  });

  it('should handle localhost URLs', () => {
    expect(isValidHttpUrl('http://localhost')).toBe(true);
    expect(isValidHttpUrl('http://localhost:3000')).toBe(true);
    expect(isValidHttpUrl('https://localhost:3001/test')).toBe(true);
  });
});
