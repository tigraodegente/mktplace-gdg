import type { PageServerLoad } from './$types';

// Por enquanto vamos usar uma query SQL direta
// Depois podemos migrar para o Xata client quando estiver funcionando
export const load: PageServerLoad = async () => {
	// Simulando dados do banco por enquanto
	// TODO: Conectar com o banco real via Xata ou SQL direto
	
	const featuredProducts = [
		{
			id: 1,
			name: 'Notebook Gamer Pro',
			image: '/api/placeholder/300/300?text=Notebook&bg=00BFB3&color=ffffff',
			price: 4999.99,
			originalPrice: 5999.99,
			discount: 17
		},
		{
			id: 2,
			name: 'Smartphone Ultra 5G',
			image: '/api/placeholder/300/300?text=Smartphone&bg=017F77&color=ffffff',
			price: 2499.99,
			originalPrice: 2999.99,
			discount: 17
		},
		{
			id: 3,
			name: 'Fone Bluetooth Premium',
			image: '/api/placeholder/300/300?text=Fone&bg=F66C85&color=ffffff',
			price: 299.99,
			originalPrice: 399.99,
			discount: 25
		},
		{
			id: 4,
			name: 'Smartwatch Fitness',
			image: '/api/placeholder/300/300?text=Smartwatch&bg=F9A51A&color=ffffff',
			price: 899.99,
			originalPrice: 1199.99,
			discount: 25
		}
	];
	
	const categories = [
		{ name: 'Eletrônicos', icon: '📱', count: 1234 },
		{ name: 'Moda', icon: '👕', count: 5678 },
		{ name: 'Casa', icon: '🏠', count: 910 },
		{ name: 'Esportes', icon: '⚽', count: 432 },
		{ name: 'Livros', icon: '📚', count: 789 },
		{ name: 'Beleza', icon: '💄', count: 567 }
	];
	
	return {
		featuredProducts,
		categories
	};
}; 