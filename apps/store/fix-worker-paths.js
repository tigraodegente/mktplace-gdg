import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Ler o arquivo _worker.js
const workerPath = join('.svelte-kit/cloudflare/_worker.js');
let workerContent = readFileSync(workerPath, 'utf-8');

// Corrigir os caminhos relativos
workerContent = workerContent
  .replace('../output/server/index.js', './.svelte-kit/output/server/index.js')
  .replace('../cloudflare-tmp/manifest.js', './.svelte-kit/cloudflare-tmp/manifest.js');

// Escrever o arquivo corrigido
writeFileSync(workerPath, workerContent);

console.log('✅ Caminhos do _worker.js corrigidos com sucesso!'); 