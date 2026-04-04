-- ============================================
-- RODAR UMA VEZ NO SUPABASE (SQL Editor)
-- Resolve de vez: só role=geral altera "acesso ao painel Gerente de SCI"
-- ============================================

-- 1. Função que retorna o role do usuário logado SEM depender de RLS (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_caller_role_for_update()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT TRIM(p.role)
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_caller_role_for_update() TO authenticated;

-- 2. RPC de edição usa essa função para saber se é geral (sempre lê certo)
CREATE OR REPLACE FUNCTION public.update_user_profile(
  target_id uuid,
  p_nome text,
  p_role text,
  p_base_id uuid,
  p_equipe_id uuid,
  p_acesso_gerente_sci boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  final_acesso_gerente_sci boolean;
  updated_row json;
BEGIN
  caller_role := public.get_caller_role_for_update();

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Não foi possível identificar seu perfil. Faça login novamente.';
  END IF;

  IF caller_role = 'geral' THEN
    final_acesso_gerente_sci := COALESCE(p_acesso_gerente_sci, false);
  ELSE
    SELECT COALESCE(p.acesso_gerente_sci, false) INTO final_acesso_gerente_sci
    FROM public.profiles p
    WHERE p.id = target_id
    LIMIT 1;
    IF final_acesso_gerente_sci IS NULL THEN
      final_acesso_gerente_sci := false;
    END IF;
  END IF;

  UPDATE public.profiles
  SET
    nome = TRIM(p_nome),
    role = p_role,
    base_id = p_base_id,
    equipe_id = p_equipe_id,
    acesso_gerente_sci = final_acesso_gerente_sci
  WHERE id = target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado ou você não tem permissão para editá-lo.';
  END IF;

  SELECT row_to_json(p) INTO updated_row
  FROM public.profiles p
  WHERE p.id = target_id
  LIMIT 1;

  RETURN updated_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text, uuid, uuid, boolean) TO authenticated;

-- 3. Remover o trigger que REVERTIA o campo após a RPC gravar (era ele que impedia a alteração)
DROP TRIGGER IF EXISTS trg_check_acesso_gerente_sci_only_geral ON public.profiles;
