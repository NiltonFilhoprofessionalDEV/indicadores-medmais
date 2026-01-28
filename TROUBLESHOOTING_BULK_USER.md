# Troubleshooting: Cadastro em Lote - Erro "non-2xx status code"

## Problema
Ao tentar cadastrar usuários em lote, todos falham com o erro: "Edge Function returned a non-2xx status code"

## Possíveis Causas e Soluções

### 1. Edge Function não está deployada no Supabase

**Verificar:**
1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Vá em "Edge Functions" no menu lateral
3. Verifique se a função `create-user` está listada e com status "Active"

**Solução:**
Se a função não existir, faça o deploy:
```bash
# No diretório do projeto
cd supabase/functions/create-user
supabase functions deploy create-user
```

### 2. Variáveis de Ambiente não configuradas na Edge Function

**Verificar:**
1. No Dashboard do Supabase, vá em "Edge Functions" > "create-user"
2. Clique em "Settings" ou "Secrets"
3. Verifique se as seguintes variáveis estão configuradas:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

**Solução:**
Configure as variáveis de ambiente:
```bash
supabase secrets set SUPABASE_URL=sua_url
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

Ou configure via Dashboard:
1. Edge Functions > create-user > Settings
2. Adicione as variáveis de ambiente necessárias

### 3. Service Role Key incorreta ou sem permissões

**Verificar:**
- A Service Role Key deve ter permissões de admin para criar usuários
- Verifique se a chave está correta no Dashboard do Supabase (Settings > API > service_role key)

### 4. Problema com CORS ou autenticação

**Verificar:**
- Abra o Console do navegador (F12) e veja os logs detalhados
- Verifique se há erros de CORS ou autenticação

**Solução:**
- A Edge Function já tem headers CORS configurados
- Verifique se o usuário está autenticado ao fazer o cadastro em lote

### 5. Dados inválidos sendo enviados

**Verificar:**
- Abra o Console do navegador (F12) durante o cadastro
- Procure por logs que começam com `[BulkUserForm]`
- Verifique se todos os campos obrigatórios estão preenchidos:
  - Nome completo
  - Email válido
  - Senha (mínimo 6 caracteres)
  - Base e Equipe (se for Chefe de Equipe)

**Solução:**
- O formulário agora valida campos obrigatórios antes de enviar
- Verifique se não há emails duplicados na lista

## Como Debugar

1. **Abra o Console do Navegador (F12)**
2. **Tente cadastrar um usuário em lote**
3. **Procure por logs:**
   - `[BulkUserForm] Criando usuário X/Y:` - Mostra os dados sendo enviados
   - `[BulkUserForm] Resposta para email@exemplo.com:` - Mostra a resposta da Edge Function
4. **Verifique a mensagem de erro específica** na resposta

## Mensagens de Erro Comuns

### "Campos obrigatórios: email, password, nome, role"
- **Causa:** Algum campo obrigatório está vazio
- **Solução:** Preencha todos os campos obrigatórios

### "Chefe de Equipe precisa de base_id e equipe_id"
- **Causa:** Usuário com perfil "Chefe" sem Base ou Equipe selecionada
- **Solução:** Selecione Base e Equipe para todos os Chefes

### "User already registered"
- **Causa:** Email já existe no sistema
- **Solução:** Use um email diferente ou edite o usuário existente

### "Configuração do Supabase não encontrada"
- **Causa:** Variáveis de ambiente não configuradas na Edge Function
- **Solução:** Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY na Edge Function

## Teste Manual da Edge Function

Você pode testar a Edge Function diretamente usando curl ou Postman:

```bash
curl -X POST https://SEU_PROJETO.supabase.co/functions/v1/create-user \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "password": "senha123",
    "nome": "Usuário Teste",
    "role": "chefe",
    "base_id": "uuid-da-base",
    "equipe_id": "uuid-da-equipe"
  }'
```

Substitua:
- `SEU_PROJETO` pelo ID do seu projeto Supabase
- `SUA_ANON_KEY` pela sua chave anon key
- `uuid-da-base` e `uuid-da-equipe` pelos IDs reais

## Próximos Passos

Após aplicar as correções:
1. Faça um novo deploy da Edge Function (se necessário)
2. Teste o cadastro em lote novamente
3. Verifique os logs no console do navegador para mensagens de erro específicas
4. Se o problema persistir, verifique os logs da Edge Function no Dashboard do Supabase
