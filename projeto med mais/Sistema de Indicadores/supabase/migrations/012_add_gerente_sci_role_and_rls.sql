-- ============================================
-- MIGRATION 012: Perfil Gerente de SCI e Políticas RLS
-- Data: 2025-02-05
-- Descrição: Adiciona novo perfil gerente_sci e políticas RLS para profiles, colaboradores e lancamentos
-- ============================================

-- 1. ALTERAR CHECK DA COLUNA ROLE EM PROFILES
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('geral', 'chefe', 'gerente_sci'));

-- 2. ALTERAR CONSTRAINT chefe_must_have_base_and_equipe PARA INCLUIR gerente_sci
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chefe_must_have_base_and_equipe;
ALTER TABLE public.profiles ADD CONSTRAINT chefe_must_have_base_and_equipe CHECK (
    (role = 'geral' AND base_id IS NULL AND equipe_id IS NULL) OR
    (role = 'chefe' AND base_id IS NOT NULL AND equipe_id IS NOT NULL) OR
    (role = 'gerente_sci' AND base_id IS NOT NULL AND equipe_id IS NULL)
);

COMMENT ON COLUMN public.profiles.role IS 'Role do usuário: geral (Gerente Geral), chefe (Chefe de Equipe) ou gerente_sci (Gerente de SCI)';

-- ============================================
-- 3. POLÍTICAS RLS: profiles (gerente_sci)
-- ============================================
-- Gerente de SCI pode SELECT, INSERT, UPDATE, DELETE apenas em profiles onde base_id = seu base_id
CREATE POLICY "profiles_select_gerente_sci" ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'gerente_sci'
            AND p.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_insert_gerente_sci" ON public.profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'gerente_sci'
            AND p.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_update_gerente_sci" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'gerente_sci'
            AND p.base_id = profiles.base_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'gerente_sci'
            AND p.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_delete_gerente_sci" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'gerente_sci'
            AND p.base_id = profiles.base_id
        )
    );

-- ATENÇÃO: profiles_select_all já existe e permite SELECT para todos. 
-- A policy profiles_select_gerente_sci adiciona permissão para gerente_sci ver profiles da sua base.
-- profiles_select_all com USING(true) já permite que qualquer autenticado veja profiles.
-- Para restringir: gerente_sci não deve ver profiles de outras bases via SELECT.
-- Como profiles_select_all usa USING(true), todos veem tudo. Precisamos DROP e recriar com restrições?
-- Na verdade, a doc diz "Leitura pública (para o sistema saber quem é quem)" - então todos podem ver profiles.
-- O importante é INSERT/UPDATE/DELETE - gerente_sci só pode modificar os da sua base.
-- As policies de INSERT/UPDATE/DELETE para gerente_sci estão criadas. O Service Role/Edge Functions
-- fazem escrita. Com RLS, usuários anon/authenticated: as policies aplicam. 
-- Para escrita via frontend (update-user edge function usa service role), a RLS pode não aplicar.
-- Mas se o frontend fizer UPDATE direto no supabase client (com anon key), a RLS aplica.
-- Vamos manter profiles_select_all como está (leitura livre) pois o sistema precisa listar usuários.
-- O gerente_sci no frontend terá filtro travado na base dele, então só verá os da sua base na prática.
-- Se quisermos restringir SELECT no banco, teríamos que modificar profiles_select_all.
-- Por segurança, é melhor que gerente_sci só veja profiles da sua base no banco.
-- Verificando: profiles_select_all - USING (true) - todos autenticados veem todos profiles.
-- Se mantivermos isso, o frontend precisa filtrar. Mas RLS é defesa em profundidade.
-- Vamos criar uma policy que substitui para roles: para gerente_sci, só vê onde base_id = seu base_id OU id = auth.uid() (próprio perfil).
-- Isso exigiria DROP da profiles_select_all e criar uma mais restritiva. Porém, "geral" e "chefe" 
-- e outros podem precisar ver todos os profiles. O PRD diz "Leitura pública". 
-- Para gerente_sci, a policy profiles_select_gerente_sci que criamos - na verdade ela ADICIONA permissão.
-- Com RLS, multiple policies for same operation are OR'd. So profiles_select_all (true) + profiles_select_gerente_sci 
-- = todos veem tudo (porque true). Então a profiles_select_gerente_sci é redundante para SELECT.
-- O importante é que gerente_sci NÃO possa INSERT/UPDATE/DELETE em profiles de outra base.
-- Para INSERT/UPDATE/DELETE, as policies são OR. Sem policy de insert para gerente_sci antes, apenas
-- service role podia. Agora com profiles_insert_gerente_sci, o usuário gerente_sci pode inserir
-- apenas onde profiles.base_id = seu base_id. OK.
-- ============================================
-- 4. ATUALIZAR colaboradores_select_same_base PARA INCLUIR gerente_sci
-- ============================================
DROP POLICY IF EXISTS "colaboradores_select_same_base" ON public.colaboradores;
CREATE POLICY "colaboradores_select_same_base" ON public.colaboradores
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'geral'
                OR (profiles.role = 'chefe' AND profiles.base_id = colaboradores.base_id)
                OR (profiles.role = 'gerente_sci' AND profiles.base_id = colaboradores.base_id)
            )
        )
    );

-- 5. POLÍTICAS RLS: colaboradores - CRUD para gerente_sci (apenas sua base)
CREATE POLICY "colaboradores_insert_gerente_sci" ON public.colaboradores
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'gerente_sci'
            AND profiles.base_id = colaboradores.base_id
        )
    );

CREATE POLICY "colaboradores_update_gerente_sci" ON public.colaboradores
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'gerente_sci'
            AND profiles.base_id = colaboradores.base_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'gerente_sci'
            AND profiles.base_id = colaboradores.base_id
        )
    );

CREATE POLICY "colaboradores_delete_gerente_sci" ON public.colaboradores
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'gerente_sci'
            AND profiles.base_id = colaboradores.base_id
        )
    );

-- ============================================
-- 6. POLÍTICAS RLS: lancamentos - SELECT para gerente_sci (visualizar sua base)
-- ============================================
CREATE POLICY "lancamentos_select_gerente_sci" ON public.lancamentos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'gerente_sci'
            AND profiles.base_id = lancamentos.base_id
        )
    );

COMMENT ON POLICY "lancamentos_select_gerente_sci" ON public.lancamentos IS 
    'Gerente de SCI pode visualizar lançamentos da sua base para fins de conferência';
