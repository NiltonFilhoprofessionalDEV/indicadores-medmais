-- Migration 018: Permitir que Administrador (role = geral) atualize qualquer perfil em profiles.
-- Usado para edição de usuários (nome, role, base_id, equipe_id, acesso_gerente_sci) direto pelo frontend,
-- sem depender da Edge Function update-user (evita 401). O trigger trg_check_acesso_gerente_sci_only_geral
-- continua garantindo que só geral pode alterar acesso_gerente_sci.

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
