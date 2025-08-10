## extrator-dados-pdf

Addon nativo Node.js (C++/N-API) para extrair texto e metadados básicos de PDFs usando PDFium.

### Requisitos
- Node.js 18+ (recomendado 20+)
- Python 3 (node-gyp)
- Ferramentas de build C++
  - Windows: Visual Studio Build Tools 2022 (C++), MSVC x64
  - Linux/macOS: Clang/GCC e CMake (a validar)

Observação: este repositório inclui binários do PDFium para Windows x64 em `pdfium/lib/win/x64`. A DLL (`pdfium.dll`) é copiada automaticamente para a pasta de saída durante o build.

### Instalação e build (local)
```bash
npm install
npm run build
```
Se alterar os fontes nativos, rode:
```bash
npm run rebuild
```

### Build no Windows
1. Instale o Visual Studio Build Tools 2022 (com workload de C++ / MSVC x64) e Python 3.
2. Os binários do PDFium para Windows x64 já estão neste repositório em `pdfium/lib/win/x64`.
3. Rode:
   ```powershell
   npm install
   npm run build
   ```
   A `pdfium.dll` será copiada automaticamente para a pasta de saída do addon.

### Build no Linux
1. Instale as ferramentas de build:
   ```bash
   sudo apt-get update
   sudo apt-get install -y build-essential python3 make g++ cmake
   ```
   (Em outras distros, instale os equivalentes; `iconv` geralmente faz parte da glibc.)
2. Coloque o `libpdfium.so` correspondente na árvore do projeto:
   - x64: `pdfium/lib/linux/x64/lib/libpdfium.so`
   - arm64: `pdfium/lib/linux/arm64/lib/libpdfium.so`
3. Rode:
   ```bash
   npm install
   npm run build
   ```
   O build copia o `libpdfium.so` para a pasta de saída e define `rpath` para carregá-lo em runtime.

### Suporte de plataforma (atual)
- Windows x64: suportado
- Linux/macOS: em planejamento

### Uso básico
```js
const { extractPdf } = require('extrator-dados-pdf'); // ou require('./') durante o desenvolvimento

const filePath = 'test/exemplo.pdf';

// Extração básica
const result = extractPdf(filePath);
console.log(result.metadata); // { title, author, pages }
console.log(result.pages[0].text); // texto da primeira página

// PDF com senha
const secured = extractPdf(filePath, { password: 'minha-senha' });
```
Retorno:
```ts
{
  metadata: {
    title: string,
    author: string,
    pages: number
  },
  pages: Array<{ page: number, text: string }>
}
```

### Testes
Coloque um PDF de exemplo em `test/exemplo.pdf` e rode:
```bash
npm test
```

### Estrutura
- `index.js`: API JavaScript (carrega o addon nativo)
- `src/addon.cc`: implementação C++ com PDFium
- `binding.gyp`: configuração de build (link + cópia da DLL no Windows)
- `pdfium/`: binários pré-compilados do PDFium (Windows x64) e libs
- `test/`: testes de unidade/integração

### Erros comuns
- Falha ao abrir PDF: arquivo inexistente, corrompido ou senha incorreta
- Dependências de build ausentes: confira Requisitos

### Licença
Usa PDFium (BSD-3-Clause). Verifique compatibilidade conforme seu caso.
