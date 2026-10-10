import { describe, expect, it } from 'vitest';
import { render } from '../../../src/core/render';

describe('render', () => {
  it('interpolates without HTML escaping', () => {
    expect(render('const a = <%= it.value %>;', { value: '"<b>"' })).toBe('const a = "<b>";');
  });

  it('keeps the newline after a value at the end of a line', () => {
    expect(render('// <%= it.name %>\n// @slot:imports\n', { name: 'my-api' })).toBe(
      '// my-api\n// @slot:imports\n',
    );
  });

  it("doesn't leave blank lines behind control-flow tags closed with -%>", () => {
    const template = ['<% if (it.on) { -%>', 'enabled', '<% } -%>', 'end'].join('\n');
    expect(render(template, { on: true })).toBe('enabled\nend');
    expect(render(template, { on: false })).toBe('end');
  });
});
