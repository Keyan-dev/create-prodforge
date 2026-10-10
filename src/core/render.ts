import { Eta } from 'eta';

const eta = new Eta({
  // Templates produce source code, not HTML.
  autoEscape: false,
  // Strip the newline after a `<% %>` tag so control flow doesn't leave blank lines behind.
  autoTrim: [false, 'nl'],
  useWith: false,
  varName: 'it',
});

/** Suffix that marks a template file as rendered. Anything else is copied as-is. */
export const TEMPLATE_SUFFIX = '.eta';

/** Render an eta template string. Data is available as `it` (e.g. `<%= it.cfg.name %>`). */
export function render(template: string, data: object): string {
  return eta.renderString(template, data);
}
