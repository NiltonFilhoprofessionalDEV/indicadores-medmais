-- ============================================
-- COPIAR E COLAR NO SQL EDITOR DO SUPABASE
-- Dashboard → SQL Editor → New query → colar → Run
-- ============================================
-- Migration 018: policy para Administrador (geral) atualizar qualquer perfil.
-- Necessário para a edição de usuários (incl. "Pode acessar painel Gerente de SCI") funcionar pelo frontend.
-- ============================================

DROP POLICY IF EXISTS "profiles_update_geral" ON public.profiles;
CREATE POLICY "profiles_update_geral" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'geral'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'geral'
        )
    );

COMMENT ON POLICY "profiles_update_geral" ON public.profiles IS
  'Administrador (Gerente Geral) pode atualizar qualquer perfil. Usado na Gestão de Usuários.';
