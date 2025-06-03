<script>
	import CategorySection from './CategorySection.svelte';
</script>

<!-- Exemplo básico -->
<CategorySection />

<!-- Com título customizado -->
<CategorySection title="Nossas Categorias Especiais" />

<!-- Com classe CSS adicional -->
<CategorySection class="my-custom-section" />

<!-- Em uma página específica -->
<div class="page-content">
	<h1>Página de Produtos</h1>
	
	<!-- Seção de categorias -->
	<CategorySection 
		title="Explore Nossas Categorias"
		class="categories-highlight"
	/>
	
	<!-- Outros conteúdos da página -->
</div>

<style>
	.page-content {
		max-width: 1440px;
		margin: 0 auto;
		padding: 0 20px;
	}
	
	/* Customizações específicas */
	:global(.my-custom-section) {
		margin: 64px 0;
		background: #f8f9fa;
	}
	
	:global(.categories-highlight) {
		border-top: 4px solid #00BFB3;
		margin-top: 32px;
	}
</style> 