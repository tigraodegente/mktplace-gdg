<script lang="ts">
	import '../app.css';

	let { children } = $props();

	let mobileMenuOpen = $state(false);
	let searchQuery = $state('');
</script>

<!-- Banner Promocional -->
<div class="bg-[#4ABAA5] text-white text-center py-2 text-sm font-medium">
	<a href="/promocoes" class="flex items-center justify-center gap-2">
		<span>Tudo em até 12X</span>
		<span class="underline">COMPRAR</span>
	</a>
</div>

<!-- Header Desktop -->
<header class="hidden lg:block bg-white sticky top-0 z-50 shadow-sm">
	<!-- Top Header -->
	<div class="container mx-auto px-4">
		<div class="flex items-center justify-between py-4">
			<!-- Logo -->
			<a href="/" class="flex items-center">
				<img src="/logo.png" alt="Grão de Gente" class="h-12 w-auto" />
			</a>
			
			<!-- Search Bar -->
			<div class="flex-1 max-w-xl mx-8">
				<form class="relative">
					<input
						type="search"
						placeholder="O que você está procurando?"
						bind:value={searchQuery}
						class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none focus:border-[#4ABAA5]"
					/>
					<button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2 text-[#4ABAA5]">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
					</button>
				</form>
			</div>
			
			<!-- User Actions -->
			<div class="flex items-center gap-6">
				<a href="/login" class="flex flex-col items-center text-gray-600 hover:text-[#4ABAA5] transition">
					<svg class="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
					<span class="text-xs">Olá, faça</span>
					<span class="text-xs font-medium">login</span>
				</a>
				
				<a href="/favoritos" class="relative text-gray-600 hover:text-[#4ABAA5] transition">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
					</svg>
				</a>
				
				<a href="/carrinho" class="relative text-gray-600 hover:text-[#4ABAA5] transition">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
					<span class="absolute -top-2 -right-2 bg-[#4ABAA5] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
						0
					</span>
				</a>
			</div>
		</div>
		
		<!-- Navigation Menu -->
		<nav class="border-t border-gray-100">
			<ul class="flex items-center gap-6 py-3 text-sm">
				<li><a href="/categorias" class="text-gray-700 hover:text-[#4ABAA5] transition">Todas as categorias</a></li>
				<li><a href="/minhas" class="text-gray-700 hover:text-[#4ABAA5] transition">Minhas</a></li>
				<li><a href="/marcas" class="text-gray-700 hover:text-[#4ABAA5] transition">Marcas</a></li>
				<li><a href="/kit-ritual" class="text-gray-700 hover:text-[#4ABAA5] transition">Kit Ritual</a></li>
				<li><a href="/quem-somos" class="text-gray-700 hover:text-[#4ABAA5] transition">Quem Somos</a></li>
				<li><a href="/receitas" class="text-gray-700 hover:text-[#4ABAA5] transition">Receitas</a></li>
				<li><a href="/sobre-maternidade" class="text-gray-700 hover:text-[#4ABAA5] transition">Sobre Maternidade</a></li>
				<li><a href="/midia" class="text-gray-700 hover:text-[#4ABAA5] transition">Mídia</a></li>
				<li><a href="/mindfulness" class="text-gray-700 hover:text-[#4ABAA5] transition">Mindfulness</a></li>
				<li><a href="/brinfa" class="text-gray-700 hover:text-[#4ABAA5] transition">Brinfa</a></li>
				<li><a href="/parceria" class="text-gray-700 hover:text-[#4ABAA5] transition">Parceria</a></li>
				<li><a href="/escola" class="text-gray-700 hover:text-[#4ABAA5] transition">Escola</a></li>
				<li><a href="/lancamentos" class="text-gray-700 hover:text-[#4ABAA5] transition">Lançamentos</a></li>
				<li><a href="/quero-ser-parceiro" class="text-gray-700 hover:text-[#4ABAA5] transition">Quero Ser Parceiro</a></li>
			</ul>
		</nav>
	</div>
</header>

<!-- Header Mobile -->
<header class="lg:hidden bg-[#4ABAA5] sticky top-0 z-50">
	<div class="flex items-center justify-between p-4">
		<!-- Menu Button -->
		<button
			onclick={() => mobileMenuOpen = !mobileMenuOpen}
			class="text-white"
			aria-label="Menu"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
			</svg>
		</button>
		
		<!-- Logo -->
		<a href="/" class="flex-1 flex justify-center">
			<img src="/logo.png" alt="Grão de Gente" class="h-8 w-auto filter brightness-0 invert" />
		</a>
		
		<!-- Actions -->
		<div class="flex items-center gap-4">
			<a href="/favoritos" class="text-white">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
				</svg>
			</a>
			
			<a href="/carrinho" class="relative text-white">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				<span class="absolute -top-2 -right-2 bg-white text-[#4ABAA5] text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
					3
				</span>
			</a>
		</div>
	</div>
	
	<!-- Search Bar Mobile -->
	<div class="px-4 pb-4">
		<form class="relative">
			<input
				type="search"
				placeholder="O que você está procurando?"
				bind:value={searchQuery}
				class="w-full px-4 py-3 pr-12 rounded-full text-gray-700 placeholder-gray-400 focus:outline-none"
			/>
			<button type="submit" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
				</svg>
			</button>
		</form>
	</div>
</header>

<!-- Mobile Menu Overlay -->
{#if mobileMenuOpen}
	<div class="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onclick={() => mobileMenuOpen = false}>
		<div class="bg-white w-80 h-full overflow-y-auto" onclick={(e) => e.stopPropagation()}>
			<div class="p-4 border-b">
				<button onclick={() => mobileMenuOpen = false} class="text-gray-600">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			
			<nav class="p-4">
				<ul class="space-y-4">
					<li><a href="/categorias" class="block text-gray-700 hover:text-[#4ABAA5]">Todas as categorias</a></li>
					<li><a href="/minhas" class="block text-gray-700 hover:text-[#4ABAA5]">Minhas</a></li>
					<li><a href="/marcas" class="block text-gray-700 hover:text-[#4ABAA5]">Marcas</a></li>
					<li><a href="/kit-ritual" class="block text-gray-700 hover:text-[#4ABAA5]">Kit Ritual</a></li>
					<li><a href="/quem-somos" class="block text-gray-700 hover:text-[#4ABAA5]">Quem Somos</a></li>
					<li><a href="/receitas" class="block text-gray-700 hover:text-[#4ABAA5]">Receitas</a></li>
					<li><a href="/sobre-maternidade" class="block text-gray-700 hover:text-[#4ABAA5]">Sobre Maternidade</a></li>
					<li><a href="/midia" class="block text-gray-700 hover:text-[#4ABAA5]">Mídia</a></li>
					<li><a href="/mindfulness" class="block text-gray-700 hover:text-[#4ABAA5]">Mindfulness</a></li>
					<li><a href="/brinfa" class="block text-gray-700 hover:text-[#4ABAA5]">Brinfa</a></li>
					<li><a href="/parceria" class="block text-gray-700 hover:text-[#4ABAA5]">Parceria</a></li>
					<li><a href="/escola" class="block text-gray-700 hover:text-[#4ABAA5]">Escola</a></li>
					<li><a href="/lancamentos" class="block text-gray-700 hover:text-[#4ABAA5]">Lançamentos</a></li>
					<li><a href="/quero-ser-parceiro" class="block text-gray-700 hover:text-[#4ABAA5]">Quero Ser Parceiro</a></li>
				</ul>
			</nav>
		</div>
	</div>
{/if}

<!-- Conteúdo Principal -->
<main class="min-h-screen bg-[var(--background-color)]">
	{@render children()}
</main>

<!-- Footer -->
<footer class="bg-[var(--gray600)] text-white">
	<div class="container py-12">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-8">
			<!-- Sobre -->
			<div>
				<h3 class="text-lg font-semibold mb-4 text-[var(--cyan200)]">Grão de Gente</h3>
				<p class="text-[var(--gray100)] text-sm">
					Sua plataforma de compras online com os melhores produtos e preços.
				</p>
			</div>
			
			<!-- Links Úteis -->
			<div>
				<h4 class="text-lg font-semibold mb-4 text-[var(--cyan200)]">Links Úteis</h4>
				<ul class="space-y-2 text-sm">
					<li><a href="/sobre" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition">Sobre nós</a></li>
					<li><a href="/contato" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition">Contato</a></li>
					<li><a href="/faq" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition">FAQ</a></li>
					<li><a href="/blog" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition">Blog</a></li>
				</ul>
			</div>
			
			<!-- Atendimento -->
			<div>
				<h4 class="text-lg font-semibold mb-4 text-[var(--cyan200)]">Atendimento</h4>
				<ul class="space-y-2 text-sm">
					<li><a href="/central-ajuda" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition">Central de Ajuda</a></li>
					<li><a href="/trocas-devolucoes" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition">Trocas e Devoluções</a></li>
					<li><a href="/politica-privacidade" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition">Política de Privacidade</a></li>
					<li><a href="/termos-uso" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition">Termos de Uso</a></li>
				</ul>
			</div>
			
			<!-- Redes Sociais -->
			<div>
				<h4 class="text-lg font-semibold mb-4 text-[var(--cyan200)]">Siga-nos</h4>
				<div class="flex space-x-4">
					<a href="https://facebook.com" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition" aria-label="Facebook">
						<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
							<path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
						</svg>
					</a>
					<a href="https://twitter.com" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition" aria-label="Twitter">
						<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
							<path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
						</svg>
					</a>
					<a href="https://instagram.com" class="text-[var(--gray100)] hover:text-[var(--cyan200)] transition" aria-label="Instagram">
						<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
							<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM5.838 12a6.162 6.162 0 1112.324 0 6.162 6.162 0 01-12.324 0zM12 16a4 4 0 110-8 4 4 0 010 8zm4.965-10.405a1.44 1.44 0 112.881.001 1.44 1.44 0 01-2.881-.001z"/>
						</svg>
					</a>
				</div>
			</div>
		</div>
		
		<div class="mt-8 pt-8 border-t border-[var(--gray500)] text-center text-sm text-[var(--gray100)]">
			<p>&copy; 2024 Grão de Gente. Todos os direitos reservados.</p>
		</div>
	</div>
</footer>
