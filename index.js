'use strict';

const load = require('node-gyp-build');
const native = load(__dirname);
const fs = require('fs');
const path = require('path');

function normalizeText(text, opts) {
  if (!opts) return text;
  let out = String(text ?? '');
  // Normaliza quebras de linha para \n
  out = out.replace(/\r\n|\r/g, '\n');
  if (opts.newlines !== false) {
    out = out.replace(/\n{2,}/g, '\n');
  }
  if (opts.spaces !== false) {
    out = out.replace(/[ \t\v\f]+/g, ' ');
  }
  if (opts.trim !== false) {
    out = out
      .split('\n')
      .map((line) => line.trim())
      .join('\n')
      .trim();
  }
  return out;
}

/**
 * Extrai dados de um PDF.
 * v1: retorna metadados vazios e sem páginas (placeholder).
 * @param {string} filePath Caminho absoluto/relativo do arquivo PDF
 * @returns {{ metadata: { title: string, author: string, pages: number }, pages: Array<{page: number, text: string}> }}
 */
function extractPdf(input, options = {}) {
  const isPath = typeof input === 'string';
  const isBuffer = Buffer.isBuffer(input);
  if (!isPath && !isBuffer) {
    throw new TypeError('input deve ser uma string (caminho) ou Buffer');
  }
  if (isPath && input.length === 0) {
    throw new TypeError('caminho não pode ser vazio');
  }
  // Pré-validação quando for caminho
  if (isPath) {
    const full = path.resolve(String(input));
    let stats;
    try {
      stats = fs.statSync(full);
    } catch (e) {
      throw new Error('arquivo não encontrado');
    }
    if (!stats.isFile()) {
      throw new Error('caminho não é arquivo');
    }
  }

  const password = typeof options.password === 'string' ? options.password : undefined;
  const pageStart = Number.isInteger(options.pageStart) ? options.pageStart : undefined; // 1-based
  const pageEnd = Number.isInteger(options.pageEnd) ? options.pageEnd : undefined; // 1-based

  const nativeOptions = {};
  if (password) nativeOptions.password = password;
  if (pageStart) nativeOptions.pageStart = pageStart;
  if (pageEnd) nativeOptions.pageEnd = pageEnd;

  const result = Object.keys(nativeOptions).length > 0
    ? native.extractPdf(input, nativeOptions)
    : native.extractPdf(input);

  // Normalização opcional de texto
  const normalizeOpt = options && options.normalize
    ? (options.normalize === true
        ? { spaces: true, newlines: true, trim: true }
        : options.normalize)
    : undefined;
  if (normalizeOpt) {
    result.pages = result.pages.map((p) => ({
      page: p.page,
      text: normalizeText(p.text, normalizeOpt),
    }));
  }

  if (options.return === 'text') {
    const sep = typeof options.separator === 'string' ? options.separator : '\n';
    return result.pages.map(p => p.text).join(sep);
  }

  return result;
}

module.exports = {
  extractPdf,
};


