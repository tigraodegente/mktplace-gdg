<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
</script>

<div class="p-8">
	<h1 class="text-3xl font-bold mb-6">Teste Ícones Modernos</h1>
	
	<div class="grid grid-cols-6 gap-4">
		<div class="text-center p-4 border rounded">
			<ModernIcon name="product" size="lg" color="primary" />
			<p class="text-sm mt-2">product</p>
		</div>
		
		<div class="text-center p-4 border rounded">
			<ModernIcon name="add" size="lg" color="primary" />
			<p class="text-sm mt-2">add</p>
		</div>
		
		<div class="text-center p-4 border rounded">
			<ModernIcon name="edit" size="lg" color="primary" />
			<p class="text-sm mt-2">edit</p>
		</div>
		
		<div class="text-center p-4 border rounded">
			<ModernIcon name="active" size="lg" color="success" />
			<p class="text-sm mt-2">active</p>
		</div>
		
		<div class="text-center p-4 border rounded">
			<ModernIcon name="warning" size="lg" color="warning" />
			<p class="text-sm mt-2">warning</p>
		</div>
		
		<div class="text-center p-4 border rounded">
			<ModernIcon name="search" size="lg" color="muted" />
			<p class="text-sm mt-2">search</p>
		</div>
	</div>
</div> 