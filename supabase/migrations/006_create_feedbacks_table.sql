-- Migration: Criar tabela feedbacks para suporte e feedback dos usuários

-- Criar tabela feedbacks
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('bug', 'sugestao', 'outros')),
  mensagem TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'resolvido', 'fechado'))
);

-- Criar índice para melhorar performance de consultas por usuário
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON public.feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON public.feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON public.feedbacks(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Política: Usuários autenticados podem criar feedbacks
CREATE POLICY "Usuários autenticados podem criar feedbacks"
  ON public.feedbacks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Usuários podem ver seus próprios feedbacks
CREATE POLICY "Usuários podem ver seus próprios feedbacks"
  ON public.feedbacks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Política: Gerentes Gerais podem ver todos os feedbacks
CREATE POLICY "Gerentes Gerais podem ver todos os feedbacks"
  ON public.feedbacks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'geral'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE public.feedbacks IS 'Tabela para armazenar feedbacks, sugestões e relatórios de bugs dos usuários';
COMMENT ON COLUMN public.feedbacks.tipo IS 'Tipo do feedback: bug, sugestao ou outros';
COMMENT ON COLUMN public.feedbacks.status IS 'Status do feedback: pendente, em_andamento, resolvido ou fechado';
