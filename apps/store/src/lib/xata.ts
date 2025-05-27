// Importar e configurar o cliente Xata
import { XataClient } from '../../../../packages/xata-client/src/xata';

let instance: XataClient | undefined = undefined;

export const getXataClient = () => {
  if (instance) return instance;

  instance = new XataClient({
    apiKey: import.meta.env.VITE_XATA_API_KEY || process.env.XATA_API_KEY,
    branch: import.meta.env.VITE_XATA_BRANCH || process.env.XATA_BRANCH || 'main',
  });

  return instance;
}; 