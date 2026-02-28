-- ============================================
-- MIGRATION 032: Novo indicador PTR-BA Extras
-- Data: 2025-02-28
-- Descrição: Insere o indicador "PTR-BA Extras" (schema_type: ptr_ba_extras).
-- Registro simplificado de carga horária complementar (participantes: nome + horas).
-- ============================================

INSERT INTO public.indicadores_config (nome, schema_type)
VALUES ('PTR-BA Extras', 'ptr_ba_extras')
ON CONFLICT (schema_type) DO NOTHING;

COMMENT ON TABLE public.indicadores_config IS 'Configuração dos 16 indicadores operacionais';
