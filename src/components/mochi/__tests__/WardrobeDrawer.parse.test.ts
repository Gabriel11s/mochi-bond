import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Transpiler } from "bun";

/**
 * Reproducible parser test for WardrobeDrawer.
 *
 * Background: a previous edit left the header/tabs JSX with mismatched
 * indentation that fooled humans into miscounting open/close tags, and
 * esbuild eventually rejected the file with:
 *   "Unexpected closing 'div' tag does not match opening 'motion.div' tag"
 *
 * This test guards against regressions by:
 *   1. Transpiling the real source file with bun's TS+JSX parser.
 *   2. Checking that every opening JSX tag inside the header/tabs region
 *      has a matching closing tag (motion.div, div, button counts balance).
 */

const SRC = join(process.cwd(), "src/components/mochi/WardrobeDrawer.tsx");

function readSource(): string {
  return readFileSync(SRC, "utf8");
}

describe("WardrobeDrawer parser invariants", () => {
  it("transpiles without syntax errors", () => {
    const code = readSource();
    const t = new Transpiler({ loader: "tsx" });
    expect(() => t.scan(code)).not.toThrow();
    expect(() => t.transformSync(code)).not.toThrow();
  });

  it("has balanced motion.div / div / button tags", () => {
    const code = readSource();

    // strip comments + strings so we don't count tags inside them
    const stripped = code
      .replace(/\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/`(?:\\.|[^`\\])*`/g, "``")
      .replace(/"(?:\\.|[^"\\])*"/g, '""')
      .replace(/'(?:\\.|[^'\\])*'/g, "''");

    const count = (re: RegExp) => (stripped.match(re) ?? []).length;

    const motionOpen = count(/<motion\.div\b/g);
    const motionClose = count(/<\/motion\.div>/g);
    expect(motionOpen).toBe(motionClose);

    // self-closing divs are rare; treat <div .../> separately
    const divOpen = count(/<div\b(?![^>]*\/>)/g);
    const divClose = count(/<\/div>/g);
    expect(divOpen).toBe(divClose);

    const buttonOpen = count(/<button\b(?![^>]*\/>)/g);
    const buttonClose = count(/<\/button>/g);
    expect(buttonOpen).toBe(buttonClose);
  });

  it("keeps the header preview wrapper inside the drawer (no stray fragment children)", () => {
    const code = readSource();
    // The drawer's motion.div must contain the "Guarda-roupa" header text.
    const drawerBlock = code.match(
      /<motion\.div[\s\S]*?Guarda-roupa[\s\S]*?<\/motion\.div>/,
    );
    expect(drawerBlock).not.toBeNull();
  });
});
