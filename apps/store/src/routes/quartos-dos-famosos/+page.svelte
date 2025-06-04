<script lang="ts">
	import { onMount } from 'svelte';

	// Dados dos quartos dos famosos
	const quartosFamosos = [
		{
			id: 1,
			nome: 'Villa Faria e Dilara essencial Quarto do José Ignacio',
			celebridade: 'Villa Faria',
			imagem: '/images/famosos/placeholder-quarto.svg',
			categoria: 'quarto-bebe',
			slug: 'villa-faria-jose-ignacio'
		},
		{
			id: 2,
			nome: 'Viviian Audi e Guillaume bebê menino Quarto da Luna',
			celebridade: 'Viviian Audi',
			imagem: '/images/famosos/placeholder-quarto.svg',
			categoria: 'quarto-infantil',
			slug: 'viviian-audi-luna'
		},
		{
			id: 3,
			nome: 'Anna Carolina e Arthur Aguiar Quarto da Manuela',
			celebridade: 'Anna Carolina',
			imagem: '/images/famosos/placeholder-quarto.svg',
			categoria: 'quartos-completos',
			slug: 'anna-carolina-manuela'
		},
		{
			id: 4,
			nome: 'Milena Toscano Quarto do Antonio Aguiar',
			celebridade: 'Milena Toscano',
			imagem: '/images/famosos/placeholder-quarto.svg',
			categoria: 'quartos-completos',
			slug: 'milena-toscano-antonio'
		},
		{
			id: 5,
			nome: 'Ana Paula Siebert Quarto do Vicky', 
			celebridade: 'Ana Paula Siebert',
			imagem: '/images/famosos/placeholder-quarto.svg',
			categoria: 'quarto-infantil',
			slug: 'ana-paula-siebert-vicky'
		},
		{
			id: 6,
			nome: 'Bruna Matilde e Francisco menino Quarto do José Joaquim',
			celebridade: 'Bruna Matilde',
			imagem: '/images/famosos/placeholder-quarto.svg',
			categoria: 'kit-cama',
			slug: 'bruna-matilde-jose-joaquim'
		},
		{
			id: 7,
			nome: 'Silvia Braz e Brenno Quarto do Rafael',
			celebridade: 'Silvia Braz',
			imagem: '/images/famosos/placeholder-quarto.svg',
			categoria: 'quarto-bebe',
			slug: 'silvia-braz-rafael'
		},
		{
			id: 8,
			nome: 'Fabiana Justus e Francisco menino Quarto do Luigi',
			celebridade: 'Fabiana Justus',
			imagem: '/images/famosos/placeholder-quarto.svg',
			categoria: 'quarto-infantil',
			slug: 'fabiana-justus-luigi'
		}
	];

	let mostrarMais = false;

	function toggleMostrarMais() {
		mostrarMais = !mostrarMais;
	}
</script>

<svelte:head>
	<title>Quartos dos Famosos - Grão de Gente Marketplace</title>
	<meta name="description" content="Conheça os quartos únicos e exclusivos criados para os filhos de celebridades e influenciadores. Inspire-se nos designs dos quartos dos famosos do Grão de Gente." />
	<meta name="keywords" content="quartos famosos, quartos celebridades, grão de gente famosos, quartos influenciadores, decoração infantil famosos" />
</svelte:head>

<!-- Breadcrumb - Mais compacto no mobile -->
<nav class="bg-gray-50 py-2 md:py-3" aria-label="Breadcrumb">
	<div class="container mx-auto px-4 lg:px-8">
		<ol class="flex items-center space-x-2 text-xs md:text-sm">
			<li>
				<a href="/" class="text-gray-500 hover:text-[#00BFB3] transition-colors">
					Home
				</a>
			</li>
			<li>
				<svg class="w-3 h-3 md:w-4 md:h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
				</svg>
			</li>
			<li>
				<span class="text-gray-700 font-medium">Quartos dos Famosos</span>
			</li>
		</ol>
	</div>
</nav>

<!-- Conteúdo Principal -->
<main class="py-4 md:py-8 lg:py-12">
	<div class="container mx-auto px-4 lg:px-8">
		<!-- Header da Página - Mobile Otimizado -->
		<div class="text-center mb-6 md:mb-8 lg:mb-12">
			<h1 class="text-xl md:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-3 md:mb-4" style="font-family: 'Lato', sans-serif;">
				Quartos dos <span class="text-[#00BFB3]">Famosos</span>
			</h1>
			
			<div class="max-w-4xl mx-auto">
				<p class="text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed mb-4 md:mb-6 px-2 md:px-0" style="font-family: 'Lato', sans-serif;">
					Conheça os quartos únicos e exclusivos que criamos para os filhos de celebridades e 
					influenciadores. Cada ambiente é pensado com carinho para refletir a personalidade e 
					os sonhos de cada família famosa. Inspire-se nestes projetos especiais!
				</p>
				
				<button
					onclick={toggleMostrarMais}
					class="inline-flex items-center gap-2 text-[#00BFB3] hover:text-[#00A89D] font-semibold transition-colors text-sm md:text-base"
					style="font-family: 'Lato', sans-serif;"
				>
					<span>{mostrarMais ? 'Ler Menos' : 'Leia Mais'}</span>
					<svg 
						class="w-3 h-3 md:w-4 md:h-4 transition-transform {mostrarMais ? 'rotate-180' : ''}" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if mostrarMais}
					<div class="mt-3 md:mt-4 text-gray-600 text-sm md:text-base lg:text-lg leading-relaxed px-2 md:px-0" style="font-family: 'Lato', sans-serif;">
						<p>
							Cada quarto foi desenvolvido em parceria com as mamães famosas, respeitando seus 
							gostos e necessidades específicas. Utilizamos materiais premium, design exclusivo 
							e todo o amor que caracteriza o Grão de Gente. Esses projetos únicos mostram como 
							cada detalhe pode transformar o ambiente em um verdadeiro refúgio dos sonhos.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Grid de Quartos dos Famosos - Mobile Otimizado -->
		<div class="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 lg:gap-8">
			{#each quartosFamosos as quarto}
				<article class="group">
					<a 
						href="/categorias/{quarto.categoria}/{quarto.slug}"
						class="block relative overflow-hidden rounded-lg md:rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
					>
						<!-- Badge de Famoso - Mobile Otimizado -->
						<div class="absolute top-2 left-2 md:top-4 md:left-4 z-10">
							<span class="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-wide" style="font-family: 'Lato', sans-serif;">
								<span class="hidden md:inline">✨ Famoso!</span>
								<span class="md:hidden">✨</span>
							</span>
						</div>

						<!-- Imagem - Aspect ratio otimizado para mobile -->
						<div class="aspect-[4/3] md:aspect-[4/3] overflow-hidden">
							<img 
								src={quarto.imagem}
								alt={quarto.nome}
								class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
								loading="lazy"
								onerror={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
							/>
						</div>

						<!-- Conteúdo - Mobile Compacto -->
						<div class="p-3 md:p-4 lg:p-6">
							<!-- Nome da Celebridade -->
							<div class="mb-1 md:mb-2">
								<span class="inline-block text-xs md:text-sm font-medium text-[#00BFB3] bg-[#00BFB3]/10 px-2 py-0.5 rounded-full" style="font-family: 'Lato', sans-serif;">
									{quarto.celebridade}
								</span>
							</div>
							
							<h3 class="text-sm md:text-lg lg:text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#00BFB3] transition-colors line-clamp-2" style="font-family: 'Lato', sans-serif;">
								{quarto.nome}
							</h3>
							
							<!-- Seta - Responsiva -->
							<div class="flex items-center justify-end">
								<div class="w-6 h-6 md:w-8 md:h-8 bg-gray-100 group-hover:bg-[#00BFB3] rounded-full flex items-center justify-center transition-all duration-300">
									<svg class="w-3 h-3 md:w-4 md:h-4 text-gray-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</div>
							</div>
						</div>
					</a>
				</article>
			{/each}
		</div>

		<!-- Call to Action Newsletter - Mobile Otimizado -->
		<div class="mt-8 md:mt-12 lg:mt-16 text-center">
			<div class="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl md:rounded-2xl p-6 md:p-8 lg:p-12 text-white mx-2 md:mx-0">
				<h2 class="text-xl md:text-2xl lg:text-3xl font-bold mb-3 md:mb-4" style="font-family: 'Lato', sans-serif;">
					✨ Quarto dos Sonhos para seu Filho!
				</h2>
				<p class="text-base md:text-lg mb-4 md:mb-6 opacity-90 px-2 md:px-0" style="font-family: 'Lato', sans-serif;">
					Entre em contato e crie um projeto exclusivo como os quartos dos famosos.
				</p>
				<div class="flex flex-col gap-3 md:flex-row md:gap-4 max-w-md mx-auto">
					<input 
						type="email" 
						placeholder="Seu melhor e-mail"
						class="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50 text-sm md:text-base"
						style="font-family: 'Lato', sans-serif;"
					/>
					<button 
						class="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base"
						style="font-family: 'Lato', sans-serif;"
					>
						Solicitar Projeto
					</button>
				</div>
			</div>
		</div>
	</div>
</main>

<style>
	/* Hover states consistentes */
	article:hover {
		will-change: transform;
	}
	
	/* Container responsivo */
	.container {
		width: 100%;
		max-width: 1440px;
	}
	
	/* Line clamp para títulos longos */
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	/* Touch targets otimizados para mobile */
	@media (max-width: 768px) {
		/* Aumentar área de toque nos cards */
		article a {
			min-height: 44px; /* Padrão iOS/Android */
		}
		
		/* Melhorar performance de scroll em mobile */
		article {
			-webkit-transform: translateZ(0);
			transform: translateZ(0);
		}
		
		/* Otimizar animações para touch devices */
		@media (hover: none) {
			article:hover {
				transform: none;
			}
			
			article:active {
				transform: scale(0.98);
				transition: transform 0.1s ease;
			}
		}
	}
	
	/* Melhorar legibilidade em telas pequenas */
	@media (max-width: 480px) {
		.container {
			padding-left: 12px;
			padding-right: 12px;
		}
		
		/* Ajustar grid gap para telas muito pequenas */
		.grid {
			gap: 8px;
		}
		
		/* Reduzir padding dos cards em mobile muito pequeno */
		article .p-3 {
			padding: 8px;
		}
	}
	
	/* Motion preferences */
	@media (prefers-reduced-motion: reduce) {
		* {
			animation-duration: 0.01ms !important;
			animation-iteration-count: 1 !important;
			transition-duration: 0.01ms !important;
		}
	}
</style> 