-- Migration 022: RPC de diagnóstico para ver o que o banco enxerga do usuário logado.
-- Útil para conferir se role=geral está sendo reconhecido (ex.: na edição de acesso_gerente_sci).

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

COMMENT ON FUNCTION public.get_caller_role() IS
  'Retorna uid, role e nome do usuário logado (diagnóstico).';

GRANT EXECUTE ON FUNCTION public.get_caller_role() TO authenticated;
