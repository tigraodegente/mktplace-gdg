<script lang="ts">
	interface MobileMenuProps {
		isOpen: boolean;
		onClose: () => void;
		class?: string;
	}
	
	let { 
		isOpen = false,
		onClose,
		class: className = ''
	}: MobileMenuProps = $props();
	
	const menuItems = [
		{ href: '/categorias', label: 'Todas as categorias' },
		{ href: '/test', label: 'Testes', icon: true },
		{ href: '/minhas', label: 'Minhas' },
		{ href: '/marcas', label: 'Marcas' },
		{ href: '/kit-ritual', label: 'Kit Ritual' },
		{ href: '/quem-somos', label: 'Quem Somos' },
		{ href: '/receitas', label: 'Receitas' },
		{ href: '/sobre-maternidade', label: 'Sobre Maternidade' },
		{ href: '/midia', label: 'Mídia' },
		{ href: '/mindfulness', label: 'Mindfulness' },
		{ href: '/brinfa', label: 'Brinfa' },
		{ href: '/parceria', label: 'Parceria' },
		{ href: '/escola', label: 'Escola' },
		{ href: '/lancamentos', label: 'Lançamentos' },
		{ href: '/quero-ser-parceiro', label: 'Quero Ser Parceiro' }
	];
</script>

{#if isOpen}
	<!-- Mobile Menu Overlay -->
	<div class="lg:hidden fixed inset-0 z-50 {className}">
		<!-- Backdrop button -->
		<button 
			class="absolute inset-0 bg-black bg-opacity-50 w-full h-full cursor-default" 
			onclick={onClose}
			aria-label="Fechar menu"
			type="button"
		></button>
		
		<!-- Menu Panel -->
		<div 
			class="relative bg-white w-80 h-full overflow-y-auto" 
			role="navigation"
			aria-label="Menu principal"
		>
			<div class="p-4 border-b">
				<button onclick={onClose} class="text-gray-600" aria-label="Fechar menu" type="button">
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
			
			<nav class="p-4">
				<ul class="space-y-4">
					{#each menuItems as item}
						<li>
							<a 
								href={item.href} 
								class="block text-gray-700 hover:text-[#00BFB3] transition-colors {item.icon ? 'flex items-center gap-1' : ''}"
								onclick={onClose}
							>
								{#if item.icon}
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
								{/if}
								{item.label}
							</a>
						</li>
					{/each}
				</ul>
			</nav>
		</div>
	</div>
{/if} 