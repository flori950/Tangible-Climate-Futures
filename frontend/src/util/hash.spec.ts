import { hashObj } from './hash';

describe('hashObj', () => {
  it('is deterministic', () => {
    expect(hashObj({ a: 1, b: 'x' })).toBe(hashObj({ a: 1, b: 'x' }));
  });

  it('hashes an object like its JSON string', () => {
    const obj = { title: 'Collection #1', filterSet: [] };
    expect(hashObj(obj)).toBe(hashObj(JSON.stringify(obj)));
  });

  it('returns a non-negative 32-bit integer', () => {
    for (const input of ['', 'a', 'some longer string with unicode äöü', { n: 42 }]) {
      const hash = hashObj(input);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(2 ** 31);
    }
  });

  it('differs for different inputs', () => {
    expect(hashObj('abc')).not.toBe(hashObj('abd'));
    expect(hashObj('')).toBe(0);
  });
});
