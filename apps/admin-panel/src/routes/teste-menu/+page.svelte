<script>
	let showMenu = $state(false);
	let isMobile = $state(false);
	
	function toggleMenu() {
		showMenu = !showMenu;
		console.log('Menu toggled:', showMenu);
	}
	
	$effect(() => {
		const checkMobile = () => {
			isMobile = window.innerWidth < 1024;
		};
		checkMobile();
		window.addEventListener('resize', checkMobile);
		return () => window.removeEventListener('resize', checkMobile);
	});
</script>

<div class="min-h-screen bg-gray-50">
	<!-- Header simples -->
	<header class="fixed top-0 left-0 right-0 z-30 bg-white border-b h-16 flex items-center px-4">
		<button
			onclick={toggleMenu}
			class="p-2 rounded-lg hover:bg-gray-100"
		>
			<span class="text-2xl">☰</span>
		</button>
		<h1 class="ml-4 text-lg font-bold">Teste do Menu</h1>
	</header>
	
	<!-- Menu lateral simples -->
	{#if showMenu}
		<div class="fixed left-0 top-0 bottom-0 w-72 bg-white border-r z-40 pt-16">
			<div class="p-4">
				<h2 class="font-bold mb-4">Menu de Teste</h2>
				<ul class="space-y-2">
					<li><a href="#" class="block p-2 hover:bg-gray-100 rounded">Item 1</a></li>
					<li><a href="#" class="block p-2 hover:bg-gray-100 rounded">Item 2</a></li>
					<li><a href="#" class="block p-2 hover:bg-gray-100 rounded">Item 3</a></li>
				</ul>
			</div>
		</div>
		
		<!-- Backdrop para mobile -->
		<div 
			class="fixed inset-0 bg-black/50 z-30 lg:hidden"
			onclick={toggleMenu}
		></div>
	{/if}
	
	<!-- Conteúdo principal -->
	<main 
		class="pt-16 transition-all duration-300 bg-white min-h-screen"
		style="margin-left: {showMenu && !isMobile ? '288px' : '0px'};"
	>
		<div class="p-8">
			<h1 class="text-3xl font-bold mb-4">Teste do Layout do Menu</h1>
			
			<div class="space-y-4">
				<p><strong>Status do Menu:</strong> {showMenu ? 'Aberto' : 'Fechado'}</p>
				<p><strong>Mobile:</strong> {isMobile ? 'Sim' : 'Não'}</p>
				<p><strong>Margem aplicada:</strong> {showMenu && !isMobile ? '288px' : '0px'}</p>
				
				<button 
					onclick={toggleMenu}
					class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					{showMenu ? 'Fechar Menu' : 'Abrir Menu'}
				</button>
				
				<div class="bg-gray-100 p-4 rounded">
					<h2 class="font-bold mb-2">Instruções de Teste:</h2>
					<ol class="list-decimal list-inside space-y-1">
						<li>Clique no botão ☰ no header</li>
						<li>Observe se o menu lateral aparece</li>
						<li>Observe se este conteúdo se move para a direita</li>
						<li>Clique novamente para fechar</li>
						<li>Observe se o conteúdo retorna ao normal</li>
					</ol>
				</div>
				
				<div class="bg-yellow-100 p-4 rounded">
					<h3 class="font-bold">Resultado Esperado:</h3>
					<p>Quando o menu abre, este texto deve se mover 288px para a direita em desktop, criando espaço para o menu lateral.</p>
				</div>
			</div>
		</div>
	</main>
</div> 