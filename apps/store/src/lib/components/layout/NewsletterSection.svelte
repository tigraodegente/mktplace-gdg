<script lang="ts">
  let email = '';
  let isSubmitting = false;
  let message = '';
  
  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (!email || !email.includes('@')) {
      message = 'Por favor, insira um e-mail válido';
      return;
    }
    
    isSubmitting = true;
    
    try {
      // Simulação de envio - aqui conectaria com API real
      await new Promise(resolve => setTimeout(resolve, 1000));
      message = 'E-mail cadastrado com sucesso!';
      email = '';
    } catch (error) {
      message = 'Erro ao cadastrar e-mail. Tente novamente.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<section class="bg-cyan-500 text-white py-16">
  <div class="container mx-auto px-4 text-center">
    <h2 class="text-3xl md:text-4xl font-bold mb-4">
      📧 Fique por dentro das novidades
    </h2>
    
    <p class="text-lg md:text-xl mb-8 opacity-90 max-w-2xl mx-auto">
      Receba ofertas exclusivas, lançamentos e promoções especiais direto no seu e-mail
    </p>
    
    <form on:submit={handleSubmit} class="max-w-md mx-auto">
      <div class="flex flex-col sm:flex-row gap-4">
        <input 
          type="email" 
          bind:value={email}
          placeholder="Seu melhor e-mail"
          class="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
          required
        />
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          class="px-6 py-3 bg-white text-cyan-600 font-semibold rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Enviando...' : 'Inscrever-se'}
        </button>
      </div>
      
      {#if message}
        <p class="mt-4 text-sm {message.includes('sucesso') ? 'text-green-200' : 'text-red-200'}">
          {message}
        </p>
      {/if}
    </form>
    
    <div class="mt-8 flex justify-center items-center gap-6 text-sm opacity-75">
      <span>✅ Sem spam</span>
      <span>🎁 Ofertas exclusivas</span>
      <span>📱 Cancele quando quiser</span>
    </div>
  </div>
</section> 