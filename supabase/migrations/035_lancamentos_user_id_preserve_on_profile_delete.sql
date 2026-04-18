-- Preservar lançamentos ao excluir perfil/usuário: user_id opcional + ON DELETE SET NULL
-- (antes: NOT NULL + ON DELETE CASCADE apagava todo o histórico do autor)

ALTER TABLE public.lancamentos
  DROP CONSTRAINT IF EXISTS lancamentos_user_id_fkey;

ALTER TABLE public.lancamentos
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.lancamentos
  ADD CONSTRAINT lancamentos_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

COMMENT ON COLUMN public.lancamentos.user_id IS
  'Autor do lançamento (FK profiles). NULL se o perfil foi excluído — o registro histórico permanece.';
