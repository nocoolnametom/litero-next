import { describe, it, expect } from '@jest/globals';
import { Story, Litero } from '../src/lib/litero';

describe('Story', () => {
    it('should create a story', () => {
        const story = new Story({});
        expect(story).toBeDefined();
        expect(story).toBeInstanceOf(Story);
    });
});

describe('Litero', () => {
    it('should create a Litero instance', () => {
        const litero = new Litero();
        expect(litero).toBeDefined();
        expect(litero).toBeInstanceOf(Litero);
    });
});
