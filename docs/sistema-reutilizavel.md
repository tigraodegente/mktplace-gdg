# Sistema de Componentes Reutilizáveis - Admin Panel

## Visão Geral

Este sistema foi criado para permitir a reutilização total de componentes, estilos e funcionalidades entre diferentes páginas do admin panel. Todos os componentes seguem o padrão visual do Store e usam exclusivamente variações da cor verde principal `#00BFB3`.

## Componentes Criados

### 1. TabsForm.svelte - Formulário com Abas Reutilizável

**Localização:** `src/lib/components/shared/TabsForm.svelte`

**Propósito:** Componente principal que gerencia um formulário com sistema de abas navegáveis.

**Props:**
- `title`: Título da página
- `subtitle`: Subtítulo explicativo
- `tabs`: Array de configuração das abas
- `formData`: Dados do formulário
- `loading`: Estado de carregamento
- `saving`: Estado de salvamento
- `isEditing`: Se está editando um item existente
- `requiredFields`: Campos obrigatórios para validação
- `onSave`: Função chamada ao salvar
- `onCancel`: Função chamada ao cancelar

**Exemplo de uso:**
```svelte
<TabsForm
  title="Nova Categoria"
  subtitle="Crie uma nova categoria"
  {tabs}
  {formData}
  {loading}
  {saving}
  requiredFields={['name', 'slug']}
  onSave={handleSave}
  onCancel={handleCancel}
  customSlot={true}
>
  <div slot="tab-content" let:activeTab let:formData>
    {#if activeTab === 'basic'}
      <!-- Conteúdo da aba básica -->
    {/if}
  </div>
</TabsForm>
```

### 2. FormContainer.svelte - Container/Grid Reutilizável

**Localização:** `src/lib/components/shared/FormContainer.svelte`

**Propósito:** Container para agrupar campos de formulário com título, ícone e grid responsivo.

**Props:**
- `title`: Título da seção
- `subtitle`: Subtítulo explicativo
- `icon`: SVG path do ícone
- `variant`: Variação de cor ('primary' | 'secondary' | 'tertiary' | 'quaternary' | 'quinary')
- `columns`: Número de colunas (1 | 2 | 3 | 4 | 6)
- `gap`: Espaçamento entre elementos
- `padding`: Padding interno

**Variações de cores (todas baseadas em #00BFB3):**
- `primary`: `from-[#00BFB3]/10 to-[#00BFB3]/5`
- `secondary`: `from-[#00BFB3]/8 to-[#00BFB3]/12`
- `tertiary`: `from-[#00BFB3]/6 to-[#00BFB3]/10`
- `quaternary`: `from-[#00BFB3]/4 to-[#00BFB3]/8`
- `quinary`: `from-[#00BFB3]/3 to-[#00BFB3]/6`

**Exemplo de uso:**
```svelte
<FormContainer 
  title="Informações Essenciais"
  subtitle="Dados fundamentais"
  icon="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
  variant="primary"
  columns={2}
>
  <!-- Campos de formulário aqui -->
</FormContainer>
```

### 3. FormField.svelte - Campo de Formulário Universal

**Localização:** `src/lib/components/shared/FormField.svelte`

**Propósito:** Campo de formulário universal que suporta todos os tipos de input com padrão visual consistente.

**Tipos suportados:**
- `text`, `email`, `password`, `number`, `tel`, `url`, `date`, `datetime-local`
- `textarea`, `select`, `checkbox`, `radio`, `file`

**Props principais:**
- `type`: Tipo do campo
- `label`: Rótulo do campo
- `value`: Valor do campo (bind:value)
- `placeholder`: Placeholder
- `required`: Se é obrigatório
- `options`: Opções para select/radio
- `helpText`: Texto de ajuda
- `error`: Mensagem de erro
- `characterCount`: Mostrar contador de caracteres

**Exemplo de uso:**
```svelte
<FormField
  type="text"
  label="📁 Nome da Categoria"
  bind:value={formData.name}
  placeholder="Nome atrativo"
  required={true}
  helpText="Nome que será exibido na navegação"
/>

<FormField
  type="select"
  label="Categoria Pai"
  bind:value={formData.parent_id}
  options={parentCategories}
  placeholder="Selecione..."
/>

<FormField
  type="checkbox"
  bind:value={formData.is_active}
  placeholder="✅ Categoria Ativa"
/>
```

## Padrão de Cores

**IMPORTANTE:** Todos os componentes usam EXCLUSIVAMENTE variações da cor verde principal:

- **Verde Principal:** `#00BFB3`
- **Hover/Focus:** `#00A89D`
- **Secundário:** `#009688`

**Nunca use outras cores como:**
- ❌ `blue-500`, `purple-600`, `indigo-500`
- ❌ `emerald-500`, `green-500`
- ✅ `[#00BFB3]`, `[#00A89D]`, `[#009688]`

## Como Criar uma Nova Página

### 1. Defina a Estrutura das Abas

```typescript
const tabs = [
  {
    id: 'basic',
    name: 'Básico',
    icon: '📁',
    description: 'Informações essenciais'
  },
  {
    id: 'seo',
    name: 'SEO',
    icon: '🔍',
    description: 'Otimização para buscas'
  }
];
```

### 2. Configure os Dados do Formulário

```typescript
let formData = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
  // ... outros campos
};
```

### 3. Use o TabsForm como Container

```svelte
<TabsForm
  title="Nova [Entidade]"
  subtitle="Descrição da página"
  {tabs}
  {formData}
  requiredFields={['name']}
  onSave={handleSave}
  onCancel={handleCancel}
  customSlot={true}
>
  <div slot="tab-content" let:activeTab let:formData>
    <!-- Conteúdo das abas -->
  </div>
</TabsForm>
```

### 4. Organize Campos em Containers

```svelte
{#if activeTab === 'basic'}
  <div class="space-y-8">
    <FormContainer 
      title="Seção 1"
      variant="primary"
      columns={2}
    >
      <FormField type="text" label="Campo 1" bind:value={formData.field1} />
      <FormField type="text" label="Campo 2" bind:value={formData.field2} />
    </FormContainer>

    <FormContainer 
      title="Seção 2"
      variant="secondary"
      columns={3}
    >
      <FormField type="checkbox" bind:value={formData.active} />
      <!-- ... mais campos -->
    </FormContainer>
  </div>
{/if}
```

## Exemplos Práticos

### Página de Categoria
Ver: `src/routes/exemplo-categoria/+page.svelte`

### Página de Usuário (exemplo)
```svelte
const tabs = [
  { id: 'basic', name: 'Básico', icon: '👤', description: 'Dados pessoais' },
  { id: 'permissions', name: 'Permissões', icon: '🔐', description: 'Controle de acesso' }
];

let formData = {
  name: '',
  email: '',
  role: '',
  is_active: true
};
```

### Página de Cupom (exemplo)
```svelte
const tabs = [
  { id: 'basic', name: 'Básico', icon: '🎫', description: 'Dados do cupom' },
  { id: 'rules', name: 'Regras', icon: '📋', description: 'Condições de uso' }
];
```

## Vantagens do Sistema

### ✅ Reutilização Total
- Mesmo código serve para qualquer entidade
- Apenas muda os campos e configurações

### ✅ Consistência Visual
- Todos os formulários têm a mesma aparência
- Cores padronizadas em verde #00BFB3

### ✅ Manutenibilidade
- Mudança em um componente reflete em todos
- Código muito mais limpo e organizador

### ✅ Produtividade
- Criar nova página leva minutos, não horas
- Foco no negócio, não na interface

### ✅ Responsividade
- Grid automático e responsivo
- Mobile-first por padrão

## Checklist para Nova Página

- [ ] Definir estrutura das abas
- [ ] Configurar formData com todos os campos
- [ ] Usar TabsForm como container principal
- [ ] Organizar campos em FormContainers
- [ ] Usar FormField para todos os inputs
- [ ] Verificar se todas as cores são variações de #00BFB3
- [ ] Testar responsividade
- [ ] Implementar validação
- [ ] Configurar função de save

## Migração de Páginas Existentes

Para migrar uma página existente:

1. **Identifique as seções** → Vire FormContainers
2. **Identifique os campos** → Vire FormFields
3. **Reorganize em abas** → Use TabsForm
4. **Padronize as cores** → Apenas variações de #00BFB3
5. **Teste a funcionalidade** → Garanta que tudo funciona

## Suporte

Este sistema está documentado e pronto para uso. Para dúvidas:

1. Veja os exemplos em `src/routes/exemplo-categoria/`
2. Consulte os componentes em `src/lib/components/shared/`
3. Siga sempre o padrão de cores verde #00BFB3 