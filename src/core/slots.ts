/**
 * Named injection slots. A base template marks a spot with a comment line such as
 * `// @slot:middleware`, `# @slot:services` (YAML, Dockerfile) or `<!-- @slot:docs -->`
 * (Markdown). Features push code into the slot by name, so a feature never needs to know which
 * framework file it is editing.
 */
const SLOT_LINE =
  /^([ \t]*)(?:(?:\/\/|#)[ \t]*@slot:([\w-]+)|<!--[ \t]*@slot:([\w-]+)[ \t]*-->)[ \t]*$/;

function slotName(match: RegExpExecArray): string | undefined {
  return match[2] ?? match[3];
}

export interface Injection {
  path: string;
  slot: string;
  code: string;
}

/** Names of every slot marker in `content`, in order. */
export function findSlots(content: string): string[] {
  return content.split('\n').flatMap((line) => {
    const match = SLOT_LINE.exec(line);
    const slot = match && slotName(match);
    return slot ? [slot] : [];
  });
}

/**
 * Insert each injection's code where its slot marker sits, indented to match the marker, in the
 * order the injections were made. Every marker line is then removed, so a slot nobody fills
 * leaves no trace. Throws if an injection names a slot the file doesn't have.
 */
export function applySlots(path: string, content: string, injections: Injection[]): string {
  const available = new Set(findSlots(content));
  for (const { slot } of injections) {
    if (!available.has(slot)) {
      throw new Error(
        `No slot "@slot:${slot}" in ${path} (has: ${[...available].join(', ') || 'none'})`,
      );
    }
  }

  return content
    .split('\n')
    .flatMap((line) => {
      const match = SLOT_LINE.exec(line);
      if (!match) return [line];
      const indent = match[1] ?? '';
      const slot = slotName(match);
      return injections
        .filter((injection) => injection.slot === slot)
        .flatMap(({ code }) =>
          code
            .replace(/\n$/, '')
            .split('\n')
            .map((codeLine) => (codeLine ? indent + codeLine : codeLine)),
        );
    })
    .join('\n');
}
