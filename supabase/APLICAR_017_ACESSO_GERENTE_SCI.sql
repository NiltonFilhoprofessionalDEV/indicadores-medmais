-- ============================================
-- COPIAR E COLAR NO SQL EDITOR DO SUPABASE
-- Dashboard → SQL Editor → New query → colar → Run
-- ============================================
-- Migration 017: coluna acesso_gerente_sci + função + RLS + trigger
-- Ordem: dropar policies que dependem da função → dropar função → recriar função → recriar policies
-- ============================================

-- 1. Adicionar coluna em profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS acesso_gerente_sci BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.profiles.acesso_gerente_sci IS 'Se true, chefe de equipe pode acessar painel Gerente de SCI. Só Gerente Geral pode alterar.';

-- 2. Dropar TODAS as policies que dependem da função get_current_user_role_and_base (para poder dropar a função)
DROP POLICY IF EXISTS "profiles_select_gerente_sci" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_gerente_sci" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_gerente_sci" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_gerente_sci" ON public.profiles;
DROP POLICY IF EXISTS "colaboradores_select_same_base" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_insert_gerente_sci" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_update_gerente_sci" ON public.colaboradores;
DROP POLICY IF EXISTS "colaboradores_delete_gerente_sci" ON public.colaboradores;
DROP POLICY IF EXISTS "lancamentos_select_gerente_sci" ON public.lancamentos;

-- 3. Agora dropar a função e recriar com a nova assinatura (inclui acesso_gerente_sci)
DROP FUNCTION IF EXISTS public.get_current_user_role_and_base();

CREATE FUNCTION public.get_current_user_role_and_base()
RETURNS TABLE(role text, base_id uuid, acesso_gerente_sci boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.role, p.base_id, COALESCE(p.acesso_gerente_sci, false)
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_current_user_role_and_base() IS
  'Retorna role, base_id e acesso_gerente_sci do usuário logado. Usado nas policies RLS.';

-- 4. Recriar policies de profiles (gerente_sci OU chefe com acesso_gerente_sci)
CREATE POLICY "profiles_select_gerente_sci" ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_insert_gerente_sci" ON public.profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_update_gerente_sci" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    );

CREATE POLICY "profiles_delete_gerente_sci" ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = profiles.base_id
        )
    );

-- 5. Recriar policy de colaboradores SELECT (geral, chefe, gerente_sci)
CREATE POLICY "colaboradores_select_same_base" ON public.colaboradores
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'geral'
               OR (my.role = 'chefe' AND my.base_id = colaboradores.base_id)
               OR (my.role = 'gerente_sci' AND my.base_id = colaboradores.base_id)
        )
    );

-- 6. Colaboradores: insert/update/delete para gerente_sci OU chefe com acesso_gerente_sci
CREATE POLICY "colaboradores_insert_gerente_sci" ON public.colaboradores
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = colaboradores.base_id
        )
    );

CREATE POLICY "colaboradores_update_gerente_sci" ON public.colaboradores
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = colaboradores.base_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = colaboradores.base_id
        )
    );

CREATE POLICY "colaboradores_delete_gerente_sci" ON public.colaboradores
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = colaboradores.base_id
        )
    );

-- 7. Lancamentos: SELECT para gerente_sci ou chefe com acesso_gerente_sci
CREATE POLICY "lancamentos_select_gerente_sci" ON public.lancamentos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE (my.role = 'gerente_sci' OR (my.role = 'chefe' AND my.acesso_gerente_sci))
              AND my.base_id IS NOT NULL AND my.base_id = lancamentos.base_id
        )
    );

-- 8. Trigger: apenas role 'geral' pode alterar acesso_gerente_sci
CREATE OR REPLACE FUNCTION public.check_acesso_gerente_sci_only_geral()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_role text;
BEGIN
  IF (OLD.acesso_gerente_sci IS DISTINCT FROM NEW.acesso_gerente_sci) THEN
    SELECT my.role INTO current_role FROM public.get_current_user_role_and_base() AS my LIMIT 1;
    IF current_role IS NULL OR current_role != 'geral' THEN
      RAISE EXCEPTION 'Apenas Gerente Geral pode alterar o acesso ao painel Gerente de SCI.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_acesso_gerente_sci_only_geral ON public.profiles;
CREATE TRIGGER trg_check_acesso_gerente_sci_only_geral
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_acesso_gerente_sci_only_geral();
