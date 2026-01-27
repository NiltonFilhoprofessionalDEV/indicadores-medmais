-- ============================================
-- MIGRATION: Adicionar políticas RLS de escrita para colaboradores
-- ============================================

-- RLS: INSERT permitido para Gerente Geral (role = 'geral')
CREATE POLICY "colaboradores_insert_geral" ON public.colaboradores
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

-- RLS: UPDATE permitido para Gerente Geral (role = 'geral')
CREATE POLICY "colaboradores_update_geral" ON public.colaboradores
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

-- RLS: DELETE permitido para Gerente Geral (role = 'geral')
CREATE POLICY "colaboradores_delete_geral" ON public.colaboradores
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

-- Comentários
COMMENT ON POLICY "colaboradores_insert_geral" ON public.colaboradores IS 'Permite inserção de colaboradores apenas para Gerente Geral';
COMMENT ON POLICY "colaboradores_update_geral" ON public.colaboradores IS 'Permite atualização de colaboradores apenas para Gerente Geral';
COMMENT ON POLICY "colaboradores_delete_geral" ON public.colaboradores IS 'Permite exclusão de colaboradores apenas para Gerente Geral';
