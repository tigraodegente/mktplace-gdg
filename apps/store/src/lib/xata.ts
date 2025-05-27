// Importar e configurar o cliente Xata
import { XataClient } from '../../../../packages/xata-client/src/xata';
import { building } from '$app/environment';

let instance: XataClient | undefined = undefined;

export const getXataClient = () => {
  // Durante o build, retornar um cliente mock
  if (building) {
    return {} as XataClient;
  }

  if (instance) return instance;

  const apiKey = import.meta.env.VITE_XATA_API_KEY || process.env.XATA_API_KEY;
  
  // Se não houver API key, retornar cliente mock (para evitar erro no build)
  if (!apiKey) {
    console.warn('Xata API key not found. Using mock client.');
    return {} as XataClient;
  }

  instance = new XataClient({
    apiKey,
    branch: import.meta.env.VITE_XATA_BRANCH || process.env.XATA_BRANCH || 'main',
  });

  return instance;
}; 