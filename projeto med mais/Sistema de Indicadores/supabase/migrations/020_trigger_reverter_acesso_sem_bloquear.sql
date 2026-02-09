-- Migration 020: Trigger NÃO bloqueia mais o salvamento.
-- Se quem edita NÃO for Administrador (role 'geral'), o trigger apenas REVERTE o campo
-- acesso_gerente_sci para o valor anterior (OLD), permitindo que nome/role/base/equipe sejam salvos.
-- Assim o usuário sempre consegue salvar; só o checkbox "acesso ao painel Gerente de SCI" não é aplicado
-- quando o perfil no banco não é Administrador.

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
    -- Usar a mesma função que as policies RLS (get_current_user_role_and_base) para garantir consistência
    SELECT my.role INTO current_role
    FROM public.get_current_user_role_and_base() AS my
    LIMIT 1;

    IF current_role IS NULL OR current_role != 'geral' THEN
      -- Não bloquear: apenas manter o valor anterior (reverter a alteração deste campo)
      NEW.acesso_gerente_sci := OLD.acesso_gerente_sci;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_acesso_gerente_sci_only_geral() IS
  'Trigger: só role geral (Administrador) pode alterar acesso_gerente_sci; caso contrário reverte o campo e permite salvar o resto.';
