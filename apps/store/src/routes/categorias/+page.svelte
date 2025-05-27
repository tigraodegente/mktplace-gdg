<script lang="ts">
	import { onMount } from 'svelte';
	
	// Categorias principais com subcategorias
	const categories = [
		{
			id: 'berco',
			name: 'Berço',
			description: 'Tudo para o berço do seu bebê',
			image: '/api/placeholder/400/300',
			icon: '🛏️',
			productCount: 156,
			color: 'from-blue-400 to-blue-600',
			subcategories: [
				{ id: 'kit-berco', name: 'Kit Berço', count: 45 },
				{ id: 'lencol', name: 'Lençóis', count: 32 },
				{ id: 'protetor', name: 'Protetores', count: 28 },
				{ id: 'mosquiteiro', name: 'Mosquiteiros', count: 15 },
				{ id: 'edredom', name: 'Edredons', count: 20 },
				{ id: 'travesseiro', name: 'Travesseiros', count: 16 }
			]
		},
		{
			id: 'banho',
			name: 'Banho',
			description: 'Produtos para o banho do bebê',
			image: '/api/placeholder/400/300',
			icon: '🛁',
			productCount: 89,
			color: 'from-cyan-400 to-cyan-600',
			subcategories: [
				{ id: 'toalha', name: 'Toalhas', count: 34 },
				{ id: 'roupao', name: 'Roupões', count: 22 },
				{ id: 'banheira', name: 'Banheiras', count: 18 },
				{ id: 'acessorios-banho', name: 'Acessórios', count: 15 }
			]
		},
		{
			id: 'decoracao',
			name: 'Decoração',
			description: 'Decore o quarto do bebê com estilo',
			image: '/api/placeholder/400/300',
			icon: '🎨',
			productCount: 234,
			color: 'from-pink-400 to-pink-600',
			subcategories: [
				{ id: 'tapete', name: 'Tapetes', count: 67 },
				{ id: 'quadro', name: 'Quadros', count: 45 },
				{ id: 'luminaria', name: 'Luminárias', count: 38 },
				{ id: 'cortina', name: 'Cortinas', count: 29 },
				{ id: 'adesivo', name: 'Adesivos', count: 35 },
				{ id: 'mobile', name: 'Móbiles', count: 20 }
			]
		},
		{
			id: 'organizacao',
			name: 'Organização',
			description: 'Mantenha tudo organizado',
			image: '/api/placeholder/400/300',
			icon: '📦',
			productCount: 67,
			color: 'from-purple-400 to-purple-600',
			subcategories: [
				{ id: 'organizador-berco', name: 'Organizador Berço', count: 23 },
				{ id: 'cesto', name: 'Cestos', count: 19 },
				{ id: 'prateleira', name: 'Prateleiras', count: 15 },
				{ id: 'caixa', name: 'Caixas', count: 10 }
			]
		},
		{
			id: 'passeio',
			name: 'Passeio',
			description: 'Para sair com o bebê',
			image: '/api/placeholder/400/300',
			icon: '🚼',
			productCount: 45,
			color: 'from-green-400 to-green-600',
			subcategories: [
				{ id: 'bolsa', name: 'Bolsas', count: 18 },
				{ id: 'trocador', name: 'Trocadores', count: 12 },
				{ id: 'porta-mamadeira', name: 'Porta Mamadeira', count: 8 },
				{ id: 'necessaire', name: 'Necessaires', count: 7 }
			]
		},
		{
			id: 'alimentacao',
			name: 'Alimentação',
			description: 'Hora da papinha',
			image: '/api/placeholder/400/300',
			icon: '🍼',
			productCount: 78,
			color: 'from-orange-400 to-orange-600',
			subcategories: [
				{ id: 'babador', name: 'Babadores', count: 32 },
				{ id: 'kit-alimentacao', name: 'Kit Alimentação', count: 21 },
				{ id: 'jogo-americano', name: 'Jogo Americano', count: 15 },
				{ id: 'porta-talher', name: 'Porta Talheres', count: 10 }
			]
		}
	];
	
	// Estado para categoria expandida
	let expandedCategory = $state<string | null>(null);
	
	// Estatísticas gerais
	const totalProducts = categories.reduce((sum, cat) => sum + cat.productCount, 0);
	const totalSubcategories = categories.reduce((sum, cat) => sum + cat.subcategories.length, 0);
	
	function toggleCategory(categoryId: string) {
		expandedCategory = expandedCategory === categoryId ? null : categoryId;
	}
</script>

<div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
	<!-- Hero Section -->
	<div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] text-white">
		<div class="container mx-auto px-4 py-16">
			<div class="max-w-4xl mx-auto text-center">
				<h1 class="text-4xl md:text-5xl font-bold mb-4">Explore Nossas Categorias</h1>
				<p class="text-xl text-white/90 mb-8">
					Encontre tudo o que você precisa para o seu bebê em um só lugar
				</p>
				
				<!-- Estatísticas -->
				<div class="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
					<div class="text-center">
						<div class="text-3xl font-bold">{categories.length}</div>
						<div class="text-sm text-white/80">Categorias</div>
					</div>
					<div class="text-center">
						<div class="text-3xl font-bold">{totalSubcategories}</div>
						<div class="text-sm text-white/80">Subcategorias</div>
					</div>
					<div class="text-center">
						<div class="text-3xl font-bold">{totalProducts}+</div>
						<div class="text-sm text-white/80">Produtos</div>
					</div>
				</div>
			</div>
		</div>
		
		<!-- Wave decoration -->
		<div class="relative">
			<svg class="absolute bottom-0 w-full h-12 -mb-1 text-gray-50" preserveAspectRatio="none" viewBox="0 0 1440 54">
				<path fill="currentColor" d="M0 22L120 16.7C240 11 480 1.00001 720 0.700012C960 1.00001 1200 11 1320 16.7L1440 22V54H1320C1200 54 960 54 720 54C480 54 240 54 120 54H0V22Z"></path>
			</svg>
		</div>
	</div>
	
	<!-- Breadcrumb -->
	<div class="container mx-auto px-4 py-6">
		<nav class="text-sm">
			<ol class="flex items-center space-x-2">
				<li><a href="/" class="text-gray-500 hover:text-gray-700">Início</a></li>
				<li class="text-gray-400">/</li>
				<li class="text-gray-900">Categorias</li>
			</ol>
		</nav>
	</div>
	
	<!-- Categories Grid -->
	<div class="container mx-auto px-4 pb-16">
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
			{#each categories as category}
				<div class="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
					<!-- Category Header -->
					<a 
						href="/categoria/{category.id}"
						class="block relative h-48 overflow-hidden bg-gradient-to-br {category.color}"
					>
						<img 
							src={category.image} 
							alt={category.name}
							class="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-50"
						/>
						<div class="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
						<div class="absolute bottom-4 left-4 right-4">
							<div class="flex items-center justify-between">
								<div>
									<div class="text-4xl mb-2">{category.icon}</div>
									<h2 class="text-2xl font-bold text-white">{category.name}</h2>
									<p class="text-white/90 text-sm mt-1">{category.description}</p>
								</div>
								<div class="text-right">
									<div class="text-3xl font-bold text-white">{category.productCount}</div>
									<div class="text-xs text-white/80">produtos</div>
								</div>
							</div>
						</div>
					</a>
					
					<!-- Category Content -->
					<div class="p-6">
						<!-- Quick Links -->
						<div class="mb-4">
							<h3 class="text-sm font-semibold text-gray-700 mb-3">Subcategorias populares:</h3>
							<div class="flex flex-wrap gap-2">
								{#each category.subcategories.slice(0, 4) as subcat}
									<a 
										href="/categoria/{category.id}/{subcat.id}"
										class="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
									>
										<span>{subcat.name}</span>
										<span class="text-xs text-gray-500">({subcat.count})</span>
									</a>
								{/each}
							</div>
						</div>
						
						<!-- Expand/Collapse Button -->
						<button
							onclick={() => toggleCategory(category.id)}
							class="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-[#00BFB3] transition-colors"
						>
							<span>Ver todas as subcategorias</span>
							<svg 
								class="w-5 h-5 transition-transform {expandedCategory === category.id ? 'rotate-180' : ''}" 
								fill="none" 
								stroke="currentColor" 
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
							</svg>
						</button>
						
						<!-- Expanded Subcategories -->
						{#if expandedCategory === category.id}
							<div class="mt-4 pt-4 border-t border-gray-200">
								<div class="grid grid-cols-2 gap-2">
									{#each category.subcategories as subcat}
										<a 
											href="/categoria/{category.id}/{subcat.id}"
											class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
										>
											<span class="text-sm text-gray-700">{subcat.name}</span>
											<span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{subcat.count}</span>
										</a>
									{/each}
								</div>
							</div>
						{/if}
						
						<!-- Action Buttons -->
						<div class="mt-6 flex gap-3">
							<a 
								href="/categoria/{category.id}"
								class="flex-1 px-4 py-2 bg-[#00BFB3] text-white text-center rounded-lg hover:bg-[#00A89D] transition-colors font-medium"
							>
								Ver produtos
							</a>
							<button 
								class="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
								aria-label="Adicionar categoria aos favoritos"
							>
								<svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
								</svg>
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
		
		<!-- Featured Section -->
		<div class="mt-16 bg-white rounded-2xl shadow-lg p-8">
			<div class="text-center mb-8">
				<h2 class="text-3xl font-bold text-gray-900 mb-4">Por que escolher nossas categorias?</h2>
				<p class="text-gray-600 max-w-2xl mx-auto">
					Organizamos nossos produtos pensando em facilitar sua vida. Cada categoria foi cuidadosamente 
					planejada para você encontrar exatamente o que precisa.
				</p>
			</div>
			
			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="text-center">
					<div class="w-16 h-16 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-8 h-8 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold mb-2">Produtos Selecionados</h3>
					<p class="text-gray-600 text-sm">
						Cada item é cuidadosamente escolhido para garantir qualidade e segurança
					</p>
				</div>
				
				<div class="text-center">
					<div class="w-16 h-16 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-8 h-8 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold mb-2">Presentes Perfeitos</h3>
					<p class="text-gray-600 text-sm">
						Encontre o presente ideal para cada ocasião especial
					</p>
				</div>
				
				<div class="text-center">
					<div class="w-16 h-16 bg-[#00BFB3]/10 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-8 h-8 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<h3 class="text-lg font-semibold mb-2">Entrega Rápida</h3>
					<p class="text-gray-600 text-sm">
						Receba seus produtos rapidamente com nossa logística eficiente
					</p>
				</div>
			</div>
		</div>
	</div>
</div> 