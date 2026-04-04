-- ============================================
-- MIGRATION 029: Correção crítica - Evitar vazamento de dados entre bases
-- Data: 2025-02-24
-- Descrição: Restringe SELECT em profiles para que usuários de gestão local
-- (gerente_sci, chefe com acesso_gerente_sci, etc.) vejam apenas usuários da própria base.
-- Gerente Geral (role = 'geral') continua vendo todos os profiles.
-- ============================================

-- 1. Remover policy que permitia leitura de todos os profiles (USING true)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- 2. Nova policy: apenas Gerente Geral vê todos; demais veem próprio perfil ou mesma base
CREATE POLICY "profiles_select_restricted_by_base" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND (
            -- Gerente Geral vê tudo
            EXISTS (
                SELECT 1 FROM public.get_current_user_role_and_base() AS my
                WHERE my.role = 'geral'
            )
            -- Ou é o próprio perfil (sempre visível)
            OR profiles.id = auth.uid()
            -- Ou pertence à mesma base do usuário logado (gestão local)
            OR EXISTS (
                SELECT 1 FROM public.get_current_user_role_and_base() AS my
                WHERE my.base_id IS NOT NULL
                  AND profiles.base_id = my.base_id
            )
        )
    );

COMMENT ON POLICY "profiles_select_restricted_by_base" ON public.profiles IS
  'SELECT: geral vê todos; demais veem apenas próprio perfil ou profiles da mesma base. Isolamento entre bases.';
