const { extractPdf } = require('..');
const fs = require('fs');
const path = require('path');

describe('extractPdf', () => {
  test('deve lançar se input não for string ou Buffer', () => {
    expect(() => extractPdf()).toThrow();
    expect(() => extractPdf(123)).toThrow();
    expect(() => extractPdf({})).toThrow();
  });
});

describe('extractPdf (PDF real quando disponível)', () => {
  
  const samplePath = path.resolve(__dirname, '..', 'exemplo.pdf');

  const hasSample = fs.existsSync(samplePath);

  (hasSample ? test : test.skip)('extrai texto e páginas de test/exemplo.pdf (path)', () => {
    const result = extractPdf(samplePath, { pageStart: 1, pageEnd: 1 });
    expect(result).toHaveProperty('pages');
    expect(Array.isArray(result.pages)).toBe(true);
    expect(result.pages.length).toBeGreaterThan(0);
    const first = result.pages[0];
    expect(first).toHaveProperty('page');
    expect(first).toHaveProperty('text');
    expect(typeof first.text).toBe('string');
  });

  (hasSample ? test : test.skip)('extrai texto a partir de Buffer', () => {
    const data = fs.readFileSync(samplePath);
    const result = extractPdf(data, { pageStart: 1, pageEnd: 1 });
    expect(result).toHaveProperty('pages');
    expect(Array.isArray(result.pages)).toBe(true);
    expect(result.pages.length).toBeGreaterThan(0);
  });
});


