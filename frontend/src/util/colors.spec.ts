import { colors } from './colors';

describe('colors', () => {
  it('only contains 6-digit hex colors', () => {
    for (const color of colors) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('provides enough colors for many collections', () => {
    expect(colors.length).toBeGreaterThanOrEqual(50);
  });
});
