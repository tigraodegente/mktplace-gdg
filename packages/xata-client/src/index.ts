// Cliente Xata gerado automaticamente
import { XataClient } from './xata';

// Criar instância do cliente
export const getXataClient = () => {
  if (!process.env.XATA_API_KEY) {
    throw new Error('XATA_API_KEY não está definida');
  }
  
  return new XataClient({
    apiKey: process.env.XATA_API_KEY,
    branch: process.env.XATA_BRANCH || 'main',
  });
};

// Exportar tipos
export * from './xata';
export * from './types';
export * from './helpers';

// Cliente singleton para uso direto
let xataClientInstance: XataClient | null = null;

export const xata = () => {
  if (!xataClientInstance) {
    xataClientInstance = getXataClient();
  }
  return xataClientInstance;
};
