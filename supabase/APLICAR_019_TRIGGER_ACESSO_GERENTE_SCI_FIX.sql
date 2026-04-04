-- ============================================
-- COPIAR E COLAR NO SQL EDITOR DO SUPABASE
-- Dashboard → SQL Editor → New query → colar → Run
-- ============================================
-- Migration 019: Ajuste do trigger de acesso_gerente_sci (identificação do usuário + mensagem "Administrador")
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
    SELECT p.role INTO current_role
    FROM public.profiles p
    WHERE p.id = auth.uid()
    LIMIT 1;

    IF current_role IS NULL THEN
      RAISE EXCEPTION 'Não foi possível identificar seu perfil. Faça login novamente.';
    END IF;
    IF current_role != 'geral' THEN
      RAISE EXCEPTION 'Apenas Administrador pode alterar o acesso ao painel Gerente de SCI. Confirme que está logado com perfil Administrador.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_acesso_gerente_sci_only_geral() IS
  'Trigger: só role geral (Administrador) pode alterar acesso_gerente_sci em profiles.';
