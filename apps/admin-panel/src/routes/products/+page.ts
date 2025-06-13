import { redirect } from '@sveltejs/kit';

export function load() {
	// Redirecionar /products para /produtos (rota correta em português)
	throw redirect(301, '/produtos');
} 