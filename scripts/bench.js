/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { extractPdf } = require('..');

const samplePath = process.argv[2] || path.resolve(__dirname, '..', 'test', 'exemplo.pdf');
if (!fs.existsSync(samplePath)) {
  console.error('Arquivo de benchmark não encontrado:', samplePath);
  process.exit(1);
}

const runs = Number(process.argv[3] || 3);

(() => {
  const data = fs.readFileSync(samplePath);

  const bench = (label, fn) => {
    const t0 = performance.now();
    const result = fn();
    const t1 = performance.now();
    console.log(`${label}: ${(t1 - t0).toFixed(2)} ms, pages=${result.pages.length}`);
  };

  console.log('Benchmark extrator-dados-pdf');
  console.log('Arquivo:', samplePath);

  for (let i = 0; i < runs; i++) {
    bench(`Run ${i + 1} (path)`, () => extractPdf(samplePath));
  }
  for (let i = 0; i < runs; i++) {
    bench(`Run ${i + 1} (buffer)`, () => extractPdf(data));
  }
})();
