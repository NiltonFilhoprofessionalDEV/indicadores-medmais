-- Nome do autor persistido no lançamento (permanece após exclusão do perfil/usuário)

ALTER TABLE public.lancamentos
  ADD COLUMN IF NOT EXISTS autor_nome TEXT;

UPDATE public.lancamentos l
SET autor_nome = p.nome
FROM public.profiles p
WHERE l.user_id = p.id
  AND (l.autor_nome IS NULL OR TRIM(l.autor_nome) = '');

COMMENT ON COLUMN public.lancamentos.autor_nome IS
  'Nome do autor no momento do registro; mantido para exibição após exclusão da conta (user_id pode ser NULL).';
