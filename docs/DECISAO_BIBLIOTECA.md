## Decisão da Biblioteca C++ para PDF

### Opções avaliadas
- PDFium (BSD-3-Clause): desempenho alto, extração de texto robusta, multiplataforma, suporte ativo; disponível via vcpkg.
- Poppler (GPL): recursos maduros, porém licença GPL pode ser restritiva para distribuição de binários em NPM sem abrir todo o código derivado.
- MuPDF (AGPL/Comercial): excelente desempenho, mas AGPL impõe obrigações incompatíveis com distribuição fechada; licença comercial é opção paga.
- PoDoFo (LGPL): bom para parsing/edição, extração de texto mais limitada; também disponível via vcpkg.

### Decisão
**Escolhida: PDFium**

Motivos:
- Licença permissiva (BSD-3-Clause), adequada para publicação no NPM.
- Qualidade e performance reconhecidas na extração de texto.
- Ecossistema ativo e builds disponíveis via `vcpkg` (Windows, Linux, macOS).

### Plano técnico (POC de extração de texto)
1. Instalar `vcpkg` e `pdfium`:
   - Windows: `git clone https://github.com/microsoft/vcpkg` e `./vcpkg/bootstrap-vcpkg.bat`
   - `vcpkg integrate install`
   - `vcpkg install pdfium:x64-windows`
2. Ajustar `binding.gyp`/MSBuild para linkar PDFium (usar integração do vcpkg no MSBuild que o node-gyp já utiliza no Windows).
3. Implementar função C++ mínima:
   - Abrir documento com PDFium
   - Iterar páginas e extrair texto simples
   - Retornar JSON com `pages[{ page, text }]` e metadados básicos quando possível

### Riscos e mitigação
- Tamanho e tempo de build do PDFium: usar binários via `vcpkg` e cache local; executar em CI com cache.
- Compatibilidade multiplataforma: validar em Linux/macOS com triplets do `vcpkg` (`x64-linux`, `x64-osx`).


