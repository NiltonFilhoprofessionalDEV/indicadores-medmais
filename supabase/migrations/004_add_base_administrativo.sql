-- ============================================
-- MIGRATION: Adicionar Base ADMINISTRATIVO
-- ============================================
-- Esta migration adiciona a base 'ADMINISTRATIVO' para organizar
-- usuários com perfil de Gerente Geral.

INSERT INTO public.bases (nome)
VALUES ('ADMINISTRATIVO')
ON CONFLICT (nome) DO NOTHING;

COMMENT ON TABLE public.bases IS 'Catálogo das bases aeroportuárias + base ADMINISTRATIVO para Gerentes Gerais';
