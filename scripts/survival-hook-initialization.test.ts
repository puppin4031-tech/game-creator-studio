import { expect, test } from 'bun:test';
import ts from 'typescript';
import { readFileSync } from 'node:fs';

test('codex callbacks are initialized before any dependency array reads them', () => {
  const source = ts.createSourceFile('useSurvivalWorld.ts', readFileSync(new URL('../src/hooks/useSurvivalWorld.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true);
  const names = ['recordCodexResource', 'recordCodexPet', 'recordCodexBoss', 'recordCodexAiInvention'];
  const declarations = new Map<string, number>();
  const reads: { name: string; pos: number }[] = [];
  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.includes(node.name.text)) {
      declarations.set(node.name.text, node.end);
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        if (ts.isIdentifier(element) && names.includes(element.text)) reads.push({ name: element.text, pos: element.pos });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  expect(declarations.size).toBe(4);
  expect(reads.length).toBeGreaterThan(0);
  for (const read of reads) {
    const end = declarations.get(read.name);
    expect(end).toBeDefined();
    expect(end ?? Infinity).toBeLessThan(read.pos);
  }
});