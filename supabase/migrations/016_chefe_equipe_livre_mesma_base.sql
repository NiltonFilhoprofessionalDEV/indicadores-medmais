-- ============================================
-- MIGRATION 016: Chefe pode escolher equipe no lançamento (caso de troca)
-- Permite que o chefe selecione a equipe no formulário e registre para qualquer
-- equipe da mesma base (ex.: usuário transferido ainda não atualizado no perfil).
-- Base continua obrigatória e travada; equipe fica editável no frontend.
-- ============================================

-- INSERT: Chefe pode inserir para qualquer equipe da sua base (não apenas profile.equipe_id)
DROP POLICY IF EXISTS "lancamentos_insert_chefe" ON public.lancamentos;
CREATE POLICY "lancamentos_insert_chefe" ON public.lancamentos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            AND profiles.base_id = lancamentos.base_id
            AND profiles.id = lancamentos.user_id
        )
    );

COMMENT ON POLICY "lancamentos_insert_chefe" ON public.lancamentos IS
    'Chefe pode inserir lançamentos para qualquer equipe da sua base (permite troca de equipe sem atualizar perfil).';

-- UPDATE: Chefe pode editar lançamentos de qualquer equipe da sua base
DROP POLICY IF EXISTS "lancamentos_update_chefe" ON public.lancamentos;
CREATE POLICY "lancamentos_update_chefe" ON public.lancamentos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            AND profiles.base_id = lancamentos.base_id
        )
    );

COMMENT ON POLICY "lancamentos_update_chefe" ON public.lancamentos IS
    'Chefe pode editar lançamentos de qualquer equipe da sua base.';

-- DELETE: Chefe pode excluir lançamentos de qualquer equipe da sua base
DROP POLICY IF EXISTS "lancamentos_delete_chefe" ON public.lancamentos;
CREATE POLICY "lancamentos_delete_chefe" ON public.lancamentos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            AND profiles.base_id = lancamentos.base_id
        )
    );

COMMENT ON POLICY "lancamentos_delete_chefe" ON public.lancamentos IS
    'Chefe pode excluir lançamentos de qualquer equipe da sua base.';
