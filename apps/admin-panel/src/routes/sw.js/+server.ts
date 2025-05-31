import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	// Service Worker vazio para admin-panel (não precisa de PWA)
	const basicSW = `
		// Admin Panel Service Worker (minimal)
		self.addEventListener('install', () => {
			console.log('Admin Panel SW: instalado');
			self.skipWaiting();
		});
		
		self.addEventListener('activate', () => {
			console.log('Admin Panel SW: ativado');
		});
		
		self.addEventListener('fetch', (event) => {
			// Pass-through - não fazer cache no admin panel
			return;
		});
	`;
	
	return new Response(basicSW, {
		headers: {
			'content-type': 'application/javascript',
			'cache-control': 'public, max-age=0, must-revalidate',
			'service-worker-allowed': '/'
		}
	});
}; 