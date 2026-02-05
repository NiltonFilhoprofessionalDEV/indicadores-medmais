# Diagnóstico: Login do Gerente SCI

## Resumo da Investigação

Foram analisados: Login, AuthContext, ProtectedRoute, políticas RLS do Supabase, migrações e estrutura do banco.

## O que está correto

- **Supabase**: Migrações 013, 014, 015 aplicadas. Políticas `profiles_select_own`, `profiles_select_all`, `get_my_profile` e `get_current_user_role_and_base` existem.
- **Usuário gerente_sci**: Existe no banco (ex.: Jhonata Silva Tomaz) com `role='gerente_sci'`, `base_id` preenchido e `equipe_id` null.
- **Constraint**: `profiles_role_check` permite 'geral', 'chefe', 'gerente_sci'.

## Problemas identificados

### 1. **Loop de redirect quando `role` está vazio ou inválido**

Em `ProtectedRoute.tsx`, quando o usuário não tem permissão:

```javascript
if (!role || !allowedRoles.includes(role as ...)) {
  if (role === 'geral') return <Navigate to="/dashboard-gerente" />
  if (role === 'gerente_sci') return <Navigate to="/dashboard-gerente-sci" />
  return <Navigate to="/dashboard-chefe" />  // ← PROBLEMA: role vazio cai aqui!
}
```

Quando `role` é `''`, `null` ou `'null'` (string):
- A condição `!role` é verdadeira, entrando no bloco.
- `role === 'geral'` e `role === 'gerente_sci'` são falsos.
- Redireciona para `/dashboard-chefe`.
- Na rota `/dashboard-chefe`, `allowedRoles = ['chefe']` e `role` continua vazio.
- Não tem permissão → redireciona de novo para `/dashboard-chefe`.
- Resultado: loop de redirect e tela em branco ou “Too many redirects”.

### 2. **Race entre Login e AuthContext**

No login, o `navigate()` pode ser chamado antes do AuthContext concluir `loadProfile`. O `ProtectedRoute` em `/dashboard-gerente-sci` ainda pode ver `profile: null` e exibir “Perfil não carregado”, ou o redirect pode ocorrer com estado inconsistente.

### 3. **Falta de fallback para role inválido**

Não há tratamento explícito para:
- `role` vazio ou nulo
- `role` com valor inesperado
- Falha ao obter perfil após login

## Correções aplicadas

1. Em `ProtectedRoute`: quando `role` está vazio ou inválido, redirecionar para `/login` em vez de `/dashboard-chefe`.
2. Garantir que, em caso de role inválido, o usuário vá para login ou tela de “Perfil não carregado”, nunca para um dashboard específico.
3. Sincronizar o fluxo de redirect do Login com o estado do AuthContext, evitando navegação com perfil não carregado.
