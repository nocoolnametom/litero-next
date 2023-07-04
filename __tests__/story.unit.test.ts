import { describe, it, expect } from '@jest/globals';
import { Story } from '../src/lib/story';

describe('Story', () => {
    it('should create a story', () => {
        const story = new Story({});
        expect(story).toBeDefined();
        expect(story).toBeInstanceOf(Story);
    });
});
