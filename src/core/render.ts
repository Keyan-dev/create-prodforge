import { Eta } from 'eta';

const eta = new Eta({
  // Templates produce source code, not HTML.
  autoEscape: false,
  // No automatic trimming: it would also eat the newline after `<%= %>` at the end of a line.
  // Control-flow lines opt in with `-%>`, which drops the newline that follows the tag.
  autoTrim: false,
  useWith: false,
  varName: 'it',
});

/** Suffix that marks a template file as rendered. Anything else is copied as-is. */
export const TEMPLATE_SUFFIX = '.eta';

/**
 * Render an eta template string. Data is available as `it` (e.g. `<%= it.cfg.name %>`).
 * End control-flow tags with `-%>` (`<% if (it.cfg.docker) { -%>`) so they leave no blank line.
 */
export function render(template: string, data: object): string {
  return eta.renderString(template, data);
}
