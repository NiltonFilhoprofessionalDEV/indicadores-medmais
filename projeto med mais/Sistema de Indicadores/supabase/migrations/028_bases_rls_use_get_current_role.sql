-- ============================================
-- MIGRATION 028: Bases RLS - usar get_current_user_role_and_base()
-- Evita falha quando a subconsulta em profiles é afetada por RLS.
-- A função é SECURITY DEFINER e lê o role sem RLS.
-- ============================================

-- Recriar políticas de escrita em bases usando a função (não SELECT direto em profiles)
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

COMMENT ON TABLE public.bases IS 'Catálogo de bases aeroportuárias. Gerenciável via interface pelo Gerente Geral (Gestão de Bases).';
