		<div class="flex gap-4">
			<button
				onclick={closeModal}
				class="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
			>
				Cancelar
			</button>
			
			<button
				onclick={confirmDuplicate}
				disabled={duplicating}
				class="flex-1 px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
			>
				{#if duplicating}
					<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
				{/if}
				{duplicating ? 'Duplicando...' : 'Confirmar Duplicação'}
			</button>
		</div> 