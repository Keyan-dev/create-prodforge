import { describe, expect, it } from 'vitest';
import { render } from '../../../src/core/render';

describe('render', () => {
  it('interpolates without HTML escaping', () => {
    expect(render('const a = <%= it.value %>;', { value: '"<b>"' })).toBe('const a = "<b>";');
  });

  it("doesn't leave blank lines behind control-flow tags", () => {
    const template = ['<% if (it.on) { %>', 'enabled', '<% } %>', 'end'].join('\n');
    expect(render(template, { on: true })).toBe('enabled\nend');
    expect(render(template, { on: false })).toBe('end');
  });
});
