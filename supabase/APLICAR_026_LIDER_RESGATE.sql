-- ============================================
-- Aplicar suporte ao perfil Líder de Resgate (auxiliar) em profiles
-- Execute este script no Supabase > SQL Editor se o cadastro de Líder de Resgate
-- retornar: violates check constraint "chefe_must_have_base_and_equipe"
-- ============================================

-- 1. Constraint de Role: aceitar 'auxiliar'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('geral', 'chefe', 'gerente_sci', 'auxiliar'));

-- 2. Constraint: auxiliar deve ter base_id e equipe_id obrigatórios (igual chefe)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chefe_must_have_base_and_equipe;
ALTER TABLE public.profiles ADD CONSTRAINT chefe_must_have_base_and_equipe CHECK (
    (role = 'geral' AND base_id IS NULL AND equipe_id IS NULL) OR
    (role = 'chefe' AND base_id IS NOT NULL AND equipe_id IS NOT NULL) OR
    (role = 'gerente_sci' AND base_id IS NOT NULL AND equipe_id IS NULL) OR
    (role = 'auxiliar' AND base_id IS NOT NULL AND equipe_id IS NOT NULL)
);

COMMENT ON COLUMN public.profiles.role IS 'Role: geral, chefe, gerente_sci ou auxiliar (Líder de Resgate).';
