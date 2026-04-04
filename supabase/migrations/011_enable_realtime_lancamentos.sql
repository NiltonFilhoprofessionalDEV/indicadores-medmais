-- ============================================
-- MIGRATION: Habilitar Realtime na tabela lancamentos
-- ============================================
-- Permite que o frontend se inscreva em mudanças (INSERT, UPDATE, DELETE)
-- na tabela lancamentos para atualização automática dos dashboards.

ALTER PUBLICATION supabase_realtime ADD TABLE public.lancamentos;
