-- ============================================
-- COPIAR E COLAR NO SQL EDITOR DO SUPABASE
-- Dashboard → SQL Editor → New query → colar → Run
-- ============================================
-- Migration 020: Trigger usa get_current_user_role_and_base() (mesma fonte que RLS).
-- Assim quem passa em profiles_update_geral (role=geral) também é reconhecido no trigger.
-- ============================================

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
    SELECT my.role INTO current_role
    FROM public.get_current_user_role_and_base() AS my
    LIMIT 1;

    IF current_role IS NULL OR current_role != 'geral' THEN
      NEW.acesso_gerente_sci := OLD.acesso_gerente_sci;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_acesso_gerente_sci_only_geral() IS
  'Trigger: só role geral (Administrador) pode alterar acesso_gerente_sci; caso contrário reverte o campo e permite salvar o resto.';
