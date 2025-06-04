<script lang="ts">
	import { onMount } from 'svelte';

	// Dados dos lançamentos exclusivos
	const lancamentos = [
		{
			id: 1,
			nome: 'Selva Baby Rosa',
			imagem: '/images/lancamentos/placeholder-quarto.svg',
			categoria: 'quarto-bebe',
			slug: 'selva-baby-rosa'
		},
		{
			id: 2,
			nome: 'Quarto Infantil Música',
			imagem: '/images/lancamentos/placeholder-quarto.svg',
			categoria: 'quarto-infantil',
			slug: 'quarto-infantil-musica'
		},
		{
			id: 3,
			nome: 'Quartos Completos Baby Alive',
			imagem: '/images/lancamentos/placeholder-quarto.svg',
			categoria: 'quartos-completos',
			slug: 'quartos-completos-baby-alive'
		},
		{
			id: 4,
			nome: 'Quartos Completos Seleções do Mundo',
			imagem: '/images/lancamentos/placeholder-quarto.svg',
			categoria: 'quartos-completos',
			slug: 'quartos-completos-selecoes-mundo'
		},
		{
			id: 5,
			nome: 'Quarto Infantil Aventura',
			imagem: '/images/lancamentos/placeholder-quarto.svg',
			categoria: 'quarto-infantil',
			slug: 'quarto-infantil-aventura'
		},
		{
			id: 6,
			nome: 'Kit Cama Infantil Azul',
			imagem: '/images/lancamentos/placeholder-quarto.svg',
			categoria: 'kit-cama',
			slug: 'kit-cama-infantil-azul'
		}
	];

	let mostrarMais = false;

	function toggleMostrarMais() {
		mostrarMais = !mostrarMais;
	}
</script>

<svelte:head>
	<title>Lançamentos Exclusivos - Grão de Gente Marketplace</title>
	<meta name="description" content="Descubra as novas coleções exclusivas do Grão de Gente. Quartos infantis, kits de cama e muito mais para transformar o sonho das mamães em realidade." />
	<meta name="keywords" content="lançamentos exclusivos, quartos infantis, grão de gente, coleções novas, quarto bebê" />
</svelte:head>

<!-- Breadcrumb -->
<nav class="bg-gray-50 py-3" aria-label="Breadcrumb">
	<div class="container mx-auto px-4 lg:px-8">
		<ol class="flex items-center space-x-2 text-sm">
			<li>
				<a href="/" class="text-gray-500 hover:text-[#00BFB3] transition-colors">
					Home
				</a>
			</li>
			<li>
				<svg class="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd" />
				</svg>
			</li>
			<li>
				<span class="text-gray-700 font-medium">Lançamentos Exclusivos</span>
			</li>
		</ol>
	</div>
</nav>

<!-- Conteúdo Principal -->
<main class="py-8 lg:py-12">
	<div class="container mx-auto px-4 lg:px-8">
		<!-- Header da Página -->
		<div class="text-center mb-8 lg:mb-12">
			<h1 class="text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-4" style="font-family: 'Lato', sans-serif;">
				Lançamentos <span class="text-[#00BFB3]">Exclusivos</span>
			</h1>
			
			<div class="max-w-4xl mx-auto">
				<p class="text-gray-600 text-base lg:text-lg leading-relaxed mb-6" style="font-family: 'Lato', sans-serif;">
					As novas coleções do Grão de Gente são exclusivas e desenvolvidas para transformar o sonho 
					de todas as mamães em realidade. Toda semana um lançamento para você! Para ficar por dentro 
					de todas as novidades, cadastre o seu e-mail e receba em primeira mão os nossos lançamentos.
				</p>
				
				<button
					onclick={toggleMostrarMais}
					class="inline-flex items-center gap-2 text-[#00BFB3] hover:text-[#00A89D] font-semibold transition-colors"
					style="font-family: 'Lato', sans-serif;"
				>
					<span>{mostrarMais ? 'Ler Menos' : 'Leia Mais'}</span>
					<svg 
						class="w-4 h-4 transition-transform {mostrarMais ? 'rotate-180' : ''}" 
						fill="none" 
						stroke="currentColor" 
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				
				{#if mostrarMais}
					<div class="mt-4 text-gray-600 text-base lg:text-lg leading-relaxed" style="font-family: 'Lato', sans-serif;">
						<p>
							Cada coleção é cuidadosamente desenvolvida com materiais de alta qualidade, 
							algodão premium e designs únicos que despertam a imaginação das crianças. 
							Nossos quartos completos incluem desde jogos de cama até acessórios decorativos 
							que criam ambientes mágicos e acolhedores.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Grid de Lançamentos -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
			{#each lancamentos as lancamento}
				<article class="group">
					<a 
						href="/categorias/{lancamento.categoria}/{lancamento.slug}"
						class="block relative overflow-hidden rounded-xl bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
					>
						<!-- Badge de Lançamento -->
						<div class="absolute top-4 left-4 z-10">
							<span class="inline-block bg-[#00BFB3] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide" style="font-family: 'Lato', sans-serif;">
								Lançamentos!
							</span>
						</div>

						<!-- Imagem -->
						<div class="aspect-[4/3] overflow-hidden">
							<img 
								src={lancamento.imagem}
								alt={lancamento.nome}
								class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
								loading="lazy"
								onerror={(e) => { (e.target as HTMLImageElement).src = '/placeholder.jpg'; }}
							/>
						</div>

						<!-- Conteúdo -->
						<div class="p-4 lg:p-6">
							<h3 class="text-lg lg:text-xl font-semibold text-gray-900 mb-2 group-hover:text-[#00BFB3] transition-colors" style="font-family: 'Lato', sans-serif;">
								{lancamento.nome}
							</h3>
							
							<!-- Seta -->
							<div class="flex items-center justify-end">
								<div class="w-8 h-8 bg-gray-100 group-hover:bg-[#00BFB3] rounded-full flex items-center justify-center transition-all duration-300">
									<svg class="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
									</svg>
								</div>
							</div>
						</div>
					</a>
				</article>
			{/each}
		</div>

		<!-- Call to Action Newsletter -->
		<div class="mt-12 lg:mt-16 text-center">
			<div class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] rounded-2xl p-8 lg:p-12 text-white">
				<h2 class="text-2xl lg:text-3xl font-bold mb-4" style="font-family: 'Lato', sans-serif;">
					Não Perca Nenhum Lançamento!
				</h2>
				<p class="text-lg mb-6 opacity-90" style="font-family: 'Lato', sans-serif;">
					Cadastre seu e-mail e seja a primeira a conhecer nossas novidades exclusivas.
				</p>
				<div class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
					<input 
						type="email" 
						placeholder="Seu melhor e-mail"
						class="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50"
						style="font-family: 'Lato', sans-serif;"
					/>
					<button 
						class="px-6 py-3 bg-white text-[#00BFB3] font-semibold rounded-lg hover:bg-gray-50 transition-colors"
						style="font-family: 'Lato', sans-serif;"
					>
						Cadastrar
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
</style> 