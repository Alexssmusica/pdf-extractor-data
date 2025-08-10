const { extractPdf } = require('./lib/');
const path = require('path');

const filePath = path.join(__dirname, 'exemplo2.pdf')

async function imprimirDocumento() {
    const result = extractPdf(filePath);
    console.log(result);
}

imprimirDocumento();