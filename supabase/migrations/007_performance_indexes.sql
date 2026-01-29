-- ============================================
-- MIGRATION 007: Performance Indexes
-- ============================================
-- Objetivo: Criar índices estratégicos para otimizar queries analíticas
-- e preparar o sistema para escalar para 100k+ registros
-- ============================================

-- 1. ÍNDICES B-TREE (Padrão) para colunas de filtro frequente
-- Esses índices aceleram filtros por base, equipe, indicador e data

-- Índice para base_id (filtro mais comum)
CREATE INDEX IF NOT EXISTS idx_lancamentos_base_id 
ON lancamentos(base_id);

-- Índice para equipe_id (filtro comum em dashboards)
CREATE INDEX IF NOT EXISTS idx_lancamentos_equipe_id 
ON lancamentos(equipe_id);

-- Índice para indicador_id (filtro por tipo de indicador)
CREATE INDEX IF NOT EXISTS idx_lancamentos_indicador_id 
ON lancamentos(indicador_id);

-- Índice para data_referencia (filtro de período - CRÍTICO para Analytics)
CREATE INDEX IF NOT EXISTS idx_lancamentos_data_referencia 
ON lancamentos(data_referencia);

-- Índice composto para queries mais comuns (base + data)
CREATE INDEX IF NOT EXISTS idx_lancamentos_base_data 
ON lancamentos(base_id, data_referencia DESC);

-- Índice composto para queries de analytics (indicador + data)
CREATE INDEX IF NOT EXISTS idx_lancamentos_indicador_data 
ON lancamentos(indicador_id, data_referencia DESC);

-- 2. ÍNDICE GIN (JSONB) - CRÍTICO para busca dentro de JSON
-- Permite buscar chaves dentro do campo conteudo instantaneamente
-- Ex: buscar nota do TAF, tipo_ocorrencia, etc.
CREATE INDEX IF NOT EXISTS idx_lancamentos_conteudo_gin 
ON lancamentos USING GIN (conteudo);

-- 3. ÍNDICES para outras tabelas frequentemente consultadas

-- Índice para profiles.base_id (filtro de usuários por base)
CREATE INDEX IF NOT EXISTS idx_profiles_base_id 
ON profiles(base_id);

-- Índice para profiles.equipe_id (filtro de usuários por equipe)
CREATE INDEX IF NOT EXISTS idx_profiles_equipe_id 
ON profiles(equipe_id);

-- Índice para colaboradores.base_id (filtro de colaboradores por base)
CREATE INDEX IF NOT EXISTS idx_colaboradores_base_id 
ON colaboradores(base_id);

-- Índice para colaboradores.ativo (filtro de colaboradores ativos)
CREATE INDEX IF NOT EXISTS idx_colaboradores_ativo 
ON colaboradores(ativo) WHERE ativo = true;

-- 4. COMENTÁRIOS para documentação
COMMENT ON INDEX idx_lancamentos_base_id IS 'Acelera filtros por base (mais comum)';
COMMENT ON INDEX idx_lancamentos_equipe_id IS 'Acelera filtros por equipe';
COMMENT ON INDEX idx_lancamentos_indicador_id IS 'Acelera filtros por tipo de indicador';
COMMENT ON INDEX idx_lancamentos_data_referencia IS 'CRÍTICO: Acelera filtros de período (essencial para Analytics)';
COMMENT ON INDEX idx_lancamentos_base_data IS 'Índice composto para queries base + data (otimização comum)';
COMMENT ON INDEX idx_lancamentos_indicador_data IS 'Índice composto para queries indicador + data (otimização Analytics)';
COMMENT ON INDEX idx_lancamentos_conteudo_gin IS 'CRÍTICO: Permite busca instantânea dentro de campos JSONB (ex: conteudo.nota, conteudo.tipo_ocorrencia)';
COMMENT ON INDEX idx_profiles_base_id IS 'Acelera filtros de usuários por base';
COMMENT ON INDEX idx_profiles_equipe_id IS 'Acelera filtros de usuários por equipe';
COMMENT ON INDEX idx_colaboradores_base_id IS 'Acelera filtros de colaboradores por base';
COMMENT ON INDEX idx_colaboradores_ativo IS 'Índice parcial para colaboradores ativos (otimização)';

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Os índices B-Tree são ideais para filtros de igualdade e range (WHERE, ORDER BY)
-- 2. O índice GIN é ESSENCIAL para queries que buscam dentro de JSONB:
--    - Ex: WHERE conteudo->>'nota' > '8'
--    - Ex: WHERE conteudo ? 'tipo_ocorrencia'
-- 3. Índices compostos aceleram queries que filtram por múltiplas colunas
-- 4. O índice parcial (WHERE ativo = true) economiza espaço e é mais rápido
-- 5. Após criar os índices, o PostgreSQL atualizará automaticamente as estatísticas
-- ============================================
