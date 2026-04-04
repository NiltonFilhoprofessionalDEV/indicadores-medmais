-- ============================================
-- MIGRATION 030: Novo indicador Exercício de Posicionamento
-- Data: 2025-02-24
-- Descrição: Insere o indicador "Exercício de Posicionamento" (schema_type: exercicio_posicionamento).
-- Mesma estrutura de dados do Tempo Resposta (aferições: viatura, motorista, local, tempo).
-- ============================================

INSERT INTO public.indicadores_config (nome, schema_type)
VALUES ('Exercício de Posicionamento', 'exercicio_posicionamento')
ON CONFLICT (schema_type) DO NOTHING;

COMMENT ON TABLE public.indicadores_config IS 'Configuração dos 15 indicadores operacionais';
