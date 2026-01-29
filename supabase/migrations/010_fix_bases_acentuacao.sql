-- ============================================
-- MIGRATION: Corrigir acentuação dos nomes das bases
-- ============================================
-- Atualiza os nomes das bases para a grafia correta em português.
-- Os modais e listas do frontend exibem o campo nome da tabela bases;
-- ao corrigir aqui, a exibição fica correta em toda a aplicação.

UPDATE public.bases SET nome = 'BELÉM' WHERE nome = 'BELEM';
UPDATE public.bases SET nome = 'BRASÍLIA' WHERE nome = 'BRASILIA';
UPDATE public.bases SET nome = 'CARAJÁS' WHERE nome = 'CARAJAS';
UPDATE public.bases SET nome = 'CUIABÁ' WHERE nome = 'CUIABA';
UPDATE public.bases SET nome = 'GOIÂNIA' WHERE nome = 'GOIANIA';
UPDATE public.bases SET nome = 'JACAREPAGUÁ' WHERE nome = 'JACAREPAGUA';
UPDATE public.bases SET nome = 'JOINVILLE' WHERE nome = 'JOINVILE';
UPDATE public.bases SET nome = 'MACAÉ' WHERE nome = 'MACAE';
UPDATE public.bases SET nome = 'MACAPÁ' WHERE nome = 'MACAPA';
UPDATE public.bases SET nome = 'MACEIÓ' WHERE nome = 'MACEIO';
UPDATE public.bases SET nome = 'MARABÁ' WHERE nome = 'MARABA';
UPDATE public.bases SET nome = 'SANTARÉM' WHERE nome = 'SANTAREM';
UPDATE public.bases SET nome = 'SÃO LUÍS' WHERE nome = 'SÃO LUIZ';
UPDATE public.bases SET nome = 'VITÓRIA' WHERE nome = 'VITORIA';
