-- ============================================
-- MIGRATION 013: Corrigir recursão infinita nas policies de profiles
-- Data: 2025-02-05
-- Problema: Policies em profiles que fazem SELECT em profiles causam recursão
-- Solução: Função SECURITY DEFINER que lê o perfil sem disparar RLS
-- ============================================

-- 1. Criar função auxiliar que retorna role e base_id do usuário atual (bypass RLS)
CREATE OR REPLACE FUNCTION public.get_current_user_role_and_base()
RETURNS TABLE(role text, base_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.role, p.base_id FROM public.profiles p WHERE p.id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_current_user_role_and_base() IS 
  'Retorna role e base_id do usuário logado. SECURITY DEFINER para evitar recursão em policies RLS.';

-- 2. Remover as policies problemáticas de profiles (causavam recursão)
DROP POLICY IF EXISTS "profiles_select_gerente_sci" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_gerente_sci" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_gerente_sci" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_gerente_sci" ON public.profiles;

-- 3. Recriar policies usando a função (sem recursão)
CREATE POLICY "profiles_select_gerente_sci" ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_insert_gerente_sci" ON public.profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_update_gerente_sci" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_delete_gerente_sci" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    );

-- 4. Atualizar policies de colaboradores e lancamentos para usar a função (evitar recursão via profiles)
DROP POLICY IF EXISTS "colaboradores_select_same_base" ON public.colaboradores;
CREATE POLICY "colaboradores_select_same_base" ON public.colaboradores
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'geral'
               OR (my.role = 'chefe' AND my.base_id = colaboradores.base_id)
               OR (my.role = 'gerente_sci' AND my.base_id = colaboradores.base_id)
        )
    );

DROP POLICY IF EXISTS "colaboradores_insert_gerente_sci" ON public.colaboradores;
CREATE POLICY "colaboradores_insert_gerente_sci" ON public.colaboradores
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = colaboradores.base_id
        )
    );

DROP POLICY IF EXISTS "colaboradores_update_gerente_sci" ON public.colaboradores;
CREATE POLICY "colaboradores_update_gerente_sci" ON public.colaboradores
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = colaboradores.base_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = colaboradores.base_id
        )
    );

DROP POLICY IF EXISTS "colaboradores_delete_gerente_sci" ON public.colaboradores;
CREATE POLICY "colaboradores_delete_gerente_sci" ON public.colaboradores
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = colaboradores.base_id
        )
    );

DROP POLICY IF EXISTS "lancamentos_select_gerente_sci" ON public.lancamentos;
CREATE POLICY "lancamentos_select_gerente_sci" ON public.lancamentos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'gerente_sci' AND my.base_id IS NOT NULL AND my.base_id = lancamentos.base_id
        )
    );
