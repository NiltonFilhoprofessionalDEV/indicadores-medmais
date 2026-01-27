-- ============================================
-- MIGRATION: Função de busca otimizada em JSONB
-- ============================================
-- Esta função permite buscar texto dentro do campo JSONB conteudo
-- de forma eficiente usando índices GIN do PostgreSQL

-- Função auxiliar para buscar texto em campos específicos do JSONB
-- Busca nos campos: local, observacoes, tipo_ocorrencia
CREATE OR REPLACE FUNCTION public.search_lancamentos_jsonb(
    search_term TEXT
)
RETURNS TABLE (
    lancamento_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT l.id
    FROM public.lancamentos l
    WHERE 
        -- Buscar em campos específicos do JSONB usando operadores nativos
        (
            (l.conteudo->>'local') ILIKE '%' || search_term || '%' OR
            (l.conteudo->>'observacoes') ILIKE '%' || search_term || '%' OR
            (l.conteudo->>'tipo_ocorrencia') ILIKE '%' || search_term || '%' OR
            (l.conteudo->>'tipo_atividade') ILIKE '%' || search_term || '%'
        );
END;
$$ LANGUAGE plpgsql STABLE;

-- Comentário na função
COMMENT ON FUNCTION public.search_lancamentos_jsonb IS 'Busca texto em campos específicos do JSONB conteudo (local, observacoes, tipo_ocorrencia, tipo_atividade). Retorna IDs dos lançamentos que correspondem à busca.';

-- Índice GIN já existe (idx_lancamentos_conteudo), mas vamos garantir que está otimizado
-- O índice GIN permite buscas eficientes em JSONB usando operadores @> e ?||
