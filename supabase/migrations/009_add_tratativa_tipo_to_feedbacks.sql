-- Adicionar coluna tratativa_tipo para o administrador registrar o tipo de tratativa realizada
ALTER TABLE public.feedbacks
ADD COLUMN IF NOT EXISTS tratativa_tipo TEXT;

COMMENT ON COLUMN public.feedbacks.tratativa_tipo IS 'Tipo de tratativa realizada pelo suporte: correcao_aplicada, em_analise, respondido_usuario, fechado_sem_alteracao, outros';

-- Política: Gerentes Gerais podem atualizar feedbacks (status e tratativa_tipo)
CREATE POLICY "Gerentes Gerais podem atualizar feedbacks"
  ON public.feedbacks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'geral'
    )
  )
  WITH CHECK (true);
