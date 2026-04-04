-- ============================================
-- MIGRATION 005: Correções de Segurança e Performance
-- Data: 2025-01-27
-- Descrição: Correção crítica de RLS Policy e criação de índices compostos
-- ============================================

-- ============================================
-- PARTE 1: CORREÇÃO CRÍTICA DE SEGURANÇA (RLS)
-- ============================================

-- Remove a policy vulnerável
DROP POLICY IF EXISTS "lancamentos_insert_chefe" ON public.lancamentos;

-- Cria nova policy com validação explícita de base_id
CREATE POLICY "lancamentos_insert_chefe" ON public.lancamentos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            -- VALIDAÇÃO CRÍTICA: base_id do payload DEVE ser igual ao base_id do perfil
            AND profiles.base_id = lancamentos.base_id
            AND profiles.equipe_id = lancamentos.equipe_id
            -- GARANTIA ADICIONAL: user_id do payload DEVE ser o próprio usuário
            AND profiles.id = lancamentos.user_id
        )
    );

-- Comentário explicativo
COMMENT ON POLICY "lancamentos_insert_chefe" ON public.lancamentos IS 
    'Chefe de Equipe pode inserir apenas para sua própria base e equipe. Valida explicitamente que base_id do payload = base_id do perfil.';

-- ============================================
-- PARTE 2: ÍNDICES COMPOSTOS PARA PERFORMANCE
-- ============================================

-- Índice composto: base_id + data_referencia (usado em Analytics e History)
CREATE INDEX IF NOT EXISTS idx_lancamentos_base_data 
ON public.lancamentos(base_id, data_referencia DESC);

-- Índice composto: indicador_id + data_referencia (usado em Analytics por indicador)
CREATE INDEX IF NOT EXISTS idx_lancamentos_indicador_data 
ON public.lancamentos(indicador_id, data_referencia DESC);

-- Índice composto: base_id + indicador_id + data_referencia (usado em Analytics filtrado)
CREATE INDEX IF NOT EXISTS idx_lancamentos_base_indicador_data 
ON public.lancamentos(base_id, indicador_id, data_referencia DESC);

-- Índice composto: equipe_id + data_referencia (usado em History do Chefe)
CREATE INDEX IF NOT EXISTS idx_lancamentos_equipe_data 
ON public.lancamentos(equipe_id, data_referencia DESC);

-- Índice composto: user_id + data_referencia (usado em Compliance/Aderência)
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_data 
ON public.lancamentos(user_id, data_referencia DESC);

-- ============================================
-- PARTE 3: ÍNDICES GIN PARA CAMPOS JSONB ESPECÍFICOS
-- ============================================

-- Índice GIN específico para campo 'local' dentro do JSONB
CREATE INDEX IF NOT EXISTS idx_lancamentos_conteudo_local 
ON public.lancamentos USING GIN ((conteudo->>'local'));

-- Índice GIN específico para campo 'observacoes' dentro do JSONB
CREATE INDEX IF NOT EXISTS idx_lancamentos_conteudo_observacoes 
ON public.lancamentos USING GIN ((conteudo->>'observacoes'));

-- ============================================
-- PARTE 4: ÍNDICE GIN TRGM PARA BUSCA FULL-TEXT (OPCIONAL)
-- ============================================

-- Habilitar extensão pg_trgm se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índice GIN para busca full-text em JSONB (otimiza função RPC search_lancamentos_jsonb)
CREATE INDEX IF NOT EXISTS idx_lancamentos_conteudo_gin_trgm 
ON public.lancamentos USING GIN (conteudo gin_trgm_ops);

-- ============================================
-- COMENTÁRIOS EXPLICATIVOS
-- ============================================

COMMENT ON INDEX idx_lancamentos_base_data IS 
    'Índice composto para queries filtradas por base e data (usado em Analytics e History)';

COMMENT ON INDEX idx_lancamentos_indicador_data IS 
    'Índice composto para queries filtradas por indicador e data (usado em Analytics por indicador)';

COMMENT ON INDEX idx_lancamentos_base_indicador_data IS 
    'Índice composto para queries filtradas por base, indicador e data (otimização máxima)';

COMMENT ON INDEX idx_lancamentos_equipe_data IS 
    'Índice composto para queries filtradas por equipe e data (usado em History do Chefe)';

COMMENT ON INDEX idx_lancamentos_user_data IS 
    'Índice composto para queries filtradas por usuário e data (usado em Compliance/Aderência)';
