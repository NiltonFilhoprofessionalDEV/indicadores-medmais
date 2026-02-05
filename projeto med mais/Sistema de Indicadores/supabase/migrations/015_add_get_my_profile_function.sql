-- Função RPC que retorna o perfil do usuário logado (bypassa RLS)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT row_to_json(p) FROM public.profiles p WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO anon;
