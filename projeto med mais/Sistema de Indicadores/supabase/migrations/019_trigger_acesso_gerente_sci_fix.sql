-- Migration 019: Ajuste do trigger que controla alteração de acesso_gerente_sci
-- 1. Obter role do usuário com SELECT direto em profiles (auth.uid()), mais confiável que função set-returning no trigger
-- 2. Mensagem de erro em português usando "Administrador" em vez de "Gerente Geral"
-- 3. Mensagem específica quando o perfil do usuário não é encontrado (sessão/perfil inválido)

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
    -- Obter role do usuário que está fazendo o UPDATE (auth.uid() = JWT do request)
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
