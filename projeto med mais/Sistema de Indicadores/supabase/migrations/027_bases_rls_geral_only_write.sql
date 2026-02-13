-- ============================================
-- MIGRATION 027: RLS na tabela bases - escrita apenas para Gerente Geral (role='geral')
-- Leitura: todos os usuários autenticados.
-- INSERT, UPDATE, DELETE: apenas role = 'geral'.
-- ============================================

-- 1. Remover policy de leitura aberta (true) e criar para autenticados
DROP POLICY IF EXISTS "bases_select_all" ON public.bases;
CREATE POLICY "bases_select_all" ON public.bases
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- 2. Escrita (INSERT, UPDATE, DELETE) apenas para role = 'geral'
CREATE POLICY "bases_insert_geral" ON public.bases
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

CREATE POLICY "bases_update_geral" ON public.bases
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

CREATE POLICY "bases_delete_geral" ON public.bases
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

COMMENT ON TABLE public.bases IS 'Catálogo de bases aeroportuárias. Gerenciável via interface pelo Gerente Geral (Gestão de Bases).';
