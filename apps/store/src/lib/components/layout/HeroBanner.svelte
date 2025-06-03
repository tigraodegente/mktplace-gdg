<script lang="ts">
  // Componente básico HeroBanner
</script>

<section class="relative bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
  <div class="container mx-auto px-4 py-16 md:py-24">
    <div class="max-w-3xl">
      <h1 class="text-4xl md:text-6xl font-bold mb-6">
        Bem-vindo ao<br />
        <span class="text-yellow-300">Grão de Gente</span>
      </h1>
      
      <p class="text-xl md:text-2xl mb-8 opacity-90">
        Encontre os melhores produtos com preços incríveis
      </p>
      
      <div class="flex flex-col sm:flex-row gap-4">
        <a 
          href="/busca" 
          class="inline-block px-8 py-4 bg-white text-cyan-600 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-center"
        >
          Explorar Produtos
        </a>
        
        <a 
          href="/ofertas" 
          class="inline-block px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-cyan-600 transition-colors text-center"
        >
          Ver Ofertas
        </a>
      </div>
    </div>
  </div>
  
  <!-- Elemento decorativo -->
  <div class="absolute top-0 right-0 w-1/3 h-full opacity-10">
    <div class="w-full h-full bg-white transform rotate-12 translate-x-1/4"></div>
  </div>
</section> 