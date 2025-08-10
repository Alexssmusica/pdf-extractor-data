const { execSync } = require('child_process');
const dotEnv = require('dotenv');
const { commands } = require('./commands');

dotEnv.config({
    path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
});

try {
    if (!process.env.GH_TOKEN) {
        throw new Error('GH_TOKEN não encontrado no arquivo .env');
    }
    console.log('Iniciando processo de prebuild...');
    const commandList = Object.values(commands)
    for (const command of commandList) {
        execSync(command, {
            stdio: 'inherit'
        });
    }
    console.log('Prebuild concluído com sucesso!');
} catch (error) {
    console.error('Erro durante o processo de prebuild:', error.message);
    process.exit(1);
} 