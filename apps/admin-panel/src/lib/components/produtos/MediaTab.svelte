<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	
	let { formData = $bindable() } = $props();
	
	// Inicializar arrays se não existirem
	if (!formData.images) formData.images = [];
	
	// Estados locais
	let uploading = $state(false);
	let dragOver = $state(false);
	
	// Upload de imagem
	async function handleImageUpload(files: FileList | null) {
		if (!files || files.length === 0) return;
		
		uploading = true;
		try {
			for (const file of files) {
				if (!file.type.startsWith('image/')) {
					alert('Por favor, selecione apenas imagens');
					continue;
				}
				
				// Criar FormData
				const uploadData = new FormData();
				uploadData.append('file', file);
				
				// Fazer upload
				const response = await fetch('/api/upload', {
					method: 'POST',
					body: uploadData
				});
				
				if (response.ok) {
					const data = await response.json();
					// Adicionar URL da imagem ao array
					formData.images = [...formData.images, data.url];
				} else {
					alert('Erro ao fazer upload da imagem');
				}
			}
		} catch (error) {
			console.error('Erro no upload:', error);
			alert('Erro ao fazer upload das imagens');
		} finally {
			uploading = false;
		}
	}
	
	// Remover imagem
	function removeImage(index: number) {
		formData.images = formData.images.filter((_: any, i: number) => i !== index);
	}
	
	// Definir imagem principal (primeira do array)
	function setMainImage(index: number) {
		if (index === 0) return;
		const image = formData.images[index];
		formData.images.splice(index, 1);
		formData.images.unshift(image);
		formData.images = [...formData.images];
	}
	
	// Reordenar imagens
	function moveImage(from: number, to: number) {
		const newImages = [...formData.images];
		const [removed] = newImages.splice(from, 1);
		newImages.splice(to, 0, removed);
		formData.images = newImages;
	}
	
	// Drag and Drop
	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}
	
	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
	}
	
	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		
		const files = e.dataTransfer?.files;
		if (files) {
			handleImageUpload(files);
		}
	}
</script>

<div class="space-y-8">
	<!-- UPLOAD DE IMAGENS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="image" size={20} color="#00BFB3" />
			Imagens do Produto
		</h4>
		
		<!-- Área de Upload -->
		<div
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			class="border-2 border-dashed rounded-lg p-8 text-center transition-all {dragOver ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-300'}"
		>
			<ModernIcon name="Upload" size={48} color="#9CA3AF" />
			<p class="mt-2 text-sm text-gray-600">
				Arraste imagens aqui ou
			</p>
			<label class="mt-2 inline-block">
				<input
					type="file"
					multiple
					accept="image/*"
					onchange={(e) => handleImageUpload(e.currentTarget.files)}
					disabled={uploading}
					class="hidden"
				/>
				<span class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg cursor-pointer inline-flex items-center gap-2 transition-colors">
					{#if uploading}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Enviando...
					{:else}
						<ModernIcon name="Upload" size={16} />
						Selecionar Imagens
					{/if}
				</span>
			</label>
			<p class="mt-2 text-xs text-gray-500">
				JPG, PNG, GIF ou WebP. Máximo 5MB por imagem.
			</p>
		</div>
		
		<!-- Galeria de Imagens -->
		{#if formData.images.length > 0}
			<div class="mt-6">
				<h5 class="text-sm font-medium text-gray-700 mb-3">
					Imagens Adicionadas ({formData.images.length})
				</h5>
				<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
					{#each formData.images as image, index}
						<div class="relative group">
							<!-- Imagem -->
							<img
								src={image}
								alt="Imagem {index + 1}"
								class="w-full aspect-square object-cover rounded-lg border-2 {index === 0 ? 'border-[#00BFB3]' : 'border-gray-200'}"
							/>
							
							<!-- Badge Principal -->
							{#if index === 0}
								<span class="absolute top-2 left-2 px-2 py-1 bg-[#00BFB3] text-white text-xs rounded">
									Principal
								</span>
							{/if}
							
							<!-- Ações -->
							<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
								{#if index !== 0}
									<button
										type="button"
										onclick={() => setMainImage(index)}
										class="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
										title="Definir como principal"
									>
										<ModernIcon name="star" size={16} />
									</button>
								{/if}
								
								{#if index > 0}
									<button
										type="button"
										onclick={() => moveImage(index, index - 1)}
										class="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
										title="Mover para esquerda"
									>
										<ModernIcon name="ChevronLeft" size={16} />
									</button>
								{/if}
								
								{#if index < formData.images.length - 1}
									<button
										type="button"
										onclick={() => moveImage(index, index + 1)}
										class="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
										title="Mover para direita"
									>
										<ModernIcon name="ChevronRight" size={16} />
									</button>
								{/if}
								
								<button
									type="button"
									onclick={() => removeImage(index)}
									class="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
									title="Remover imagem"
								>
									<ModernIcon name="delete" size={16} />
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mt-6 text-center py-8 bg-gray-50 rounded-lg">
				<ModernIcon name="image" size={48} color="#D1D5DB" />
				<p class="mt-2 text-gray-500">Nenhuma imagem adicionada</p>
			</div>
		{/if}
		
		<!-- Dicas -->
		<div class="mt-6 p-4 bg-blue-50 rounded-lg">
			<h5 class="font-medium text-blue-900 mb-2 flex items-center gap-2">
				<ModernIcon name="info" size={16} color="#1E40AF" />
				Dicas para melhores resultados
			</h5>
			<ul class="text-sm text-blue-700 space-y-1">
				<li>• Use imagens com pelo menos 800x800 pixels</li>
				<li>• Fundo branco ou neutro para produtos</li>
				<li>• Mostre o produto de diferentes ângulos</li>
				<li>• A primeira imagem será a imagem principal</li>
			</ul>
		</div>
	</div>
	
	<!-- URLs EXTERNAS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="url" size={20} color="#00BFB3" />
			Adicionar por URL
		</h4>
		
		<div class="flex gap-2">
			<input
				type="url"
				placeholder="https://exemplo.com/imagem.jpg"
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						const input = e.currentTarget;
						if (input.value.trim()) {
							formData.images = [...formData.images, input.value.trim()];
							input.value = '';
						}
					}
				}}
				class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
			/>
			<button
				type="button"
				onclick={(e) => {
					const input = e.currentTarget.previousElementSibling as HTMLInputElement;
					if (input.value.trim()) {
						formData.images = [...formData.images, input.value.trim()];
						input.value = '';
					}
				}}
				class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
			>
				Adicionar
			</button>
		</div>
		<p class="text-xs text-gray-500 mt-2">
			Cole a URL direta da imagem
		</p>
	</div>
</div> 