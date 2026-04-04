-- ============================================
-- MIGRATION 033: Hardening RLS (catálogo + feedbacks)
-- - Documenta modelo deny-by-default do PostgreSQL com RLS habilitado.
-- - Substitui SELECT genérico (auth.uid() IS NOT NULL) em bases por vínculo explícito a profiles.
-- - equipes / indicadores_config: SELECT apenas para quem possui linha em profiles.
-- - feedbacks: INSERT com WITH CHECK (user_id = auth.uid()) em vez de true.
-- ============================================

COMMENT ON TABLE public.bases IS
  'Catálogo de bases. RLS: sem política aplicável = acesso negado (deny-by-default). Escrita apenas role geral.';

-- bases: leitura apenas para sessões com perfil registrado (não basta JWT anônimo sem profile)
DROP POLICY IF EXISTS "bases_select_all" ON public.bases;
CREATE POLICY "bases_select_authenticated_profile" ON public.bases
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid())
    );

COMMENT ON POLICY "bases_select_authenticated_profile" ON public.bases IS
  'SELECT: usuário autenticado com linha em public.profiles (evita leitura só com token sem perfil coerente).';

-- equipes (schema legado: USING true)
DROP POLICY IF EXISTS "equipes_select_all" ON public.equipes;
CREATE POLICY "equipes_select_authenticated_profile" ON public.equipes
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid())
    );

COMMENT ON POLICY "equipes_select_authenticated_profile" ON public.equipes IS
  'SELECT: apenas usuários com perfil no sistema.';

-- indicadores_config
DROP POLICY IF EXISTS "indicadores_config_select_all" ON public.indicadores_config;
CREATE POLICY "indicadores_config_select_authenticated_profile" ON public.indicadores_config
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid())
    );

COMMENT ON POLICY "indicadores_config_select_authenticated_profile" ON public.indicadores_config IS
  'SELECT: apenas usuários com perfil no sistema.';

-- feedbacks: impedir INSERT com user_id arbitrário
DROP POLICY IF EXISTS "Usuários autenticados podem criar feedbacks" ON public.feedbacks;
CREATE POLICY "Usuários autenticados podem criar feedbacks"
  ON public.feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Usuários autenticados podem criar feedbacks" ON public.feedbacks IS
  'INSERT: o criador deve ser o próprio auth.uid() (anti-fraude de user_id).';
