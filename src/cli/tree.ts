/** Draw file paths as an indented tree, directories first, like `tree`. */
export function formatTree(paths: string[]): string {
  interface Node {
    dirs: Map<string, Node>;
    files: string[];
  }
  const root: Node = { dirs: new Map(), files: [] };
  for (const path of paths) {
    const parts = path.split('/');
    const file = parts.pop() as string;
    let node = root;
    for (const part of parts) {
      let child = node.dirs.get(part);
      if (!child) {
        child = { dirs: new Map(), files: [] };
        node.dirs.set(part, child);
      }
      node = child;
    }
    node.files.push(file);
  }

  const lines: string[] = [];
  const walk = (node: Node, prefix: string) => {
    const entries = [
      ...[...node.dirs.keys()]
        .sort()
        .map((name) => ({ name: `${name}/`, dir: node.dirs.get(name) })),
      ...node.files.sort().map((name) => ({ name, dir: undefined })),
    ];
    entries.forEach(({ name, dir }, index) => {
      const last = index === entries.length - 1;
      lines.push(`${prefix}${last ? '└─ ' : '├─ '}${name}`);
      if (dir) walk(dir, `${prefix}${last ? '   ' : '│  '}`);
    });
  };
  walk(root, '');
  return lines.join('\n');
}
