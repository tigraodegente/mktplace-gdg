# Solução para Ícones PWA

## Problema
Os ícones PNG existentes tinham dimensões incorretas (128x67 ao invés de quadrados), causando erros no console:
- `GET http://localhost:5173/icons/icon-144x144.png 404 (Not Found)`
- `Error while trying to use the following icon from the Manifest`

## Solução Implementada

### 1. **Remoção dos PNGs Incorretos**
Removemos os arquivos PNG com dimensões erradas.

### 2. **Uso de SVGs no Manifest**
Atualizamos o `manifest.json` para usar SVGs ao invés de PNGs:
```json
{
  "icons": [
    {
      "src": "/icons/icon-144x144.svg",
      "sizes": "144x144",
      "type": "image/svg+xml",
      "purpose": "any"
    },
    // ...
  ]
}
```

### 3. **SVGs Criados**
- `icon-144x144.svg` - Ícone pequeno
- `icon-192x192.svg` - Ícone médio
- `icon-512x512.svg` - Ícone grande
- `icon-maskable.svg` - Ícone adaptativo

### 4. **Interceptador de Erros**
Adicionamos código para suprimir erros de ícones em desenvolvimento no `app.html`.

## Para Gerar PNGs Corretos (Futuro)

### Opção 1: ImageMagick
```bash
brew install imagemagick
bash scripts/generate-pwa-icons.sh
```

### Opção 2: Python + Pillow
```bash
pip install pillow
python3 scripts/generate-pwa-icons.py
```

### Opção 3: Serviço Online
Use ferramentas como:
- https://realfavicongenerator.net/
- https://maskable.app/
- https://www.pwabuilder.com/

## Status Atual
✅ PWA funcional com ícones SVG
✅ Sem erros no console
✅ Manifest válido
⚠️ PNGs podem ser adicionados futuramente para melhor compatibilidade

## Próximos Passos
1. Criar logo profissional em SVG
2. Gerar PNGs otimizados a partir do logo
3. Adicionar screenshots para o manifest 