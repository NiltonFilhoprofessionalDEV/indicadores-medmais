-- ============================================
-- SCHEMA SQL - Sistema de Gestão de Indicadores Operacionais
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELAS DE CATÁLOGO (Dados Estáticos)
-- ============================================

-- Tabela: bases
CREATE TABLE public.bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: equipes
CREATE TABLE public.equipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: indicadores_config
CREATE TABLE public.indicadores_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL UNIQUE,
    schema_type TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELAS DE SISTEMA
-- ============================================

-- Tabela: profiles (vinculada ao auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('geral', 'chefe')),
    base_id UUID REFERENCES public.bases(id) ON DELETE SET NULL,
    equipe_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chefe_must_have_base_and_equipe CHECK (
        (role = 'geral' AND base_id IS NULL AND equipe_id IS NULL) OR
        (role = 'chefe' AND base_id IS NOT NULL AND equipe_id IS NOT NULL)
    )
);

-- Tabela: lancamentos (Single Source of Truth com JSONB)
CREATE TABLE public.lancamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data_referencia DATE NOT NULL,
    base_id UUID NOT NULL REFERENCES public.bases(id) ON DELETE CASCADE,
    equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    indicador_id UUID NOT NULL REFERENCES public.indicadores_config(id) ON DELETE CASCADE,
    conteudo JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT unique_lancamento_per_indicador_equipe_data UNIQUE (data_referencia, base_id, equipe_id, indicador_id)
);

-- Índices para performance
CREATE INDEX idx_lancamentos_data_referencia ON public.lancamentos(data_referencia);
CREATE INDEX idx_lancamentos_base_id ON public.lancamentos(base_id);
CREATE INDEX idx_lancamentos_equipe_id ON public.lancamentos(equipe_id);
CREATE INDEX idx_lancamentos_user_id ON public.lancamentos(user_id);
CREATE INDEX idx_lancamentos_indicador_id ON public.lancamentos(indicador_id);
CREATE INDEX idx_lancamentos_conteudo ON public.lancamentos USING GIN(conteudo);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicadores_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES: bases
-- ============================================
CREATE POLICY "bases_select_all" ON public.bases
    FOR SELECT
    USING (true);

-- ============================================
-- POLICIES: equipes
-- ============================================
CREATE POLICY "equipes_select_all" ON public.equipes
    FOR SELECT
    USING (true);

-- ============================================
-- POLICIES: indicadores_config
-- ============================================
CREATE POLICY "indicadores_config_select_all" ON public.indicadores_config
    FOR SELECT
    USING (true);

-- ============================================
-- POLICIES: profiles
-- ============================================
-- Leitura pública (para o sistema saber quem é quem)
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT
    USING (true);

-- Escrita apenas via Service Role (Admin)
-- Nota: Não criamos policy de INSERT/UPDATE aqui pois será feito via Edge Function com Service Role

-- ============================================
-- POLICIES: lancamentos
-- ============================================

-- LEITURA (SELECT)
-- Gerente Geral: Vê tudo
CREATE POLICY "lancamentos_select_geral" ON public.lancamentos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

-- Chefe de Equipe: Vê dados de toda a sua Base
CREATE POLICY "lancamentos_select_chefe" ON public.lancamentos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            AND profiles.base_id = lancamentos.base_id
        )
    );

-- ESCRITA (INSERT)
-- Gerente Geral: Pode inserir tudo
CREATE POLICY "lancamentos_insert_geral" ON public.lancamentos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

-- Chefe de Equipe: Pode inserir apenas para sua equipe
CREATE POLICY "lancamentos_insert_chefe" ON public.lancamentos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            AND profiles.base_id = lancamentos.base_id
            AND profiles.equipe_id = lancamentos.equipe_id
        )
    );

-- EDIÇÃO (UPDATE)
-- Gerente Geral: Pode editar tudo
CREATE POLICY "lancamentos_update_geral" ON public.lancamentos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

-- Chefe de Equipe: Pode editar apenas dados da sua equipe
CREATE POLICY "lancamentos_update_chefe" ON public.lancamentos
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            AND profiles.equipe_id = lancamentos.equipe_id
        )
    );

-- EXCLUSÃO (DELETE)
-- Gerente Geral: Pode excluir tudo
CREATE POLICY "lancamentos_delete_geral" ON public.lancamentos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'geral'
        )
    );

-- Chefe de Equipe: Pode excluir apenas dados da sua equipe
CREATE POLICY "lancamentos_delete_chefe" ON public.lancamentos
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            AND profiles.equipe_id = lancamentos.equipe_id
        )
    );

-- ============================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_lancamentos
    BEFORE UPDATE ON public.lancamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- INSERÇÕES INICIAIS DE DADOS
-- ============================================

-- Inserir 34 bases aeroportuárias
INSERT INTO public.bases (nome) VALUES
    ('ALTAMIRA'),
    ('ARACAJU'),
    ('BACACHERI'),
    ('BELEM'),
    ('BRASILIA'),
    ('CAMPO DE MARTE'),
    ('CARAJAS'),
    ('CONFINS'),
    ('CONGONHAS'),
    ('CUIABA'),
    ('CURITIBA'),
    ('FLORIANÓPOLIS'),
    ('FOZ do IGUAÇU'),
    ('GOIANIA'),
    ('IMPERATRIZ'),
    ('JACAREPAGUA'),
    ('JOINVILE'),
    ('LONDRINA'),
    ('MACAE'),
    ('MACAPA'),
    ('MACEIO'),
    ('MARABA'),
    ('NAVEGANTES'),
    ('PALMAS'),
    ('PAMPULHA'),
    ('PELOTAS'),
    ('PETROLINA'),
    ('PORTO ALEGRE'),
    ('SALVADOR'),
    ('SANTAREM'),
    ('SÃO LUIZ'),
    ('SINOP'),
    ('TERESINA'),
    ('VITORIA')
ON CONFLICT (nome) DO NOTHING;

-- Inserir 5 equipes padrão
INSERT INTO public.equipes (nome) VALUES
    ('ALFA'),
    ('BRAVO'),
    ('CHARLIE'),
    ('DELTA'),
    ('FOXTROT')
ON CONFLICT (nome) DO NOTHING;

-- Inserir 14 indicadores
INSERT INTO public.indicadores_config (nome, schema_type) VALUES
    ('Ocorrência Aeronáutica', 'ocorrencia_aero'),
    ('Ocorrência Não Aeronáutica', 'ocorrencia_nao_aero'),
    ('Atividades Acessórias', 'atividades_acessorias'),
    ('Teste de Aptidão Física (TAF)', 'taf'),
    ('Prova Teórica (PTR-BA)', 'prova_teorica'),
    ('Horas de Treinamento Mensal', 'treinamento'),
    ('Inspeção de Viaturas', 'inspecao_viaturas'),
    ('Tempo de TP/EPR', 'tempo_tp_epr'),
    ('Tempo Resposta', 'tempo_resposta'),
    ('Controle de Estoque', 'estoque'),
    ('Controle de Trocas', 'controle_trocas'),
    ('Verificação de TP', 'verificacao_tp'),
    ('Higienização de TP', 'higienizacao_tp'),
    ('Controle de EPI', 'controle_epi')
ON CONFLICT (nome) DO NOTHING;

-- ============================================
-- COMENTÁRIOS NAS TABELAS (Documentação)
-- ============================================
COMMENT ON TABLE public.bases IS 'Catálogo das 34 bases aeroportuárias';
COMMENT ON TABLE public.equipes IS 'Catálogo das 5 equipes padrão (ALFA, BRAVO, CHARLIE, DELTA, FOXTROT)';
COMMENT ON TABLE public.indicadores_config IS 'Configuração dos 14 indicadores operacionais';
COMMENT ON TABLE public.profiles IS 'Perfis de usuários vinculados ao auth.users';
COMMENT ON TABLE public.lancamentos IS 'Tabela central (Single Source of Truth) com dados variáveis em JSONB';

COMMENT ON COLUMN public.profiles.role IS 'Role do usuário: geral (Gerente Geral) ou chefe (Chefe de Equipe)';
COMMENT ON COLUMN public.lancamentos.conteudo IS 'Dados variáveis do indicador em formato JSONB';
COMMENT ON COLUMN public.lancamentos.data_referencia IS 'Data de referência do lançamento (formato DATE)';
