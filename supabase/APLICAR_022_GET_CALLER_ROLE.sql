-- ============================================
-- COPIAR E COLAR NO SQL EDITOR DO SUPABASE
-- ============================================
-- RPC de diagnóstico: retorna uid, role e nome do usuário logado.
-- Útil para conferir por que a alteração de acesso_gerente_sci não é aplicada.
-- ============================================

CREATE OR REPLACE FUNCTION public.get_caller_role()
RETURNS json
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
STABLE
AS $$
  SELECT json_build_object(
    'uid', auth.uid(),
    'role', TRIM(p.role),
    'nome', p.nome
  )
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_caller_role() TO authenticated;
