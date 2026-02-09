-- ============================================
-- COPIAR E COLAR NO SQL EDITOR DO SUPABASE
-- Dashboard → SQL Editor → New query → colar → Run
-- ============================================
-- Migration 021: RPC update_user_profile para edição de usuário.
-- Só role=geral pode alterar acesso_gerente_sci; a regra é aplicada dentro da RPC.
-- ============================================

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
  -- Identificar quem está chamando: SELECT direto em profiles por auth.uid()
  SELECT TRIM(p.role) INTO caller_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF caller_role IS NULL THEN
    RAISE EXCEPTION 'Não foi possível identificar seu perfil (auth.uid() sem linha em profiles). Faça login novamente.';
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

COMMENT ON FUNCTION public.update_user_profile(uuid, text, text, uuid, uuid, boolean) IS
  'Atualiza perfil de usuário. Só role=geral pode alterar acesso_gerente_sci.';

GRANT EXECUTE ON FUNCTION public.update_user_profile(uuid, text, text, uuid, uuid, boolean) TO authenticated;
