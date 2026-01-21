📋 PRD MASTER - Sistema de Gestão de Indicadores Operacionais
1. Visão Geral
Sistema web para gestão de indicadores de 34 bases aeroportuárias. Foco em integridade de dados (JSONB), segurança (RLS) e BI (Dashboards).

2. Stack Tecnológica
Frontend: React (Vite) + TypeScript.
UI: Tailwind CSS + shadcn/ui.
Charts: Recharts (via shadcn/ui charts). Obs: Gráficos circulares devem ser sempre ROSCA (Donut).
Data: TanStack Query + Supabase.
Forms: React Hook Form + Zod (Schema Validation).

3. Segurança e Atores
Gerente Geral: Acesso irrestrito. Pode cadastrar usuários.

Chefe de Equipe:
Leitura: Vê dados de toda a sua Base (para comparação).
Escrita: Insere/Edita apenas para sua Equipe.

4. Estrutura de Dados (Supabase)

A. Tabelas de Catálogo (Dados Estáticos)

O script SQL de inicialização deve criar e popular estas tabelas automaticamente:
bases: Tabela contendo exatamente as 34 bases abaixo:
Dados: "ALTAMIRA", "ARACAJU", "BACACHERI", "BELEM", "BRASILIA", "CAMPO DE MARTE", "CARAJAS", "CONFINS", "CONGONHAS", "CUIABA", "CURITIBA", "FLORIANÓPOLIS", "FOZ do IGUAÇU", "GOIANIA", "IMPERATRIZ", "JACAREPAGUA", "JOINVILE", "LONDRINA", "MACAE", "MACAPA", "MACEIO", "MARABA", "NAVEGANTES", "PALMAS", "PAMPULHA", "PELOTAS", "PETROLINA", "PORTO ALEGRE", "SALVADOR", "SANTAREM", "SÃO LUIZ", "SINOP", "TERESINA", "VITORIA".

equipes: Tabela contendo as 5 equipes padrão:

Dados: "ALFA", "BRAVO", "CHARLIE", "DELTA", "FOXTROT".

indicadores_config: Lista dos 14 indicadores.

Campos: id, nome, schema_type (identificador técnico).

Dados:
"Ocorrência Aeronáutica" (ocorrencia_aero)
"Ocorrência Não Aeronáutica" (ocorrencia_nao_aero)
"Atividades Acessórias" (atividades_acessorias)
"Teste de Aptidão Física (TAF)" (taf)
"Prova Teórica (PTR-BA)" (prova_teorica)
"Horas de Treinamento Mensal" (treinamento)
"Inspeção de Viaturas" (inspecao_viaturas)
"Tempo de TP/EPR" (tempo_tp_epr)
"Tempo Resposta" (tempo_resposta)
"Controle de Estoque" (estoque)
"Controle de Trocas" (controle_trocas)
"Verificação de TP" (verificacao_tp)
"Higienização de TP" (higienizacao_tp)
"Controle de EPI" (controle_epi)

B. Tabelas de Sistema

profiles: Tabela de usuários (vinculada ao auth.users).
Campos: id (PK, UUID), nome, role ('geral' ou 'chefe'), base_id (FK bases), equipe_id (FK equipes).
lancamentos: Tabela central (Single Source of Truth).
Estratégia: Uso de JSONB para dados variáveis.
Campos: id, created_at, data_referencia, base_id (FK), equipe_id (FK), user_id (FK), indicador_id (FK), conteudo (JSONB).

C. Segurança (Row Level Security - RLS)

Profiles: Leitura pública (para o sistema saber quem é quem), Escrita apenas via Admin (Service Role).
Lancamentos (Leitura):
Se role == 'geral': TRUE (Vê tudo).
Se role == 'chefe': lancamento.base_id == profile.base_id (Vê a base toda).
Lancamentos (Escrita/Edição/Exclusão):
Se role == 'chefe': lancamento.equipe_id == profile.equipe_id (Só mexe na sua equipe).

5. Especificação Técnica dos Formulários (Inputs & Lógica)
Regra Global: Todos os formulários possuem Base e Equipe (Automáticos/Read-only) e Data (dd/mm/aaaa).
Máscaras de Tempo: Inputs de horário devem formatar automaticamente (ex: digita 1400 -> vira 14:00).

GRUPO A: Ocorrências e Eventos (Campos Fixos)

1. Ocorrência Aeronáutica
Mensagem de Apoio: "Preenchido sempre que tiver uma ocorrência"
Campos:
tipo_ocorrencia: Input travado (Value: "Emergência aeronáutica").
acao: Select ("Posicionamento", "Intervenção").
local: Texto.
hora_acionamento: Texto (Máscara HH:mm).
tempo_chegada_1_cci: Texto (Máscara mm:ss, Max 59:59).
tempo_chegada_ult_cci: Texto (Máscara mm:ss, Max 59:59).
termino_ocorrencia: Texto (Máscara HH:mm).

2. Ocorrência Não Aeronáutica
Mensagem de Apoio: "Preenchido sempre que tiver uma ocorrência."
Campos:
tipo_ocorrencia: Select (Opções Exatas: "Incêndios ou Vazamentos de Combustíveis no PAA", "Condições de Baixa Visibilidade", "Atendimento a Aeronave Presidencial", "Incêndio em Instalações Aeroportuárias", "Ocorrências com Artigos Perigosos", "Remoção de Animais e Dispersão de Avifauna", "Incêndios Florestais", "Emergências Médicas em Geral", "Iluminação de Emergência em Pista").
local: Texto.
hora_acionamento: Texto (Máscara HH:mm).
hora_chegada: Texto (Máscara HH:mm).
hora_termino: Texto (Máscara HH:mm).
duracao_total: Calculado Automaticamente (Hora Término - Hora Acionamento). Formato HH:mm. Read-only.
observacoes: Textarea (Opcional).

3. Atividades Acessórias
Mensagem de Apoio: "Preenchido sempre que realizado atividade no plantão."
Campos:
tipo_atividade: Select ("Inspeção de extintores e mangueiras", "Inspeção de pista", "Inspeção de fauna", "Derramamento de combustível", "Acompanhamento de serviços", "inspeção área de cessionários", "atividade não prevista").
Lógica Condicional:
Se tipo_atividade == "atividade não prevista": Ocultar os campos abaixo e permitir salvar.
Senão (Outros tipos): Exigir preenchimento de:
qtd_equipamentos: Número (Min 0).
qtd_bombeiros: Número (Min 1).
tempo_gasto: Texto (Máscara HH:mm).

GRUPO B: Listas Dinâmicas (Uso de useFieldArray)
Nestes formulários, o usuário pode clicar em "Adicionar Linha" para inserir múltiplos itens.

4. Teste de Aptidão Física (TAF)
Estrutura: Lista de Avaliados. Iniciar com 10 linhas vazias.
Campos por Linha:
nome: Texto.
idade: Número.
tempo: Texto (Máscara mm:ss, Max 04:59).
status: Calculado Automaticamente.
Regra < 40 anos: Tempo <= 2:00 (Nota 10), <= 2:20 (Nota 9), <= 2:40 (Nota 8), <= 3:00 (Nota 7), > 3:00 (Reprovado).
Regra >= 40 anos: Tempo <= 3:00 (Nota 10), <= 3:20 (Nota 9), <= 3:40 (Nota 8), <= 4:00 (Nota 7), > 4:00 (Reprovado).

5. Prova Teórica (PTR-BA)
Estrutura: Lista de Avaliados (Padrão 10 linhas).
Campos por Linha:
nome: Texto.
nota: Número Decimal (0.0 a 10.0).
status: Calculado Automaticamente. (Nota < 8.0 = "Reprovado", >= 8.0 = "Aprovado").

6. Horas de Treinamento Mensal
Estrutura: Lista de Participantes (Padrão 10 linhas).
Campos por Linha:
nome: Texto.
horas: Texto (Máscara HH:mm).

7. Inspeção de Viaturas
Estrutura: Lista de Inspeções (Padrão 4 linhas).
Campos por Linha:
viatura: Select (Opções: "CCI 01", "CCI 02", "CCI 03", "CCI 04", "CCI 05", "CCI 06", "CRS 01", "CRS 02", "CRS 03", "CCI RT 01", "CCI RT 02", "CCI RT 03", "CA 01", "CA 02").
qtd_inspecoes: Número.
qtd_nao_conforme: Número.

8. Tempo de TP/EPR
Estrutura: Lista de Avaliados (Padrão 10 linhas).
Campos por Linha:
nome: Texto.
tempo: Texto (Máscara mm:ss, Max 04:59).
status: Calculado Automaticamente. (Tempo <= 00:59 = "Aprovado", > 00:59 = "Reprovado").

9. Tempo Resposta
Estrutura: Lista de Aferições (Padrão 4 linhas).
Campos por Linha:
viatura: Select (Mesma lista do item 7).
motorista: Texto (Nome do BA-MC).
local: Texto.
tempo: Texto (Máscara mm:ss, Max 04:59).

14. Controle de EPI
Estrutura: Lista de Colaboradores (Padrão 10 linhas).
Campos por Linha:
nome: Texto.
epi_entregue: Número.
epi_previsto: Número.
unif_entregue: Número.
unif_previsto: Número.
total_epi_pct: Calculado (% EPI Entregue / Previsto).
total_unif_pct: Calculado (% Unif Entregue / Previsto).


GRUPO C: Controles Estáticos e Estoque

10. Controle de Estoque
UX: Inputs devem permitir digitar número, mas exibir sufixo (KG, L, Und).
Campos:
po_quimico_atual (KG), po_quimico_exigido (KG).
lge_atual (L), lge_exigido (L).
nitrogenio_atual (Und), nitrogenio_exigido (Und).

11. Controle de Trocas
Campos: qtd_trocas (Número).

12. Verificação de TP
Campos: qtd_conformes, qtd_verificados, qtd_total_equipe (Todos números).

13. Higienização de TP
Campos: qtd_higienizados_mes, qtd_total_sci (Todos números).

6. Funcionalidades de Interface (UX)

Tela 1: Login
Autenticação via Supabase Auth.

Tela 2: Painel do Chefe (Dashboard & Histórico)

Histórico: Tabela com lançamentos da Base.

Regra: Pode Editar/Excluir apenas dados da sua Equipe. Dados de outras equipes da mesma base são "Read-only" (apenas visualização).
Modal de Detalhes: Ao clicar em "Ver", abre o formulário preenchido em modo readOnly={true}.

Tela 3: Dashboard Gerencial
Filtros Globais: Base, Equipe, Período.
Botão "Gestão de Usuários" (Admin).

Tela 4: Admin - Gestão de Usuários (Apenas Gerente Geral)
Objetivo: Cadastrar os Chefes de Equipe e vincular corretamente à Base/Equipe.

Visualização:
Tabela listando todos os usuários cadastrados (Nome | Email | Base | Equipe | Perfil).
Botão "Adicionar Novo Usuário" no topo.

Formulário de Cadastro (Modal):
Nome Completo: Texto.
Email: Email (Será o login).
Senha Provisória: Password (min 6 chars).
Perfil (Role): Select ("Gerente Geral" ou "Chefe de Equipe").
Base: Select (Carregar lista da tabela bases). Obrigatório se for Chefe.
Equipe: Select (Carregar lista da tabela equipes). Obrigatório se for Chefe.

Ação de Salvar:
IMPORTANTE: O Frontend NÃO deve usar supabase.auth.signUp (pois isso desloga o admin).
O Frontend deve chamar a Edge Function create-user passando os dados.

7. Módulo de Analytics (Dashboard da Diretoria) - CRÍTICO
Arquitetura: Filtros Globais (Base/Data/Equipe) + Abas por Indicador.
Especificações Gráficas por Indicador:

1. Ocorrência Aeronáutica
KPIs: Total Ocorrências | Maior tempo 1ª viatura | Maior tempo última viatura | Total Horas Somadas.
Gráfico: Linha (Evolução mensal).
Listas: Por Localidade | Lista Geral Detalhada.

2. Ocorrência Não Aeronáutica
KPIs: Total Ocorrências | Total Horas Somadas.
Gráficos: Linha (Evolução mensal) | Barras (Top 5 Tipos) | Barras (Tempo Total por mês).
Listas: Por Localidade | Lista Geral Detalhada.

3. Teste de Aptidão Física (TAF)
KPIs: Menor Tempo | Tempo Médio | Tempo Máximo.
Gráficos: Barras (Distribuição Minutos) | Barras (Média por Equipe) | Rosca (% Aprovado/Reprovado) | Linha (Evolução Média Mensal) | Scatter/Barra (Média por Idade).

4. Tempo TP/EPR
KPIs: Menor Tempo | Tempo Médio | Tempo Máximo.
Gráficos: Linha (Evolução Média Mensal) | Barras (Desempenho por Equipe).
Lista: Completa com status.

5. Tempo Resposta
KPIs: Menor Tempo (Exibir Motorista+Viatura) | Maior Tempo (Exibir Motorista+Viatura).
Gráfico: Linha (Evolução Tempo Médio Mensal).
Lista: Completa detalhada.

6. Horas de Treinamento
Gráficos: Linha (Média Horas Mensal) | Barras (Total Horas por Equipe) | Linha (Total Absoluto Mensal).
Lista: Completa.

8. Instruções Técnicas para o Cursor (Coding Steps)

1.1. Edge Function (create-user)
Como a criação de usuários requer permissão de admin e não pode interromper a sessão atual:
Crie uma função Supabase (supabase functions new create-user).
Lógica:
Receber o payload: { email, password, nome, role, base_id, equipe_id }.
Instanciar o createClient usando a SUPABASE_SERVICE_ROLE_KEY (acesso admin).
Executar auth.admin.createUser({ email, password, email_confirm: true }).
Pegar o ID gerado e inserir na tabela public.profiles com os dados recebidos.
Retornar sucesso ou erro para o frontend.
Database: Gerar SQL para criar tabelas, JSONB e Policies RLS rigorosas.
Forms: Criar os 14 formulários em src/components/forms/. Use zod para validação e useFieldArray para as listas dinâmicas. Implementar a lógica de cálculo (ex: Notas do TAF) dentro do form usando watch ou useEffect.
Dashboards: Implementar src/lib/analytics-utils.ts para processar (flatten/group) os dados JSONB antes de jogar nos gráficos Recharts.