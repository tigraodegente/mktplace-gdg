<script lang="ts">
	import ModernIcon from '$lib/components/shared/ModernIcon.svelte';
	import ConfirmDialog from '$lib/components/ui/ConfirmDialog.svelte';
	import { toast } from '$lib/stores/toast';
	
	let { formData = $bindable(), productId = '' } = $props();
	
	// Inicializar arrays se não existirem
	if (!formData.images) formData.images = [];
	if (!formData.videos) formData.videos = [];
	
	// Estados locais
	let uploading = $state(false);
	let uploadingVideo = $state(false);
	let dragOver = $state(false);
	let dragOverVideo = $state(false);
	let removing = $state(false);
	let newVideoInput: HTMLInputElement;
	
	// Estados do modal de confirmação
	let showConfirmDialog = $state(false);
	let confirmDialogConfig = $state({
		title: '',
		message: '',
		onConfirm: () => {}
	});
	
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
					if (data.success && data.url) {
						formData.images = [...formData.images, data.url];
						// Salvar automaticamente no banco após upload
						await saveToDatabase();
					} else {
						alert(`Erro no upload: ${data.error || 'Resposta inválida'}`);
					}
				} else {
					const errorData = await response.json().catch(() => ({}));
					alert(`Erro ao fazer upload da imagem: ${errorData.error || 'Erro desconhecido'}`);
				}
			}
		} catch (error) {
			console.error('Erro no upload:', error);
			alert('Erro ao fazer upload das imagens');
		} finally {
			uploading = false;
		}
	}
	
	// Upload de vídeo
	async function handleVideoUpload(files: FileList | null) {
		if (!files || files.length === 0) return;
		
		uploadingVideo = true;
		try {
			for (const file of files) {
				if (!file.type.startsWith('video/')) {
					alert('Por favor, selecione apenas vídeos');
					continue;
				}
				
				// Verificar tamanho (máximo 50MB)
				if (file.size > 50 * 1024 * 1024) {
					alert('Vídeo muito grande. Máximo 50MB');
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
					if (data.success && data.url) {
						formData.videos = [...formData.videos, data.url];
						// Salvar automaticamente no banco após upload
						await saveToDatabase();
					} else {
						alert(`Erro no upload: ${data.error || 'Resposta inválida'}`);
					}
				} else {
					const errorData = await response.json().catch(() => ({}));
					alert(`Erro ao fazer upload do vídeo: ${errorData.error || 'Erro desconhecido'}`);
				}
			}
		} catch (error) {
			console.error('Erro no upload:', error);
			alert('Erro ao fazer upload dos vídeos');
		} finally {
			uploadingVideo = false;
		}
	}
	
	// Salvar alterações no banco
	async function saveToDatabase(customImages?: string[], customVideos?: string[]) {
		if (!productId) {
			console.warn('Produto ainda não foi salvo, não é possível atualizar mídia');
			return false;
		}
		
		try {
			const response = await fetch(`/api/products/${productId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: formData.name || 'Produto sem nome',
					sku: formData.sku || 'SKU-' + Date.now(),
					price: formData.price || 0,
					images: customImages || formData.images,
					videos: customVideos || formData.videos
				})
			});
			
			if (!response.ok) {
				throw new Error('Erro ao salvar no banco');
			}
			
			const result = await response.json();
			if (!result.success) {
				throw new Error(result.error || 'Erro na resposta da API');
			}
			
			return true;
		} catch (error) {
			console.error('Erro ao salvar no banco:', error);
			toast.error('Erro ao atualizar no banco de dados');
			return false;
		}
	}
	
	// Confirmar remoção de imagem
	function confirmRemoveImage(index: number) {
		confirmDialogConfig = {
			title: 'Remover Imagem',
			message: `Tem certeza que deseja remover esta imagem? Esta ação não pode ser desfeita e será excluída do banco de dados.`,
			onConfirm: async () => {
				removing = true;
				try {
					// Criar cópia temporária sem a imagem
					const newImages = formData.images.filter((_: any, i: number) => i !== index);
					
					// Tentar salvar no banco primeiro
					const success = await saveToDatabase(newImages);
					if (success) {
						// Só atualiza a interface se salvou com sucesso
						formData.images = newImages;
						toast.success('Imagem removida com sucesso!');
					}
				} catch (error) {
					console.error('Erro ao remover imagem:', error);
					toast.error('Erro ao remover imagem');
				} finally {
					removing = false;
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Confirmar remoção de vídeo
	function confirmRemoveVideo(index: number) {
		confirmDialogConfig = {
			title: 'Remover Vídeo',
			message: `Tem certeza que deseja remover este vídeo? Esta ação não pode ser desfeita e será excluído do banco de dados.`,
			onConfirm: async () => {
				removing = true;
				try {
					// Criar cópia temporária sem o vídeo
					const newVideos = formData.videos.filter((_: any, i: number) => i !== index);
					
					// Tentar salvar no banco primeiro
					const success = await saveToDatabase(undefined, newVideos);
					if (success) {
						// Só atualiza a interface se salvou com sucesso
						formData.videos = newVideos;
						toast.success('Vídeo removido com sucesso!');
					}
				} catch (error) {
					console.error('Erro ao remover vídeo:', error);
					toast.error('Erro ao remover vídeo');
				} finally {
					removing = false;
				}
			}
		};
		showConfirmDialog = true;
	}
	
	// Definir imagem principal (primeira do array)
	function setMainImage(index: number) {
		if (index === 0) return;
		const image = formData.images[index];
		formData.images.splice(index, 1);
		formData.images.unshift(image);
		formData.images = [...formData.images];
		// Salvar automaticamente no banco após reordenação
		saveToDatabase();
	}
	
	// Reordenar imagens
	function moveImage(from: number, to: number) {
		const newImages = [...formData.images];
		const [removed] = newImages.splice(from, 1);
		newImages.splice(to, 0, removed);
		formData.images = newImages;
		// Salvar automaticamente no banco após reordenação
		saveToDatabase();
	}
	
	// Drag and Drop para imagens
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
	
	// Drag and Drop para vídeos
	function handleDragOverVideo(e: DragEvent) {
		e.preventDefault();
		dragOverVideo = true;
	}
	
	function handleDragLeaveVideo(e: DragEvent) {
		e.preventDefault();
		dragOverVideo = false;
	}
	
	function handleDropVideo(e: DragEvent) {
		e.preventDefault();
		dragOverVideo = false;
		
		const files = e.dataTransfer?.files;
		if (files) {
			handleVideoUpload(files);
		}
	}
</script>

<!-- Modal de Confirmação -->
<ConfirmDialog
	show={showConfirmDialog}
	title={confirmDialogConfig.title}
	message={confirmDialogConfig.message}
	variant="danger"
	confirmText="Remover"
	cancelText="Cancelar"
	onConfirm={confirmDialogConfig.onConfirm}
	onCancel={() => showConfirmDialog = false}
/>

<div class="space-y-8">
	<!-- UPLOAD DE IMAGENS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="image" size="md" /> Imagens do Produto
		</h4>
		
		<!-- Área de Upload -->
		<div
			role="button"
			tabindex="0"
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			class="border-2 border-dashed rounded-lg p-8 text-center transition-all {dragOver ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-300'}"
		>
			<div class="text-4xl text-gray-400 mb-2"><ModernIcon name="Upload" size="lg" /></div>
			<p class="text-sm text-gray-600 mb-2">
				Arraste imagens aqui ou
			</p>
			<label class="inline-block">
				<input
					type="file"
					multiple
					accept="image/*"
					onchange={(e: Event) => handleImageUpload((e.target as HTMLInputElement).files)}
					disabled={uploading}
					class="hidden"
				/>
				<span class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg cursor-pointer inline-flex items-center gap-2 transition-colors">
					{#if uploading}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Enviando...
					{:else}
						<ModernIcon name="Plus" size="sm" /> Selecionar Imagens
					{/if}
				</span>
			</label>
			<p class="text-xs text-gray-500 mt-2">
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
							<img
								src={image}
								alt="Imagem {index + 1}"
								class="w-full aspect-square object-cover rounded-lg border-2 {index === 0 ? 'border-[#00BFB3]' : 'border-gray-200'}"
							/>
							
							{#if index === 0}
								<span class="absolute top-2 left-2 px-2 py-1 bg-[#00BFB3] text-white text-xs rounded">
									Principal
								</span>
							{/if}
							
							<div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
								{#if index !== 0}
									<button
										type="button"
										onclick={() => setMainImage(index)}
										class="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors relative group/tooltip"
										title="Definir como imagem principal"
									>
										<ModernIcon name="star" size="sm" />
										<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
											Tornar principal
										</div>
									</button>
								{/if}
								
								{#if index > 0}
									<button
										type="button"
										onclick={() => moveImage(index, index - 1)}
										class="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors relative group/tooltip"
										title="Mover para esquerda"
									>
										<ModernIcon name="ChevronLeft" size="sm" />
										<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
											Mover ←
										</div>
									</button>
								{/if}
								
								{#if index < formData.images.length - 1}
									<button
										type="button"
										onclick={() => moveImage(index, index + 1)}
										class="p-2 bg-white text-gray-700 rounded-lg hover:bg-gray-100 transition-colors relative group/tooltip"
										title="Mover para direita"
									>
										<ModernIcon name="ChevronRight" size="sm" />
										<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
											Mover →
										</div>
									</button>
								{/if}
								
								<button
									type="button"
									onclick={() => confirmRemoveImage(index)}
									class="p-2 bg-white text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors relative group/tooltip"
									title="Remover imagem"
								>
									<ModernIcon name="delete" size="sm" />
									<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
										Excluir imagem
									</div>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mt-6 text-center py-8 bg-gray-50 rounded-lg">
				<div class="text-4xl text-gray-300 mb-2"><ModernIcon name="image" size="lg" /></div>
				<p class="text-gray-500">Nenhuma imagem adicionada</p>
			</div>
		{/if}
		
		<!-- Dicas -->
		<div class="mt-6 p-4 bg-gray-50 rounded-lg">
			<h5 class="font-medium text-gray-900 mb-2 flex items-center gap-2">
				<ModernIcon name="info" size="md" /> Dicas para melhores resultados
			</h5>
			<ul class="text-sm text-gray-600 space-y-1">
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
			<ModernIcon name="url" size="md" /> Adicionar por URL
		</h4>
		
		<div class="flex gap-2">
			<input
				type="url"
				placeholder="https://exemplo.com/imagem.jpg"
				onkeydown={(e: KeyboardEvent) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						const input = e.currentTarget as HTMLInputElement;
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
				onclick={(e: Event) => {
					const button = e.currentTarget as HTMLButtonElement;
					const input = button.previousElementSibling as HTMLInputElement;
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
	
	<!-- UPLOAD DE VÍDEOS -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			<ModernIcon name="image" size="md" /> Vídeos do Produto
		</h4>
		
		<!-- Área de Upload de Vídeo -->
		<div
			role="button"
			tabindex="0"
			ondragover={handleDragOverVideo}
			ondragleave={handleDragLeaveVideo}
			ondrop={handleDropVideo}
			class="border-2 border-dashed rounded-lg p-8 text-center transition-all {dragOverVideo ? 'border-[#00BFB3] bg-[#00BFB3]/5' : 'border-gray-300'}"
		>
			<div class="text-4xl text-gray-400 mb-2"><ModernIcon name="Upload" size="lg" /></div>
			<p class="text-sm text-gray-600 mb-2">
				Arraste vídeos aqui ou
			</p>
			<label class="inline-block">
				<input
					type="file"
					multiple
					accept="video/*"
					onchange={(e: Event) => handleVideoUpload((e.target as HTMLInputElement).files)}
					disabled={uploadingVideo}
					class="hidden"
				/>
				<span class="px-4 py-2 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg cursor-pointer inline-flex items-center gap-2 transition-colors">
					{#if uploadingVideo}
						<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
						Enviando...
					{:else}
						<ModernIcon name="Plus" size="sm" /> Selecionar Vídeos
					{/if}
				</span>
			</label>
			<p class="text-xs text-gray-500 mt-2">
				MP4, WebM, MOV. Máximo 50MB por vídeo.
			</p>
		</div>
		
		<!-- Galeria de Vídeos -->
		{#if formData.videos && formData.videos.length > 0}
			<div class="mt-6">
				<h5 class="text-sm font-medium text-gray-700 mb-3">
					Vídeos Adicionados ({formData.videos.length})
				</h5>
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{#each formData.videos as video, index}
						<div class="relative group">
							<video
								src={video}
								class="w-full aspect-video object-cover rounded-lg border-2 border-gray-200"
								controls
								preload="metadata"
							>
								<track kind="captions" />
							</video>
							
							<div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
								<button
									type="button"
									onclick={() => confirmRemoveVideo(index)}
									class="p-2 bg-white text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors relative group/tooltip"
									title="Remover vídeo"
								>
									<ModernIcon name="delete" size="sm" />
									<div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
										Excluir vídeo
									</div>
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mt-6 text-center py-8 bg-gray-50 rounded-lg">
				<div class="text-4xl text-gray-300 mb-2"><ModernIcon name="image" size="lg" /></div>
				<p class="text-gray-500">Nenhum vídeo adicionado</p>
			</div>
		{/if}
		
		<!-- URLs Externas para Vídeos -->
		<div class="mt-6 border-t pt-6">
			<h5 class="font-medium text-gray-900 mb-3 flex items-center gap-2">
				<ModernIcon name="url" size="sm" /> Adicionar Vídeo por URL
			</h5>
			<div class="flex gap-2">
				<input
					type="url"
					placeholder="https://exemplo.com/video.mp4"
					onkeydown={(e: KeyboardEvent) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							const input = e.currentTarget as HTMLInputElement;
							if (input.value.trim()) {
								if (!formData.videos) formData.videos = [];
								formData.videos = [...formData.videos, input.value.trim()];
								input.value = '';
							}
						}
					}}
					class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-[#00BFB3] transition-colors"
				/>
				<button
					type="button"
					onclick={(e: Event) => {
						const button = e.currentTarget as HTMLButtonElement;
						const input = button.previousElementSibling as HTMLInputElement;
						if (input.value.trim()) {
							if (!formData.videos) formData.videos = [];
							formData.videos = [...formData.videos, input.value.trim()];
							input.value = '';
						}
					}}
					class="px-4 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
				>
					Adicionar
				</button>
			</div>
			<p class="text-xs text-gray-500 mt-2">
				Cole a URL direta do vídeo (MP4, WebM, MOV)
			</p>
		</div>
	</div>

	<!-- VÍDEOS DO PRODUTO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			🎬 Vídeos do Produto
		</h4>
		
		<div class="space-y-4">
			<!-- Lista de Vídeos -->
			{#if formData.videos && Array.isArray(formData.videos) && formData.videos.length > 0}
				<div class="space-y-3">
					{#each formData.videos as video, index}
						<div class="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
							<div class="flex-1">
								<input
									type="url"
									bind:value={formData.videos[index]}
									class="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent text-sm"
									placeholder="https://www.youtube.com/watch?v=..."
								/>
							</div>
							<button
								type="button"
								onclick={() => {
									formData.videos = formData.videos.filter((_, i) => i !== index);
								}}
								class="px-3 py-2 text-red-600 hover:bg-red-50 rounded transition-colors"
							>
								🗑️
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
					<p class="text-gray-500 mb-2">🎬 Nenhum vídeo adicionado</p>
					<p class="text-sm text-gray-400">Adicione URLs de vídeos do YouTube, Vimeo ou outros</p>
				</div>
			{/if}

			<!-- Adicionar Novo Vídeo -->
			<div class="flex gap-3">
				<input
					type="url"
					bind:this={newVideoInput}
					class="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
					placeholder="Cole a URL do vídeo (YouTube, Vimeo, etc.)"
				/>
				<button
					type="button"
					onclick={() => {
						const input = newVideoInput;
						if (input?.value?.trim()) {
							if (!Array.isArray(formData.videos)) {
								formData.videos = [];
							}
							formData.videos = [...formData.videos, input.value.trim()];
							input.value = '';
						}
					}}
					class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors"
				>
					➕ Adicionar
				</button>
			</div>

			<div class="text-xs text-gray-500 space-y-1">
				<p>💡 <strong>Suportado:</strong> YouTube, Vimeo, MP4 direto</p>
				<p>📱 <strong>Exemplo:</strong> https://www.youtube.com/watch?v=dQw4w9WgXcQ</p>
			</div>
		</div>
	</div>

	<!-- LINKS E DOCUMENTAÇÃO -->
	<div class="bg-white border border-gray-200 rounded-lg p-6">
		<h4 class="font-semibold text-gray-900 mb-4 flex items-center gap-2">
			📖 Documentação e Links
		</h4>
		
		<div class="space-y-6">
			<!-- Link do Manual -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-2">
					📖 Link do Manual/Documentação
					<span class="text-xs text-gray-500 ml-2">PDF, site ou página de instruções</span>
				</label>
				<input
					type="url"
					bind:value={formData.manual_link}
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00BFB3] focus:border-transparent"
					placeholder="https://exemplo.com/manual.pdf"
				/>
				<p class="text-xs text-gray-500 mt-1">
					Link para manual de instruções, guia de uso ou documentação técnica
				</p>
			</div>
		</div>
	</div>
</div>

 