# Componentes de Navegação

Este diretório contém os componentes de navegação do marketplace, organizados seguindo as melhores práticas de desenvolvimento.

## Estrutura

```
navigation/
├── DesktopCategoryMenu.svelte  # Menu de categorias para desktop com mega menu
├── MobileCategoryMenu.svelte   # Menu lateral para mobile
└── README.md                   # Esta documentação
```

## Arquitetura

### Serviço Compartilhado

Os componentes utilizam o `categoryService` (`/lib/services/categoryService.ts`) que:
- Centraliza a lógica de busca de categorias
- Implementa cache de 5 minutos para otimizar performance
- Define tipos TypeScript compartilhados
- Fornece ícones padrão para categorias

### Componentes

#### DesktopCategoryMenu.svelte
- Menu horizontal com mega menu ao hover
- Delay de 100ms para abrir e 200ms para fechar
- Suporte a navegação por teclado (ESC para fechar)
- Layout em 4 colunas no mega menu:
  - 2 colunas para subcategorias
  - 1 coluna para destaques
  - 1 coluna para banner promocional

#### MobileCategoryMenu.svelte
- Menu lateral slide-in (85% largura, máx 320px)
- Categorias expansíveis com animação
- Integração com autenticação
- Seções organizadas:
  - Categorias
  - Links rápidos
  - Minha conta (quando autenticado)
  - Ajuda

## Uso

```svelte
<!-- Desktop -->
<DesktopCategoryMenu />

<!-- Mobile -->
<MobileCategoryMenu bind:isOpen={menuOpen} onClose={() => menuOpen = false} />
```

## API de Dados

Os componentes consomem a API `/api/categories` que retorna:

```typescript
{
  success: boolean,
  data: {
    categories: Category[],
    total: number
  }
}
```

## Performance

- Cache de categorias por 5 minutos
- Lazy loading de subcategorias no mobile
- Transições otimizadas com CSS
- Prevenção de scroll no body quando menu mobile está aberto

## Acessibilidade

- Suporte completo a navegação por teclado
- ARIA labels apropriados
- Roles semânticos
- Indicadores visuais de foco

## Manutenção

Para adicionar novos ícones de categoria:
1. Editar `categoryService.ts`
2. Adicionar o ícone SVG no método `getDefaultIcon`
3. Usar o slug da categoria como chave 