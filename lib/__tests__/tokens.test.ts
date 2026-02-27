import { tokens } from '../tokens';

describe('tokens', () => {
  describe('colors', () => {
    it('light and dark schemes have identical keys', () => {
      const lightKeys = Object.keys(tokens.colors.light).sort();
      const darkKeys = Object.keys(tokens.colors.dark).sort();
      expect(lightKeys).toEqual(darkKeys);
    });

    it('primary is green in both schemes', () => {
      expect(tokens.colors.light.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(tokens.colors.dark.primary).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('destructive color is defined', () => {
      expect(tokens.colors.light.destructive).toBeDefined();
      expect(tokens.colors.dark.destructive).toBeDefined();
    });
  });

  describe('spacing', () => {
    it('all spacing values are positive numbers', () => {
      Object.values(tokens.spacing).forEach((v) => {
        expect(typeof v).toBe('number');
        expect(v).toBeGreaterThan(0);
      });
    });
  });

  describe('typography', () => {
    it('all variants have fontSize, fontWeight, lineHeight', () => {
      Object.entries(tokens.typography).forEach(([, v]) => {
        expect(v.fontSize).toBeGreaterThan(0);
        expect(v.fontWeight).toBeDefined();
        expect(v.lineHeight).toBeGreaterThan(0);
      });
    });

    it('h1 fontSize > body fontSize', () => {
      expect(tokens.typography.h1.fontSize).toBeGreaterThan(tokens.typography.body.fontSize);
    });
  });

  describe('radius', () => {
    it('full is 9999', () => {
      expect(tokens.radius.full).toBe(9999);
    });
    it('sm < md < lg < xl', () => {
      expect(tokens.radius.sm).toBeLessThan(tokens.radius.md);
      expect(tokens.radius.md).toBeLessThan(tokens.radius.lg);
      expect(tokens.radius.lg).toBeLessThan(tokens.radius.xl);
    });
  });
});
