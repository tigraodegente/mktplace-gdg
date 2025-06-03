import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
	const { width, height } = params;
	const text = url.searchParams.get('text') || '?';
	
	// Criar SVG simples como placeholder
	const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
		<rect width="100%" height="100%" fill="#f1f5f9"/>
		<text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" fill="#64748b" text-anchor="middle" dominant-baseline="middle">${text}</text>
	</svg>`;
	
	return new Response(svg, {
		headers: {
			'Content-Type': 'image/svg+xml',
			'Cache-Control': 'public, max-age=31536000'
		}
	});
}; 