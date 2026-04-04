-- ============================================
-- MIGRATION 034: Corrige avisos do Supabase Security Advisor
-- 1) search_path fixo em funções (mitiga search path hijacking)
-- 2) feedbacks UPDATE: substitui WITH CHECK (true) por condição explícita
--
-- Se no SQL Editor ficar "Running" sem terminar: cancele (Cancel), feche
-- abas que usem feedbacks/profiles, e rode de novo. Ou use lock_timeout abaixo.
-- ============================================

SET lock_timeout = '20s';
SET statement_timeout = '120s';

-- Função de trigger (profiles / lancamentos updated_at)
ALTER FUNCTION public.handle_updated_at() SET search_path = public;

COMMENT ON FUNCTION public.handle_updated_at() IS
  'Atualiza updated_at. search_path=public por recomendação de segurança.';

-- Busca em JSONB (Explorador / RPC)
ALTER FUNCTION public.search_lancamentos_jsonb(text) SET search_path = public;

-- Política UPDATE em feedbacks: WITH CHECK explícito (evita "RLS Policy Always True")
DROP POLICY IF EXISTS "Gerentes Gerais podem atualizar feedbacks" ON public.feedbacks;

CREATE POLICY "Gerentes Gerais podem atualizar feedbacks"
  ON public.feedbacks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'geral'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'geral'
    )
  );

COMMENT ON POLICY "Gerentes Gerais podem atualizar feedbacks" ON public.feedbacks IS
  'UPDATE: apenas Gerente Geral; USING e WITH CHECK explícitos (sem true).';

-- Restaura timeouts padrão da sessão (evita afetar próximas queries no mesmo editor)
RESET lock_timeout;
RESET statement_timeout;
