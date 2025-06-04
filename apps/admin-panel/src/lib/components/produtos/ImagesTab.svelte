<script lang="ts">
	let { formData = $bindable() } = $props();

	// Estados locais para upload de imagens
	let dragActive = false;
	let uploading = false;
	let uploadProgress = 0;

	// Inicializar array de imagens se não existir
	if (!formData.images) formData.images = [];

	// Função para simular upload de imagem
	async function uploadImage(file: File): Promise<string> {
		// Simular processo de upload
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.onload = () => {
				setTimeout(() => {
					resolve(reader.result as string);
				}, 1000);
			};
			reader.readAsDataURL(file);
		});
	}

	// Handler para drop de arquivos
	async function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragActive = false;

		const files = Array.from(event.dataTransfer?.files || []);
		const imageFiles = files.filter(file => file.type.startsWith('image/'));

		if (imageFiles.length > 0) {
			await processFiles(imageFiles);
		}
	}

	// Handler para seleção de arquivos
	async function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = Array.from(target.files || []);
		
		if (files.length > 0) {
			await processFiles(files);
		}
		
		// Limpar input
		target.value = '';
	}

	// Processar arquivos selecionados
	async function processFiles(files: File[]) {
		uploading = true;
		uploadProgress = 0;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			
			// Atualizar progresso
			uploadProgress = Math.round(((i + 1) / files.length) * 100);

			try {
				const imageUrl = await uploadImage(file);
				
				// Adicionar à lista de imagens
				const newImage = {
					id: Date.now() + i,
					url: imageUrl,
					alt: '',
					title: file.name.replace(/\.[^/.]+$/, ''),
					isPrimary: formData.images.length === 0, // Primeira imagem é principal
					size: file.size,
					type: file.type
				};

				formData.images = [...formData.images, newImage];
			} catch (error) {
				console.error('Erro ao fazer upload:', error);
			}
		}

		uploading = false;
		uploadProgress = 0;
	}

	// Definir imagem principal
	function setPrimaryImage(imageId: number) {
		formData.images = formData.images.map((img: any) => ({
			...img,
			isPrimary: img.id === imageId
		}));
	}

	// Remover imagem
	function removeImage(imageId: number) {
		formData.images = formData.images.filter((img: any) => img.id !== imageId);
		
		// Se removeu a imagem principal e ainda há imagens, definir a primeira como principal
		if (formData.images.length > 0 && !formData.images.some((img: any) => img.isPrimary)) {
			formData.images[0].isPrimary = true;
		}
	}

	// Função para editar imagem (placeholder)
	function editImage(index: number) {
		console.log('Editar imagem:', index);
	}

	// Handlers para drag and drop
	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		dragActive = false;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	// Formatação de tamanho de arquivo
	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<div class="space-y-8">
	<div class="mb-6">
		<h3 class="text-xl font-semibold text-slate-900 mb-2">Galeria de Imagens</h3>
		<p class="text-slate-600">Upload e gestão de imagens do produto</p>
	</div>

	<!-- UPLOAD DE IMAGENS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			🖼️ Upload de Imagens
		</h4>

		<!-- Área de Drop -->
		<div
			class="border-2 border-dashed rounded-lg p-8 text-center transition-all {dragActive ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-300'}"
			on:dragover|preventDefault={() => dragActive = true}
			on:dragleave|preventDefault={() => dragActive = false}
			on:drop|preventDefault={handleDrop}
		>
			<div class="space-y-4">
				<div class="text-4xl text-gray-400 mb-2">📤</div>
				<div>
					<p class="text-lg font-medium text-gray-900 mb-2">
						{dragActive ? 'Solte as imagens aqui' : 'Arraste imagens aqui'}
					</p>
					<p class="text-gray-600 mb-4">ou</p>
					<label class="inline-flex items-center px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg cursor-pointer transition-colors">
						📎 Selecionar Arquivos
						<input
							type="file"
							multiple
							accept="image/*"
							on:change={handleFileSelect}
							class="hidden"
						/>
					</label>
				</div>
				<p class="text-xs text-gray-500">
					Formatos aceitos: JPG, PNG, WebP • Máximo: 10MB por imagem
				</p>
			</div>
		</div>

		<!-- Progress de Upload -->
		{#if uploadProgress > 0 && uploadProgress < 100}
			<div class="mt-4">
				<div class="flex justify-between text-sm text-gray-600 mb-2">
					<span>Enviando imagens...</span>
					<span>{uploadProgress}%</span>
				</div>
				<div class="w-full bg-gray-200 rounded-full h-2">
					<div 
						class="bg-[#00BFB3] h-2 rounded-full transition-all duration-300"
						style="width: {uploadProgress}%"
					></div>
				</div>
			</div>
		{/if}
	</div>

	<!-- GALERIA DE IMAGENS -->
	{#if formData.images && formData.images.length > 0}
		<div class="bg-white border border-gray-200 rounded-lg p-6">
			<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
				🎨 Galeria de Imagens ({formData.images.length})
			</h4>

			<!-- Grid de Imagens -->
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{#each formData.images as image, index}
					<div class="relative group bg-white rounded-lg border border-gray-200 overflow-hidden">
						<!-- Imagem -->
						<div class="aspect-square bg-gray-100">
							<img
								src={image.url || image.preview}
								alt={image.alt || `Imagem ${index + 1}`}
								class="w-full h-full object-cover"
								loading="lazy"
							/>
						</div>

						<!-- Badge de Imagem Principal -->
						{#if image.isPrimary}
							<div class="absolute top-2 left-2">
								<span class="inline-flex items-center px-2 py-1 bg-[#00BFB3] text-white text-xs font-medium rounded">
									⭐ Principal
								</span>
							</div>
						{/if}

						<!-- Overlay de Ações -->
						<div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
							<div class="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
								<!-- Definir como Principal -->
								{#if !image.isPrimary}
									<button
										type="button"
										on:click={() => setPrimaryImage(image.id)}
										class="p-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
										title="Definir como imagem principal"
									>
										⭐
									</button>
								{/if}

								<!-- Editar Imagem -->
								<button
									type="button"
									on:click={() => editImage(index)}
									class="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
									title="Editar imagem"
								>
									✏️
								</button>

								<!-- Remover Imagem -->
								<button
									type="button"
									on:click={() => removeImage(image.id)}
									class="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
									title="Remover imagem"
								>
									🗑️
								</button>
							</div>
						</div>

						<!-- Informações da Imagem -->
						<div class="p-3 bg-white">
							<p class="text-xs text-gray-600 truncate">{image.title || `imagem-${index + 1}.jpg`}</p>
							<p class="text-xs text-gray-500">{formatFileSize(image.size) || 'Tamanho desconhecido'}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<!-- Estado sem imagens -->
		<div class="text-center py-12 bg-gray-50 rounded-lg">
			<div class="text-4xl text-gray-300 mb-4">🖼️</div>
			<h4 class="text-lg font-semibold text-gray-900 mb-2">Nenhuma imagem adicionada</h4>
			<p class="text-gray-600 mb-4">Adicione imagens para que os clientes vejam seu produto</p>
			<p class="text-sm text-gray-500">Recomendamos pelo menos 3 imagens de diferentes ângulos</p>
		</div>
	{/if}

	<!-- CONFIGURAÇÕES DE IMAGEM -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			⚙️ Configurações de Exibição
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="space-y-4">
				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.enable_zoom}
							class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900">🔍 Habilitar Zoom</span>
							<p class="text-xs text-gray-600">Permite ampliar imagens ao passar o mouse</p>
						</div>
					</label>
				</div>

				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.enable_lightbox}
							class="w-5 h-5 rounded border-gray-300 text-[#00BFB3] focus:ring-[#00BFB3]"
						/>
						<div>
							<span class="text-sm font-medium text-gray-900">💡 Habilitar Lightbox</span>
							<p class="text-xs text-gray-600">Abre imagens em tela cheia ao clicar</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Qualidade e Otimização -->
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-2">
						📐 Redimensionamento Automático
					</label>
					<select
						bind:value={formData.image_resize_mode}
						class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
					>
						<option value="auto">Automático (recomendado)</option>
						<option value="crop">Cortar para ajustar</option>
						<option value="fit">Ajustar mantendo proporção</option>
						<option value="original">Manter tamanho original</option>
					</select>
				</div>
			</div>
		</div>
	</div>
</div> 