import { readFileSync } from 'fs';
import { join } from 'path';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		// Ler o arquivo sw.js do diretório static
		const swPath = join(process.cwd(), 'static', 'sw.js');
		const swContent = readFileSync(swPath, 'utf-8');
		
		return new Response(swContent, {
			headers: {
				'content-type': 'application/javascript',
				'cache-control': 'public, max-age=0, must-revalidate',
				'service-worker-allowed': '/'
			}
		});
	} catch (error) {
		// Se não existir, retornar SW básico
		const basicSW = `
			self.addEventListener('install', () => {
				console.log('Service Worker instalado');
			});
			
			self.addEventListener('fetch', (event) => {
				// Pass-through para development
				event.respondWith(fetch(event.request));
			});
		`;
		
		return new Response(basicSW, {
			headers: {
				'content-type': 'application/javascript',
				'cache-control': 'public, max-age=0, must-revalidate',
				'service-worker-allowed': '/'
			}
		});
	}
}; 