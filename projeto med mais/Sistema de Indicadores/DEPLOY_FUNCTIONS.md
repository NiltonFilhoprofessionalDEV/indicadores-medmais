# Deploy das Edge Functions (create-user e update-user)

O projeto já tem o Supabase CLI instalado (`npx supabase`). Para publicar as funções no seu projeto Supabase, faça o seguinte **uma vez** e depois use o comando de deploy.

---

## 1. Login no Supabase (uma vez)

No terminal, na pasta do projeto:

```bash
npx supabase login
```

Isso abre o navegador para você fazer login na sua conta Supabase.

---

## 2. Vincular o projeto (uma vez)

Ainda na pasta do projeto:

```bash
npx supabase link
```

Quando pedir:

- **Project ref**: pegue no Dashboard do Supabase → Project Settings → General → **Reference ID** (ex: `eanobeiqmpymrdbvdnnr`).
- **Database password**: é a senha do banco que você definiu ao criar o projeto (não é a senha da sua conta Supabase).

Depois de vincular, o CLI guarda o projeto e não precisa repetir esse passo.

---

## 3. Fazer o deploy

Para publicar as duas funções (create-user e update-user):

```bash
npm run deploy:functions
```

Ou, para publicar uma por vez:

```bash
npm run deploy:create-user
npm run deploy:update-user
```

---

## Resumo dos comandos

| Comando | O que faz |
|--------|-----------|
| `npx supabase login` | Login na conta Supabase (uma vez) |
| `npx supabase link` | Vincula esta pasta ao projeto (uma vez) |
| `npm run deploy:functions` | Publica create-user e update-user |
| `npm run deploy:create-user` | Publica só create-user |
| `npm run deploy:update-user` | Publica só update-user |

Se aparecer **"Cannot find project ref. Have you run supabase link?"**, faça o passo 2 antes de rodar o deploy.
