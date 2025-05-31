import type { RequestHandler } from './$types';

// Service Worker básico e estável para desenvolvimento
export async function GET() {
	const swContent = `
// Service Worker simplificado para desenvolvimento
const CACHE_NAME = 'gdg-dev-v1';

self.addEventListener('install', event => {
	console.log('SW: Instalado');
	// Não fazer skipWaiting em desenvolvimento
});

self.addEventListener('activate', event => {
	console.log('SW: Ativado');
	// Não fazer claim em desenvolvimento
});

self.addEventListener('fetch', event => {
	// Em desenvolvimento, não interceptar requests para evitar problemas
	return;
});
`;

	return new Response(swContent, {
		headers: {
			'Content-Type': 'application/javascript',
			'Cache-Control': 'no-cache, no-store, must-revalidate',
			'Pragma': 'no-cache',
			'Expires': '0'
		}
	});
} 