import { describe, it, expect } from '@jest/globals';
import { Story } from '../src/lib/story';
import { Series } from '../src/lib/series';

describe('Series', () => {
    it('should create a series', () => {
        const story = new Story({});
        const series = new Series(story);
        expect(series).toBeDefined();
        expect(series).toBeInstanceOf(Series);
    });
});
