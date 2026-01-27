-- ============================================
-- MIGRATION: Criar tabela colaboradores e corrigir bug de sobrescrita
-- ============================================

-- 1. Criar tabela colaboradores (Efetivo)
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    nome TEXT NOT NULL,
    base_id UUID NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
    ativo BOOLEAN NOT NULL DEFAULT true
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_colaboradores_base_id ON public.colaboradores(base_id);
CREATE INDEX IF NOT EXISTS idx_colaboradores_ativo ON public.colaboradores(ativo);

-- Habilitar RLS
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- RLS: Leitura permitida para autenticados da mesma base
CREATE POLICY "colaboradores_select_same_base" ON public.colaboradores
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (
                profiles.role = 'geral'
                OR (profiles.role = 'chefe' AND profiles.base_id = colaboradores.base_id)
            )
        )
    );

-- RLS: Escrita apenas para Admin (Service Role)
-- Nota: INSERT/UPDATE/DELETE serão feitos apenas via Service Role (Edge Functions ou Admin)

-- 2. CORREÇÃO CRÍTICA: Remover constraint UNIQUE que causa sobrescrita de dados
-- O sistema deve permitir múltiplos lançamentos para o mesmo indicador no mesmo dia
ALTER TABLE public.lancamentos
    DROP CONSTRAINT IF EXISTS unique_lancamento_per_indicador_equipe_data;

-- Comentários
COMMENT ON TABLE public.colaboradores IS 'Efetivo (colaboradores) das bases aeroportuárias';
COMMENT ON COLUMN public.colaboradores.ativo IS 'Indica se o colaborador está ativo (default: true)';
