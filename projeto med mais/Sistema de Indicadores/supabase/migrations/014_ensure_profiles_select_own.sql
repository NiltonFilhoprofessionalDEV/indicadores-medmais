-- ============================================
-- MIGRATION 014: Garantir leitura do próprio perfil
-- Data: 2025-02-05
-- Garante que todo usuário autenticado possa ler seu próprio perfil (fallback para gerente_sci)
-- ============================================

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL AND id = auth.uid());

COMMENT ON POLICY "profiles_select_own" ON public.profiles IS 
  'Permite que qualquer usuário autenticado leia seu próprio perfil. Garante login para todos os roles.';
