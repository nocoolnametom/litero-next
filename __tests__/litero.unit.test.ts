import { describe, it, expect } from '@jest/globals';
import { Litero } from '../src/lib/litero';

describe('Litero', () => {
    it('should create a Litero instance', () => {
        const litero = new Litero();
        expect(litero).toBeDefined();
        expect(litero).toBeInstanceOf(Litero);
    });
});
