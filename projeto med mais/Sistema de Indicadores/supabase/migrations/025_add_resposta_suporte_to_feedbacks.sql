-- Coluna para o administrador responder ao feedback/suporte com texto livre
ALTER TABLE public.feedbacks
ADD COLUMN IF NOT EXISTS resposta_suporte TEXT;

COMMENT ON COLUMN public.feedbacks.resposta_suporte IS 'Resposta em texto do suporte/administrador ao feedback do usuário';
