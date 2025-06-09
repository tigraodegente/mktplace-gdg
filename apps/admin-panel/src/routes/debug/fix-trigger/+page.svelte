<script lang="ts">
  let { data } = $props();
</script>

<div class="p-8">
  <h1>Correção do Trigger</h1>
  
  {#if data.success}
    <div>
      <h2>✅ Sucesso!</h2>
      <p>{data.message}</p>
    </div>
    
    {#if data.trigger}
      <div>
        <h3>Trigger Verificado:</h3>
        <pre>{JSON.stringify(data.trigger, null, 2)}</pre>
      </div>
    {/if}
  {:else}
    <div>
      <h2>❌ Erro!</h2>
      <p>{data.error}</p>
    </div>
  {/if}
  
  <div>
    <a href="/produtos">Voltar aos Produtos</a>
  </div>
</div> 