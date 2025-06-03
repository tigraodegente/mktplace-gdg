<script lang="ts">
	export let formData: any;

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
	<div class="bg-gradient-to-r from-[#00BFB3]/10 to-[#00BFB3]/5 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
			</svg>
			Upload de Imagens
		</h4>

		<!-- Área de Drop -->
		<div
			class="border-2 border-dashed border-[#00BFB3]/30 rounded-xl p-8 text-center bg-[#00BFB3]/5 hover:bg-[#00BFB3]/10 transition-colors {dragActive ? 'border-[#00BFB3] bg-[#00BFB3]/20' : ''}"
			on:dragover|preventDefault={() => dragActive = true}
			on:dragleave|preventDefault={() => dragActive = false}
			on:drop|preventDefault={handleDrop}
		>
			<div class="space-y-4">
				<div class="w-16 h-16 mx-auto text-[#00BFB3]">
					<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
					</svg>
				</div>
				<div>
					<p class="text-lg font-medium text-slate-900 mb-2">
						{dragActive ? 'Solte as imagens aqui' : 'Arraste imagens aqui'}
					</p>
					<p class="text-slate-600 mb-4">ou</p>
					<label class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#00BFB3] to-[#00A89D] hover:from-[#00A89D] hover:to-[#009688] text-white rounded-xl cursor-pointer transition-all">
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
						</svg>
						Selecionar Arquivos
						<input
							type="file"
							multiple
							accept="image/*"
							on:change={handleFileSelect}
							class="hidden"
						/>
					</label>
				</div>
				<p class="text-xs text-slate-500">
					Formatos aceitos: JPG, PNG, WebP • Máximo: 10MB por imagem
				</p>
			</div>
		</div>

		<!-- Progress de Upload -->
		{#if uploadProgress > 0 && uploadProgress < 100}
			<div class="mt-4">
				<div class="flex justify-between text-sm text-slate-600 mb-2">
					<span>Enviando imagens...</span>
					<span>{uploadProgress}%</span>
				</div>
				<div class="w-full bg-slate-200 rounded-full h-2">
					<div 
						class="bg-gradient-to-r from-[#00BFB3] to-[#00A89D] h-2 rounded-full transition-all duration-300"
						style="width: {uploadProgress}%"
					></div>
				</div>
			</div>
		{/if}
	</div>

	<!-- GALERIA DE IMAGENS -->
	{#if formData.images && formData.images.length > 0}
		<div class="bg-gradient-to-r from-[#00BFB3]/8 to-[#00BFB3]/12 border border-[#00BFB3]/25 rounded-xl p-6">
			<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
				<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14-7l2 2m0 0l2 2m-2-2h-6m6 0V2" />
				</svg>
				Galeria de Imagens ({formData.images.length})
			</h4>

			<!-- Grid de Imagens -->
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
				{#each formData.images as image, index}
					<div class="relative group bg-white rounded-lg border border-[#00BFB3]/30 overflow-hidden">
						<!-- Imagem -->
						<div class="aspect-square bg-slate-100">
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
								<span class="inline-flex items-center px-2 py-1 bg-[#00BFB3] text-white text-xs font-medium rounded-full">
									<svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
									</svg>
									Principal
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
										on:click={() => setPrimaryImage(index)}
										class="p-2 bg-[#00BFB3] text-white rounded-lg hover:bg-[#00A89D] transition-colors"
										title="Definir como imagem principal"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
										</svg>
									</button>
								{/if}

								<!-- Editar Imagem -->
								<button
									type="button"
									on:click={() => editImage(index)}
									class="p-2 bg-white text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
									title="Editar imagem"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
									</svg>
								</button>

								<!-- Remover Imagem -->
								<button
									type="button"
									on:click={() => removeImage(index)}
									class="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
									title="Remover imagem"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
									</svg>
								</button>
							</div>
						</div>

						<!-- Informações da Imagem -->
						<div class="p-3 bg-white">
							<p class="text-xs text-slate-600 truncate">{image.name || `imagem-${index + 1}.jpg`}</p>
							<p class="text-xs text-slate-500">{image.size || 'Tamanho desconhecido'}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<!-- Estado sem imagens -->
		<div class="text-center py-12 bg-slate-50 rounded-xl">
			<div class="w-16 h-16 mx-auto mb-4 text-slate-400">
				<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
				</svg>
			</div>
			<h4 class="text-lg font-semibold text-slate-900 mb-2">Nenhuma imagem adicionada</h4>
			<p class="text-slate-600 mb-4">Adicione imagens para que os clientes vejam seu produto</p>
			<p class="text-sm text-slate-500">Recomendamos pelo menos 3 imagens de diferentes ângulos</p>
		</div>
	{/if}

	<!-- CONFIGURAÇÕES DE IMAGEM -->
	<div class="bg-gradient-to-r from-[#00BFB3]/6 to-[#00BFB3]/10 border border-[#00BFB3]/20 rounded-xl p-6">
		<h4 class="font-semibold text-slate-900 mb-4 flex items-center gap-2">
			<svg class="w-5 h-5 text-[#00BFB3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
			</svg>
			Configurações de Exibição
		</h4>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
			<div class="space-y-4">
				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.enable_zoom}
							class="w-6 h-6 rounded border-slate-300 text-[#00BFB3] shadow-sm focus:border-[#00BFB3] focus:ring focus:ring-[#00BFB3]/20 focus:ring-opacity-50"
						/>
						<div>
							<span class="text-sm font-medium text-slate-900">🔍 Habilitar Zoom</span>
							<p class="text-xs text-slate-600">Permite ampliar imagens ao passar o mouse</p>
						</div>
					</label>
				</div>

				<div class="flex items-center">
					<label class="flex items-center gap-3 cursor-pointer">
						<input
							type="checkbox"
							bind:checked={formData.enable_lightbox}
							class="w-6 h-6 rounded border-slate-300 text-[#00BFB3] shadow-sm focus:border-[#00BFB3] focus:ring focus:ring-[#00BFB3]/20 focus:ring-opacity-50"
						/>
						<div>
							<span class="text-sm font-medium text-slate-900">💡 Habilitar Lightbox</span>
							<p class="text-xs text-slate-600">Abre imagens em tela cheia ao clicar</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Qualidade e Otimização -->
			<div class="space-y-4">
				<div>
					<label class="block text-sm font-medium text-slate-700 mb-2">
						📐 Redimensionamento Automático
					</label>
					<select
						bind:value={formData.image_resize_mode}
						class="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
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