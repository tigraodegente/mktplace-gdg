<script lang="ts">
	import AdminPageTemplate from '$lib/components/ui/AdminPageTemplate.svelte';
	import { PageConfigs } from '$lib/config/pageConfigs';
	import { toast } from '$lib/stores/toast';
	
	// Base: configuração padrão de categorias
	const baseConfig = PageConfigs.categorias;
	
	// Customização: apenas o que é diferente!
	const config = {
		...baseConfig,
		
		// Ações customizadas para categorias
		customActions: (categoria: any) => {
			const actions = [];
			
			// Ação específica: duplicar categoria
			actions.push({
				label: 'Duplicar',
				icon: 'copy',
				variant: 'secondary',
				onclick: () => duplicateCategory(categoria)
			});
			
			// Ação específica: ver produtos da categoria
			if (categoria.products_count > 0) {
				actions.push({
					label: 'Ver Produtos',
					icon: 'eye',
					variant: 'secondary',
					onclick: () => viewCategoryProducts(categoria.id)
				});
			}
			
			return actions;
		},
		
		// Transformação customizada dos dados
		onDataLoad: (categories: any[]) => {
			return categories.map(cat => ({
				...cat,
				// Adicionar informação extra
				display_name: `${cat.name} (${cat.products_count || 0} produtos)`
			}));
		}
	};
	
	// Funções específicas (apenas quando necessário)
	function duplicateCategory(categoria: any) {
		toast.info(`Funcionalidade de duplicar categoria ${categoria.name} será implementada`);
	}
	
	function viewCategoryProducts(categoryId: string) {
		// Navegação para produtos filtrados por categoria
		window.location.href = `/produtos?categoria=${categoryId}`;
	}
</script>

<!-- Página com customizações específicas mas ainda usando o template -->
<AdminPageTemplate {...config} /> 