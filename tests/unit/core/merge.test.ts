import { describe, expect, it } from 'vitest';
import { mergeJson, mergePackageJson, missingEnvLines } from '../../../src/core/merge';

describe('mergeJson', () => {
  it('takes the generator change when you left the value alone', () => {
    expect(mergeJson({ a: 1 }, { a: 1 }, { a: 1, b: 2 })).toEqual({
      value: { a: 1, b: 2 },
      conflicts: [],
    });
  });

  it('keeps your change when the generator left the value alone', () => {
    expect(mergeJson({ a: 1 }, { a: 5 }, { a: 1, b: 2 }).value).toEqual({ a: 5, b: 2 });
  });

  it('keeps yours and reports a conflict when both changed a value', () => {
    expect(mergeJson({ a: 1 }, { a: 5 }, { a: 7 }, 'root')).toEqual({
      value: { a: 5 },
      conflicts: ['root.a'],
    });
  });

  it("doesn't bring back a key you removed", () => {
    expect(mergeJson({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2, c: 3 }).value).toEqual({ a: 1, c: 3 });
  });
});

describe('mergePackageJson', () => {
  it('adds new dependencies in order and keeps your own', () => {
    const base = JSON.stringify({ dependencies: { express: '^5.0.0' } });
    const ours = JSON.stringify({ dependencies: { express: '^5.0.0', zod: '^4.0.0' } });
    const theirs = JSON.stringify({ dependencies: { express: '^5.0.0', ioredis: '^6.0.0' } });
    const { content, conflicts } = mergePackageJson(base, ours, theirs);
    expect(Object.keys(JSON.parse(content).dependencies)).toEqual(['express', 'ioredis', 'zod']);
    expect(conflicts).toEqual([]);
  });
});

describe('missingEnvLines', () => {
  it('lists the variables .env lacks, with their example values', () => {
    expect(missingEnvLines('# c\nA=1\nB=2\nC=3', 'A=9\n  C = x')).toEqual(['B=2']);
  });
});
