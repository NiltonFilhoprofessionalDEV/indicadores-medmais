-- Aplicar no Supabase (SQL Editor) para corrigir RLS da tabela bases.
-- Usa get_current_user_role_and_base() (SECURITY DEFINER) para verificar role = 'geral'
-- sem depender de leitura na tabela profiles com RLS.

DROP POLICY IF EXISTS "bases_insert_geral" ON public.bases;
CREATE POLICY "bases_insert_geral" ON public.bases
    FOR INSERT
    WITH CHECK (
        (SELECT role FROM public.get_current_user_role_and_base() LIMIT 1) = 'geral'
    );

DROP POLICY IF EXISTS "bases_update_geral" ON public.bases;
CREATE POLICY "bases_update_geral" ON public.bases
    FOR UPDATE
    USING (
        (SELECT role FROM public.get_current_user_role_and_base() LIMIT 1) = 'geral'
    )
    WITH CHECK (
        (SELECT role FROM public.get_current_user_role_and_base() LIMIT 1) = 'geral'
    );

DROP POLICY IF EXISTS "bases_delete_geral" ON public.bases;
CREATE POLICY "bases_delete_geral" ON public.bases
    FOR DELETE
    USING (
        (SELECT role FROM public.get_current_user_role_and_base() LIMIT 1) = 'geral'
    );
