import { describe, it, expect } from 'vitest';
import {
  extractJSONFromText,
  parseJSONFromText,
} from '@/app/utils/json-extractor';

describe('json-extractor utilities', () => {
  describe('extractJSONFromText', () => {
    it('should extract JSON from code block', () => {
      const text = 'Some text before\n```json\n{"key": "value"}\n```\nSome text after';
      const result = extractJSONFromText(text);
      expect(result).toBe('{"key": "value"}');
    });

    it('should extract JSON from code block without json label', () => {
      const text = '```\n{"key": "value"}\n```';
      const result = extractJSONFromText(text);
      expect(result).toBe('{"key": "value"}');
    });

    it('should extract JSON object from text', () => {
      const text = 'Before text {"key": "value", "number": 123} after text';
      const result = extractJSONFromText(text);
      expect(result).toBe('{"key": "value", "number": 123}');
    });

    it('should extract JSON array from text', () => {
      const text = 'Before [1, 2, 3] after';
      const result = extractJSONFromText(text);
      expect(result).toBe('[1, 2, 3]');
    });

    it('should extract nested JSON', () => {
      const text = 'Text {"nested": {"key": "value"}} more text';
      const result = extractJSONFromText(text);
      expect(result).toBe('{"nested": {"key": "value"}}');
    });

    it('should return null for invalid JSON', () => {
      const text = 'Text {invalid json} more text';
      const result = extractJSONFromText(text);
      expect(result).toBeNull();
    });

    it('should return null for empty text', () => {
      expect(extractJSONFromText('')).toBeNull();
    });

    it('should return null for text without JSON', () => {
      expect(extractJSONFromText('Just plain text')).toBeNull();
    });
  });

  describe('parseJSONFromText', () => {
    it('should parse JSON from code block', () => {
      const text = '```json\n{"key": "value"}\n```';
      const result = parseJSONFromText<{ key: string }>(text);
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON object from text', () => {
      const text = 'Before {"key": "value"} after';
      const result = parseJSONFromText<{ key: string }>(text);
      expect(result).toEqual({ key: 'value' });
    });

    it('should parse JSON array from text', () => {
      const text = 'Before [1, 2, 3] after';
      const result = parseJSONFromText<number[]>(text);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should return null for invalid JSON', () => {
      const text = 'Invalid {json}';
      const result = parseJSONFromText(text);
      expect(result).toBeNull();
    });

    it('should return null for empty text', () => {
      expect(parseJSONFromText('')).toBeNull();
    });

    it('should parse complex nested JSON', () => {
      const text = '```json\n{"user": {"name": "John", "age": 30, "skills": ["JS", "TS"]}}\n```';
      const result = parseJSONFromText(text);
      expect(result).toEqual({
        user: {
          name: 'John',
          age: 30,
          skills: ['JS', 'TS'],
        },
      });
    });
  });
});



