					{#if variant === 'primary'}
						class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg font-medium transition-colors"
					{:else if variant === 'success'}
						class="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
					{:else if variant === 'danger'}
						class="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
					{:else}
						class="px-6 py-3 bg-[#00BFB3] hover:bg-[#00A89D] text-white rounded-lg font-medium transition-colors"
					{/if} 