-- ============================================
-- MIGRATION 031: Renomear indicador Tempo Resposta para Exercício de Tempo Resposta
-- ============================================

UPDATE public.indicadores_config
SET nome = 'Exercício de Tempo Resposta'
WHERE schema_type = 'tempo_resposta';
