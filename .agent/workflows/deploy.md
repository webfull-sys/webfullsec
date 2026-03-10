---
description: Deploy automático — commita, envia ao GitHub e atualiza o sistema na VPS via Coolify
---

# Deploy Automático (WebfullSec → GitHub → VPS)

Este workflow deve ser executado **sempre que alterações significativas forem feitas** no projeto durante a conversa com o usuário. Ele garante que todas as mudanças sejam enviadas ao repositório GitHub e, consequentemente, ao Coolify (Auto Deploy) na VPS da Contabo.

## Passos

1. Verificar se há alterações pendentes no repositório local:
// turbo
```bash
cd c:\Users\LuizFerreira\Downloads\WebfullSec && git status --short
```

2. Se houver alterações, adicionar todos os arquivos modificados ao staging:
// turbo
```bash
cd c:\Users\LuizFerreira\Downloads\WebfullSec && git add -A
```

3. Criar um commit com uma mensagem descritiva sobre o que foi alterado:
// turbo
```bash
cd c:\Users\LuizFerreira\Downloads\WebfullSec && git commit -m "<mensagem descritiva do que foi alterado>"
```

4. Enviar as alterações para o repositório remoto no GitHub (branch main):
// turbo
```bash
cd c:\Users\LuizFerreira\Downloads\WebfullSec && git push origin main
```

5. Informar ao usuário que o deploy foi disparado e que ele pode acompanhar o progresso no painel do Coolify.

## Observações

- O Coolify deve estar configurado com **Auto Deploy** ativado para detectar novos commits automaticamente.
- Nunca commitar arquivos `.env` com segredos reais (eles já estão no `.gitignore`).
- Sempre usar mensagens de commit descritivas em português.
- Este workflow pode ser invocado com `/deploy`.
