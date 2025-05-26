<script lang="ts">
	import '../app.css';

	let { children } = $props();

	let mobileMenuOpen = $state(false);
</script>

<!-- Header -->
<header class="bg-white shadow-sm sticky top-0 z-50 border-b border-[var(--gray100)]">
	<nav class="container">
		<div class="flex justify-between h-16">
			<!-- Logo e Menu -->
			<div class="flex">
				<a href="/" class="flex items-center gap-3">
					<img src="/logo.png" alt="Marketplace GDG" class="h-10 w-auto" />
					<span class="text-2xl font-bold text-[var(--cyan500)]">Marketplace GDG</span>
				</a>
				
				<!-- Menu Desktop -->
				<div class="hidden md:ml-10 md:flex md:space-x-8">
					<a href="/produtos" class="inline-flex items-center px-1 pt-1 text-[var(--gray600)] hover:text-[var(--cyan500)] transition">
						Produtos
					</a>
					<a href="/categorias" class="inline-flex items-center px-1 pt-1 text-[var(--gray600)] hover:text-[var(--cyan500)] transition">
						Categorias
					</a>
					<a href="/ofertas" class="inline-flex items-center px-1 pt-1 text-[var(--gray600)] hover:text-[var(--cyan500)] transition">
						Ofertas
					</a>
				</div>
			</div>
			
			<!-- Ações do usuário -->
			<div class="flex items-center space-x-4">
				<button class="p-2 text-[var(--gray600)] hover:text-[var(--cyan500)] transition" aria-label="Buscar">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
					</svg>
				</button>
				
				<a href="/carrinho" class="p-2 text-[var(--gray600)] hover:text-[var(--cyan500)] relative transition">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
					<span class="absolute -top-1 -right-1 bg-[var(--pink500)] text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
						0
					</span>
					<span class="sr-only">Carrinho</span>
				</a>
				
				<a href="/login" class="hidden md:block btn btn-primary">
					Entrar
				</a>
				
				<!-- Menu Mobile -->
				<button
					class="md:hidden p-2 text-[var(--gray600)]"
					onclick={() => mobileMenuOpen = !mobileMenuOpen}
					aria-label="Menu"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			</div>
		</div>
		
		<!-- Menu Mobile Expandido -->
		{#if mobileMenuOpen}
			<div class="md:hidden border-t border-[var(--gray100)] pt-2 pb-3 space-y-1">
				<a href="/produtos" class="block px-3 py-2 text-[var(--gray600)] hover:bg-[var(--gray50)]">Produtos</a>
				<a href="/categorias" class="block px-3 py-2 text-[var(--gray600)] hover:bg-[var(--gray50)]">Categorias</a>
				<a href="/ofertas" class="block px-3 py-2 text-[var(--gray600)] hover:bg-[var(--gray50)]">Ofertas</a>
				<a href="/login" class="block px-3 py-2 btn btn-primary text-center mx-3">Entrar</a>
			</div>
		{/if}
	</nav>
</header>

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
				<h3 class="text-lg font-semibold mb-4 text-[var(--cyan200)]">Marketplace GDG</h3>
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
			<p>&copy; 2024 Marketplace GDG. Todos os direitos reservados.</p>
		</div>
	</div>
</footer>
