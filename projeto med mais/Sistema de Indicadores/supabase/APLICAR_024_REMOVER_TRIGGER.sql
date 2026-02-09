-- ============================================
-- RODAR NO SUPABASE (SQL Editor)
-- Remove o trigger que revertia "acesso ao painel Gerente de SCI" após a RPC gravar.
-- Se você já rodou APLICAR_023, rode só este. Senão, rode o APLICAR_023 atualizado (ele já inclui este DROP).
-- ============================================

DROP TRIGGER IF EXISTS trg_check_acesso_gerente_sci_only_geral ON public.profiles;
