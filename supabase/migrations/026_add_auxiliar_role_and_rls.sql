-- ============================================
-- MIGRATION 026: Perfil Líder de Resgate (role='auxiliar', mesmas permissões que Chefe de Equipe, nomenclatura distinta)
-- Data: 2025-02-13
-- Diretriz jurídica: novo tipo de usuário exibido como 'Líder de Resgate' (role auxiliar) com permissões técnicas idênticas ao 'Chefe'.
-- ============================================

-- 1. Constraint de Role: aceitar 'auxiliar' na coluna role
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('geral', 'chefe', 'gerente_sci', 'auxiliar'));

-- 2. Constraint: auxiliar deve ter base_id e equipe_id obrigatórios (igual chefe)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chefe_must_have_base_and_equipe;
ALTER TABLE public.profiles ADD CONSTRAINT chefe_must_have_base_and_equipe CHECK (
    (role = 'geral' AND base_id IS NULL AND equipe_id IS NULL) OR
    (role = 'chefe' AND base_id IS NOT NULL AND equipe_id IS NOT NULL) OR
    (role = 'gerente_sci' AND base_id IS NOT NULL AND equipe_id IS NULL) OR
    (role = 'auxiliar' AND base_id IS NOT NULL AND equipe_id IS NOT NULL)
);

COMMENT ON COLUMN public.profiles.role IS 'Role do usuário: geral (Gerente Geral), chefe (Chefe de Equipe), gerente_sci (Gerente de SCI) ou auxiliar (Líder de Resgate).';

-- ============================================
-- 3. RLS lancamentos: duplicar políticas do chefe para Líder de Resgate (role auxiliar)
-- Leitura: Líder de Resgate vê todos os registros da sua base_id
-- Escrita: Líder de Resgate insere/edita apenas da sua base_id (qualquer equipe da base, como chefe)
-- ============================================

CREATE POLICY "lancamentos_select_auxiliar" ON public.lancamentos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'auxiliar'
            AND profiles.base_id = lancamentos.base_id
        )
    );

CREATE POLICY "lancamentos_insert_auxiliar" ON public.lancamentos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'auxiliar'
            AND profiles.base_id = lancamentos.base_id
            AND profiles.id = lancamentos.user_id
        )
    );

CREATE POLICY "lancamentos_update_auxiliar" ON public.lancamentos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'auxiliar'
            AND profiles.base_id = lancamentos.base_id
        )
    );

CREATE POLICY "lancamentos_delete_auxiliar" ON public.lancamentos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'auxiliar'
            AND profiles.base_id = lancamentos.base_id
        )
    );

-- ============================================
-- 4. RLS colaboradores: Líder de Resgate (auxiliar) pode ler colaboradores da mesma base (como chefe)
-- A policy colaboradores_select_same_base pode usar get_current_user_role_and_base();
-- Se existir, recriar incluindo auxiliar.
-- ============================================

DROP POLICY IF EXISTS "colaboradores_select_same_base" ON public.colaboradores;
CREATE POLICY "colaboradores_select_same_base" ON public.colaboradores
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.get_current_user_role_and_base() AS my
            WHERE my.role = 'geral'
               OR (my.role = 'chefe' AND my.base_id = colaboradores.base_id)
               OR (my.role = 'gerente_sci' AND my.base_id = colaboradores.base_id)
               OR (my.role = 'auxiliar' AND my.base_id = colaboradores.base_id)
        )
    );

COMMENT ON POLICY "colaboradores_select_same_base" ON public.colaboradores IS
  'Leitura: geral vê tudo; chefe, gerente_sci e auxiliar veem apenas sua base.';
