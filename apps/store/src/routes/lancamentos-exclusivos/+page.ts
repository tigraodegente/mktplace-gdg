import type { PageLoad } from './$types';

export interface Lancamento {
	id: number;
	nome: string;
	imagem: string;
	categoria: string;
	slug: string;
}

export const load = (async ({ fetch }) => {
	// Aqui podemos carregar dados do servidor se necessário
	// Por enquanto retornamos dados estáticos
	
	return {
		meta: {
			title: 'Lançamentos Exclusivos - Grão de Gente',
			description: 'Descubra as novas coleções exclusivas do Grão de Gente. Quartos infantis, kits de cama e muito mais para transformar o sonho das mamães em realidade.',
			keywords: 'lançamentos exclusivos, quartos infantis, grão de gente, coleções novas, quarto bebê'
		}
	};
}) satisfies PageLoad; 