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
bases: Tabela contendo as 34 bases aeroportuárias + 1 base administrativa (total: 35 bases):
Bases Aeroportuárias: "ALTAMIRA", "ARACAJU", "BACACHERI", "BELEM", "BRASILIA", "CAMPO DE MARTE", "CARAJAS", "CONFINS", "CONGONHAS", "CUIABA", "CURITIBA", "FLORIANÓPOLIS", "FOZ do IGUAÇU", "GOIANIA", "IMPERATRIZ", "JACAREPAGUA", "JOINVILE", "LONDRINA", "MACAE", "MACAPA", "MACEIO", "MARABA", "NAVEGANTES", "PALMAS", "PAMPULHA", "PELOTAS", "PETROLINA", "PORTO ALEGRE", "SALVADOR", "SANTAREM", "SÃO LUIZ", "SINOP", "TERESINA", "VITORIA".
Base Administrativa: "ADMINISTRATIVO" (usada para organizar usuários com perfil de Gerente Geral).

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

colaboradores: Tabela de efetivo (colaboradores) das bases.
Campos: id (PK, UUID), created_at, nome (TEXT), base_id (FK bases), ativo (BOOLEAN, default true).
RLS: Leitura permitida para autenticados da mesma base; Escrita apenas para Admin (Service Role).

lancamentos: Tabela central (Single Source of Truth).
Estratégia: Uso de JSONB para dados variáveis.
Campos: id, created_at, updated_at, data_referencia (DATE), base_id (FK), equipe_id (FK), user_id (FK), indicador_id (FK), conteudo (JSONB).
IMPORTANTE: Permite múltiplos lançamentos para o mesmo indicador no mesmo dia (sem constraint UNIQUE). O salvamento é sempre um novo INSERT.

C. Segurança (Row Level Security - RLS)

Profiles: Leitura pública (para o sistema saber quem é quem), Escrita apenas via Admin (Service Role).

Colaboradores: 
Leitura: Autenticados da mesma base (geral vê tudo, chefe vê apenas sua base).
Escrita: Apenas Admin (Service Role).

Lancamentos (Leitura):
Se role == 'geral': TRUE (Vê tudo).
Se role == 'chefe': lancamento.base_id == profile.base_id (Vê a base toda).
Lancamentos (Escrita/Edição/Exclusão):
Se role == 'chefe': lancamento.equipe_id == profile.equipe_id (Só mexe na sua equipe).
IMPORTANTE: O sistema sempre faz INSERT (não UPDATE) para permitir múltiplos lançamentos no mesmo dia.

5. Especificação Técnica dos Formulários (Inputs & Lógica)
Regra Global: Todos os formulários possuem Base e Equipe (Automáticos/Read-only) e Data (dd/mm/aaaa).
Máscaras de Tempo: Inputs de horário devem formatar automaticamente (ex: digita 1400 -> vira 14:00).

CORREÇÃO CRÍTICA - Formato de Datas (Timezone Offset):
- PROBLEMA: Ao converter Date para string, o JavaScript usa UTC, causando bug de D-1 (dia anterior) em timezones negativos como Brasil (UTC-3).
- SOLUÇÃO IMPLEMENTADA:
  - Função `formatDateForStorage(date: Date)`: Converte Date para YYYY-MM-DD usando métodos locais (getFullYear, getMonth, getDate), NÃO usa .toISOString().
  - Função `formatDateForDisplay(dateString: string)`: Converte YYYY-MM-DD do banco para DD/MM/YYYY usando .split('-'), NÃO instancia new Date() para evitar timezone.
- Todos os formulários usam `formatDateForStorage` no onSubmit antes de enviar ao Supabase.
- Todas as tabelas (Histórico e Dashboard) usam `formatDateForDisplay` para exibir datas.
- O campo data_referencia no banco é do tipo DATE.

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
hora_termino_ocorrencia: Texto (Máscara HH:mm) - Label: "Hora do término da ocorrência".

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
nome: Select (Lista colaboradores ativos da Base do usuário logado - integrado com tabela colaboradores).
idade: Número.
tempo: Texto (Máscara mm:ss, Max 04:59).
status: Calculado Automaticamente em Tempo Real (atualiza enquanto usuário digita).
Regra < 40 anos: Tempo <= 2:00 (Nota 10), <= 2:20 (Nota 9), <= 2:40 (Nota 8), <= 3:00 (Nota 7), > 3:00 (Reprovado).
Regra >= 40 anos: Tempo <= 3:00 (Nota 10), <= 3:20 (Nota 9), <= 3:40 (Nota 8), <= 4:00 (Nota 7), > 4:00 (Reprovado).

5. Prova Teórica (PTR-BA)
Estrutura: Lista de Avaliados (Padrão 10 linhas).
Campos por Linha:
nome: Select (Lista colaboradores ativos da Base do usuário logado - integrado com tabela colaboradores).
nota: Número Decimal (0.0 a 10.0).
status: Calculado Automaticamente em Tempo Real (atualiza enquanto usuário digita a nota). (Nota < 8.0 = "Reprovado", >= 8.0 = "Aprovado").

6. Horas de Treinamento Mensal
Estrutura: Lista de Participantes (Padrão 10 linhas).
Campos por Linha:
nome: Select (Lista colaboradores ativos da Base do usuário logado - integrado com tabela colaboradores).
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
nome: Select (Lista colaboradores ativos da Base do usuário logado - integrado com tabela colaboradores).
tempo: Texto (Máscara mm:ss, Max 04:59).
status: Calculado Automaticamente em Tempo Real (atualiza enquanto usuário digita o tempo). (Tempo <= 00:59 = "Aprovado", > 00:59 = "Reprovado").

9. Tempo Resposta
Estrutura: Lista de Aferições (Padrão 4 linhas).
Campos por Linha:
viatura: Select (Mesma lista do item 7).
motorista: Select (Lista colaboradores ativos da Base do usuário logado - integrado com tabela colaboradores).
local: Texto.
tempo: Texto (Máscara mm:ss, Max 04:59).
Layout: Grid corrigido para alinhamento visual adequado (items-start para alinhar botão Remover).

14. Controle de EPI
Estrutura: Lista de Colaboradores (Padrão 10 linhas).
Campos por Linha:
nome: Select (Lista colaboradores ativos da Base do usuário logado - integrado com tabela colaboradores).
epi_entregue: Número.
epi_previsto: Número.
unif_entregue: Número.
unif_previsto: Número.
total_epi_pct: Calculado Automaticamente em Tempo Real (% EPI Entregue / Previsto - atualiza enquanto usuário digita).
total_unif_pct: Calculado Automaticamente em Tempo Real (% Unif Entregue / Previsto - atualiza enquanto usuário digita).


GRUPO C: Controles Estáticos e Estoque

10. Controle de Estoque
UX: Inputs devem permitir digitar número, mas exibir sufixo (KG, L, Und). Campos iniciam vazios (sem defaultValue: 0).
Campos:
po_quimico_atual (KG), po_quimico_exigido (KG).
lge_atual (L), lge_exigido (L).
nitrogenio_atual (Und), nitrogenio_exigido (Und).

11. Controle de Trocas
Campos: qtd_trocas (Número). Campo inicia vazio (sem defaultValue: 0).

12. Verificação de TP
Campos: qtd_conformes, qtd_verificados, qtd_total_equipe (Todos números).

13. Higienização de TP
Campos: qtd_higienizados_mes, qtd_total_sci (Todos números). Campos iniciam vazios (sem defaultValue: 0).

6. Funcionalidades de Interface (UX)

Tela 1: Login
Autenticação via Supabase Auth.

Tela 2: Painel do Chefe (Dashboard & Histórico)

Navegação:
- Header com botão "Painel de Indicadores" que navega para `/dashboard-analytics`.
- Permissão: Visível para role === 'chefe' e role === 'geral'.
- Experiência: O Chefe pode alternar facilmente entre "Lançamentos" (Operacional) e "Indicadores" (Analítico).
- No Analytics, quando o usuário for Chefe, aparece botão "Voltar ao Dashboard" no header para retornar ao painel operacional.

Histórico: Painel de Controle de Lançamentos Profissional

Estrutura:
- Barra de Ferramentas (Toolbar) com filtros dinâmicos:
  - Input de Busca: Busca por texto em campos como local, observações, tipo de ocorrência (busca no JSONB conteudo).
  - Select "Filtrar por Indicador": Lista todos os 14 indicadores disponíveis.
  - Select "Mês/Ano": Filtro por período (últimos 12 meses disponíveis).
  - Botão "Limpar Filtros": Reseta todos os filtros e retorna à primeira página.

- Tabela de Lançamentos (Visual "Excel Inteligente"):
  - Coluna DATA: Exibe data formatada usando formatDateForDisplay (DD/MM/YYYY) para evitar erros de timezone.
  - Coluna INDICADOR: Badge colorida por categoria:
    - Vermelho (destructive): Ocorrências Aeronáuticas e Não Aeronáuticas.
    - Azul/Preto (default): TAF, Prova Teórica, Treinamento, Tempo TP/EPR.
    - Cinza (secondary): Tempo Resposta, Inspeção de Viaturas.
    - Borda (outline): Estoque, Trocas, Higienização, EPI.
  - Coluna RESUMO: Texto curto e relevante extraído dinamicamente do JSONB conteudo:
    - Ocorrências: "Local: [nome do local]" ou "Tipo: [tipo]".
    - TAF/Treinamento/Prova Teórica: "[X] avaliados" ou "[X] colaboradores".
    - Estoque: "Pó Químico: [quantidade]kg" ou lista de itens principais.
    - Tempo Resposta: "[X] aferições".
    - Outros: Resumo específico conforme o tipo de indicador.
  - Colunas BASE e EQUIPE: Nomes das bases e equipes.
  - Coluna AÇÕES: Botões Ver/Editar/Excluir com regra de permissão:
    - Se for da minha equipe: Ver/Editar/Excluir disponíveis.
    - Se for de outra equipe: Apenas Ver (somente leitura).

- Paginação Server-Side:
  - Implementação: Usa .range(from, to) do Supabase para buscar apenas os registros da página atual.
  - Tamanho de página: 20 registros por página (configurável).
  - Ordenação: Sempre data_referencia decrescente (mais recente primeiro).
  - Rodapé de Paginação:
    - Exibe "Página X de Y ([total] lançamentos)".
    - Botões "Anterior" e "Próximo" com estados disabled quando apropriado.
    - Scroll automático para o topo da tabela ao mudar de página.

Regra de Permissão: Pode Editar/Excluir apenas dados da sua Equipe. Dados de outras equipes da mesma base são "Read-only" (apenas visualização).
Modal de Detalhes: Ao clicar em "Ver", abre o formulário preenchido em modo readOnly={true}.

Tela 3: Dashboard Gerencial
Filtros Globais: Base, Equipe, Período.
Botão "Gestão de Usuários" (Admin).

Tela 4: Admin - Gestão de Usuários (Apenas Gerente Geral)

Tela 5: Monitoramento de Aderência (Compliance) - Apenas Gerente Geral
**Objetivo:** Identificar quais bases estão cumprindo a rotina de lançamentos e auditar o engajamento das bases no uso do sistema.

**Estrutura da Tela:**

1. **Filtros:**
   - Mês/Ano de Referência: Input tipo `month` para selecionar o período a ser analisado (padrão: mês atual).

2. **Widget: Usuários Inativos:**
   - Card destacado em laranja no topo da tela.
   - Título: "Usuários Cadastrados sem Acesso há > 30 dias".
   - Descrição: Contador de usuários sem lançamentos nos últimos 30 dias.
   - Lista: Exibe os nomes dos usuários inativos (Chefes de Equipe sem atividade recente).
   - Aparece apenas quando há usuários inativos.

3. **Tabela de Aderência:**
   - **Coluna 1:** Nome da Base (34 bases aeroportuárias, excluindo ADMINISTRATIVO).
   - **Coluna 2 - Rotina Diária (Grupo A):**
     - Ícones de status para "Atividades Acessórias" e "Horas de Treinamento Mensal".
     - ✅ (Verde): Hoje OK - lançamento hoje.
     - ⚠️ (Amarelo): Ontem Pendente - último lançamento ontem.
     - ❌ (Vermelho): Sem lançamentos há 2+ dias.
   - **Coluna 3 - Pendências Mensais (Grupo C):**
     - Contador: "X de 9 entregues".
     - ✅ (Verde): Compliance - 9 de 9 entregues.
     - 🟡 (Amarelo): Pendente - mês aberto, faltam indicadores.
     - 🔴 (Vermelho): Não Conforme - mês fechado sem completar.
     - Tooltip: Ao passar o mouse no ícone de informação, mostra quais indicadores estão faltando.
   - **Coluna 4 - Última Ocorrência (Grupo B):**
     - Mostra data do último registro no formato "Último: DD/MM/YYYY".
     - Cor neutra/cinza (sem alerta de atraso).

4. **Legenda:**
   - Card explicativo abaixo da tabela descrevendo o significado de cada símbolo e cor para os três grupos.

**Regras de Compliance (src/lib/compliance-rules.ts):**

**GRUPO A: Obrigação Diária (Rotina de Plantão)**
- Indicadores: 'Atividades Acessórias', 'Horas de Treinamento Mensal'.
- Regra de Monitoramento: Verifica se existe lançamento na Data Atual.
- Visual na Tabela: Ícone de status do dia (✅ Hoje OK | ⚠️ Ontem Pendente | ❌ Sem lançamentos há 2+ dias).
- Alerta: Destacar Bases/Equipes que estão há mais de 24h sem lançar esses itens.

**GRUPO B: Eventuais (Sem Alerta de Atraso)**
- Indicadores: 'Ocorrência Aeronáutica', 'Ocorrência Não Aeronáutica', 'Teste de Aptidão Física (TAF)'.
- Regra: Não existe "atraso", apenas mostra última data.
- Visual na Tabela: "Último: DD/MM/YYYY" (Cor neutra/cinza).

**GRUPO C: Obrigação Mensal (Meta do Mês)**
- Indicadores: 'Prova Teórica', 'Inspeção de Viaturas', 'Tempo de TP/EPR', 'Tempo Resposta', 'Controle de Estoque', 'Controle de Trocas', 'Verificação de TP', 'Higienização de TP', 'Controle de EPI' (total: 9 indicadores).
- Regra de Monitoramento: Verifica se existe pelo menos 1 lançamento dentro do Mês Atual.
- Visual na Tabela:
  - ✅ (Verde): Se tem lançamento no mês (9 de 9 entregues).
  - 🟡 (Amarelo/Pendente): Se não tem e o mês está aberto (faltam indicadores).
  - 🔴 (Vermelho/Não Conforme): Se virou o mês e não teve (mês fechado sem completar).

**Acesso:**
- Rota: `/aderencia`
- Permissão: Apenas `role === 'geral'` (Gerente Geral).
- Navegação: Card no Dashboard Administrador com botão "Acessar Aderência".

Tela 4: Admin - Gestão de Usuários (Apenas Gerente Geral)
Objetivo: Cadastrar e gerenciar os Chefes de Equipe e vincular corretamente à Base/Equipe.

Visualização:
Filtro Dinâmico por Base: Select acima da tabela com opção "Todas as Bases" (padrão) e lista de todas as bases disponíveis.
- Ao selecionar uma base específica: Mostra apenas Chefes de Equipe vinculados àquela base + Gerentes Gerais (que sempre aparecem).
- Ao selecionar "Todas as Bases": Mostra todos os usuários cadastrados.
- Comportamento: Gerentes Gerais (role='geral') sempre aparecem na lista, independente do filtro selecionado, para garantir que o administrador nunca desapareça da visualização.

Tabela listando todos os usuários cadastrados (Nome | Email | Base | Equipe | Perfil | Ações).
Botões no topo: "Adicionar Novo Usuário" e "Cadastro em Lote".
Coluna Ações: Botões "Editar" e "Remover" para cada usuário.

Formulário de Cadastro (Modal):
Nome Completo: Texto (obrigatório).
Email: Email (obrigatório no cadastro, opcional na edição).
Senha Provisória: Password (min 6 chars no cadastro, opcional na edição).
Perfil (Role): Select ("Gerente Geral" ou "Chefe de Equipe").
- Seleção Automática de Base: Quando o usuário seleciona "Gerente Geral", o campo Base é automaticamente preenchido com "ADMINISTRATIVO" e desabilitado (campo visual apenas, não editável). O campo Equipe não é exibido para Gerentes Gerais.
- Seleção Manual: Quando o usuário seleciona "Chefe de Equipe", os campos Base e Equipe aparecem normalmente e são obrigatórios para seleção manual.
Base: Select (Carregar lista da tabela bases). Obrigatório se for Chefe, automático se for Gerente Geral.
Equipe: Select (Carregar lista da tabela equipes). Obrigatório se for Chefe, não exibido se for Gerente Geral.

Modo Edição:
- Ao clicar em "Editar", o modal abre preenchido com os dados do usuário selecionado.
- Título do modal muda para "Editar Usuário".
- Campo Email: Opcional (placeholder: "Deixe em branco para manter o atual").
  - Se o email do usuário for "N/A", o campo é automaticamente limpo (vazio) para permitir edição.
  - Validação aceita: email válido, string vazia ou "N/A".
- Campo Senha: Opcional (placeholder: "Deixe em branco para manter a atual").
- Mensagem de ajuda: "Altere os dados do usuário. Deixe a senha em branco para manter a atual."
- Botão de ação: "Salvar Alterações".
- Tratamento de erros: Mensagens específicas quando Edge Function não está disponível ou retorna erro.

Cadastro em Lote (Bulk Action):
- Botão "Cadastro em Lote" abre modal largo (max-w-6xl) com formulário de múltiplos usuários.
- Interface: Tabela com linhas dinâmicas usando `useFieldArray` do React Hook Form.
- Estado Inicial: Formulário inicia com 5 linhas vazias pré-configuradas.
- Colunas por Linha:
  * Nome Completo (Input Texto obrigatório)
  * Email (Input Email obrigatório)
  * Senha (Input Password com botão "Gerar Senha Padrão" que preenche "Mudar@123")
  * Perfil (Select: Chefe ou Gerente)
  * Base (Select com funcionalidade "Replicar para Todos")
  * Equipe (Select com funcionalidade "Replicar para Todos")
  * Botão de Excluir Linha (Lixeira)
- Funcionalidade "Replicar para Todos":
  * Barra de ferramentas no topo das colunas Base e Equipe com botão "Aplicar a todos".
  * Ao selecionar uma Base/Equipe no topo e clicar em "Aplicar a todos", todas as linhas abaixo assumem o mesmo valor.
  * Facilita cadastro de equipe inteira de uma vez.
- Lógica de Envio:
  * Ao clicar em "Salvar Todos", mostra barra de progresso ("Salvando 1 de 5...").
  * Frontend itera sobre o array e chama a Edge Function `create-user` para cada linha sequencialmente (com delay de 300ms entre chamadas para evitar rate limit).
  * Tratamento de Erro Parcial: Se alguns salvarem e outros falharem, mostra resumo final com sucessos e falhas.
  * Exemplo: "4 Usuários criados com sucesso. 1 Falha: [Email]".
  * Exibe lista detalhada de resultados com ícones de sucesso/erro para cada usuário.
- Botões de Ação:
  * "+ Adicionar Linha" para adicionar mais linhas ao formulário.
  * "Cancelar" para fechar o modal sem salvar.
  * "Salvar Todos (N)" onde N é o número de linhas no formulário.

Ações:
- Criar Usuário: O Frontend chama a Edge Function create-user passando os dados.
- Criar Usuários em Lote: O Frontend itera sobre array de usuários e chama a Edge Function create-user sequencialmente para cada um, com tratamento de erros parciais.
- Editar Usuário: O Frontend chama a Edge Function update-user passando id, nome, role, base_id, equipe_id, email (opcional), password (opcional).
- Remover Usuário: O Frontend chama a Edge Function delete-user passando userId.

IMPORTANTE: O Frontend NÃO deve usar supabase.auth.signUp ou métodos diretos de auth (pois isso desloga o admin).
Todas as operações devem ser feitas via Edge Functions usando Service Role Key.

Tela 5: Admin - Gestão de Efetivo (Colaboradores) (Apenas Gerente Geral)
Objetivo: Cadastrar e gerenciar o efetivo (bombeiros/colaboradores) de cada base.

Estrutura da Página:
Topo: Select grande para escolher a Base que deseja gerenciar.
Meio: Tabela listando os colaboradores da base selecionada (Colunas: Nome | Status | Ações).
Botão de Ação: "Novo Colaborador" (após selecionar uma base).

Modal de Cadastro (Com duas abas/Tabs):
Ao clicar em "Novo Colaborador", abre um Dialog com duas abas:

Aba 1 (Individual):
- Input simples de Nome (obrigatório).
- Botão "Salvar" para criar um colaborador individual.

Aba 2 (Em Lote/Batch):
- Textarea grande com a instrução: "Cole a lista de nomes aqui (um por linha)".
- Lógica: Ao salvar, o sistema quebra o texto por quebra de linha (\n), limpa espaços vazios e faz um insert múltiplo na tabela colaboradores vinculado à base selecionada.
- Botão "Salvar X colaborador(es)" (onde X é a quantidade de nomes válidos encontrados).

Ações na Tabela:
- Editar: Permite corrigir o nome do colaborador (abre modal na aba Individual com dados preenchidos).
- Excluir: Permite remover o colaborador (com confirmação).

Integração:
- Hooks TanStack Query: useColaboradores(baseId), useCreateColaborador, useCreateColaboradoresBatch, useUpdateColaborador, useDeleteColaborador.
- A lista atualiza automaticamente após adicionar/remover (invalidateQueries).
- Todos os colaboradores são vinculados à base selecionada no momento do cadastro.

## 7. Módulo de Analytics (Dashboard Hub - Diretoria/ANAC)

**Conceito:** Dashboard com navegação lateral (Sidebar) para análise granular e individual dos indicadores críticos. Transforma dados técnicos em tomadas de decisão para a Diretoria.

**Acesso:**
- **Permissões:** Acessível para role === 'geral' (Gerente Geral) e role === 'chefe' (Chefe de Equipe).
- **Navegação:** 
  - No Dashboard do Chefe: Botão "Painel de Indicadores" no header que navega para `/dashboard-analytics`.
  - No Analytics: Quando o usuário for Chefe, aparece botão "Voltar ao Dashboard" no header para retornar ao painel operacional.
- **Rota:** `/dashboard-analytics` protegida por `ProtectedRoute` com `allowedRoles={['geral', 'chefe']}`.

**Arquitetura de Layout:**
- **Sidebar (Esquerda):** Menu de navegação lateral com categorias organizadas:
  - "Visão Geral" (Resumo de tudo)
  - "Ocorrências" (Submenu: Aero, Não Aero, Acessórias)
  - "Pessoal & Treino" (Submenu: TAF, Prova, Treino, TP/EPR)
  - "Frota" (Submenu: Tempo Resposta, Inspeção)
  - "Logística" (Agrupa Estoque, EPI, Trocas)
- **Conteúdo Principal (Centro):** Área dinâmica que muda conforme a visão selecionada
- **Barra de Filtros (Topo do Conteúdo):** Filtros específicos para cada visão usando componente `AnalyticsFilterBar`

**Filtros Dinâmicos (AnalyticsFilterBar):**
- **Filtros Globais (Sempre presentes):**
  1. **Base:** Select com opção "Todas as bases" + lista de bases
  2. **Equipe:** Select com opção "Todas as equipes" + lista de equipes
  3. **Data Início:** Input tipo date
  4. **Data Fim:** Input tipo date
- **Filtros Condicionais:**
  - **Filtro por Colaborador:** Aparece quando a visão é TAF, Prova Teórica, Treinamento ou TP/EPR
    - Select com lista de colaboradores ativos da base selecionada
    - Lógica: Se um colaborador for selecionado, os gráficos filtram os dados JSONB para mostrar apenas o histórico dele
  - **Filtro por Tipo de Ocorrência:** Aparece quando a visão é Ocorrência Aeronáutica ou Não Aeronáutica
    - Select com opções: "Todos os tipos", "Incêndio", "Resgate", "Emergência Médica", "Outros"

**Processamento de Dados:**
- Funções utilitárias em `src/lib/analytics-utils.ts` para "achatar" (flatten) dados JSONB antes de gerar gráficos
- Função `filterByColaborador()` para filtrar lançamentos por nome dentro de arrays JSONB (avaliados, participantes, afericoes, colaboradores)
- Todas as funções de processamento suportam filtragem por colaborador quando aplicável
- Função `generateExecutiveSummary()` para agregar dados de todos os indicadores para a Visão Geral executiva

### VISÃO GERAL (Cockpit Executivo - C-Level)

**Conceito:** Painel executivo de alto nível que agrega dados de todos os 14 indicadores para fornecer um panorama de saúde operacional da empresa. Funciona como um "cockpit" para tomada de decisão estratégica.

**Estrutura da Tela:**

#### 1. KPIs de Impacto (Scorecards com Tendência)
Quatro cards no topo usando Card do shadcn/ui:

1. **Volume Operacional:**
   - Valor: Soma total de ocorrências (Aero + Não Aero) no período filtrado
   - Tendência: Comparação com período anterior (30 dias antes) mostrando % de crescimento
   - Indicador visual: Ícone de TrendingUp (verde) ou TrendingDown (vermelho) conforme crescimento positivo ou negativo
   - Formato: "X ocorrências" + "% de crescimento vs período anterior"

2. **Agilidade (Tempo Resposta):**
   - Valor: Média global dos tempos de resposta convertida para formato mm:ss
   - Cor condicional:
     - Verde: Se tempo médio < 3 minutos
     - Amarelo: Se tempo médio ≥ 3 minutos
   - Badge: "Meta atingida" (verde) ou "Atenção necessária" (amarelo)
   - Ícone: Clock com cor correspondente

3. **Força de Trabalho:**
   - Valor: Soma total de Horas de Treinamento no período (formato hh:mm)
   - Ícone: Users (azul)
   - Descrição: "Total de horas de treinamento"

4. **Alertas Críticos (Risco):**
   - Valor: Contagem de bases que possuem ao menos 1 item de estoque abaixo do exigido OU 1 viatura não conforme
   - Indicador visual:
     - Se > 0: Ícone AlertTriangle vermelho + número em vermelho
     - Se = 0: Círculo verde + número em verde
   - Descrição: "X base(s) com alertas" ou "Nenhum alerta crítico"

#### 2. Gráfico Principal (Composed Chart)
Gráfico misto usando Recharts (Barra + Linha combinados):

- **Eixo X:** Meses (formato MMM/yyyy)
- **Barra (Eixo Y Esquerdo):** Volume de Ocorrências (soma de Aero + Não Aero por mês)
  - Cor: Laranja (#fc4d00)
  - Nome: "Ocorrências"
- **Linha (Eixo Y Direito):** Tempo Médio de Resposta (média dos tempos de resposta por mês)
  - Cor: Verde (#22c55e)
  - Nome: "Tempo Médio"
  - Formato do eixo: mm:ss
- **Objetivo:** Cruzar demanda (ocorrências) vs eficiência (tempo de resposta) para identificar correlações

#### 3. Painéis de Gestão por Exceção (Grid Inferior)
Dividido em dois painéis lado a lado:

**Painel Esquerdo - Ranking de Atividade:**
- Título: "Ranking de Atividade (Top 5 Bases)"
- Tipo: Gráfico de Barras Horizontais
- Dados: As 5 bases com mais ocorrências acumuladas no período
- Eixo X: Quantidade de ocorrências
- Eixo Y: Nome da base
- Cor: Laranja (#fc4d00)

**Painel Direito - Pontos de Atenção:**
- Título: "Pontos de Atenção"
- Tipo: Lista compacta de alertas gerados automaticamente
- Formato: Cards vermelhos com ícone AlertTriangle
- Cada alerta contém:
  - Nome da base (negrito, vermelho escuro)
  - Mensagem descritiva (texto menor, vermelho médio)
- Tipos de alertas gerados:
  - TAF: "X Reprovado(s) no TAF" (quando há reprovados)
  - Estoque: "Estoque de [Pó Químico/LGE/Nitrogênio] Crítico" (quando atual < exigido)
  - Viaturas: "Viatura [Modelo] Não Conforme" (quando qtd_nao_conforme > 0)
- Limite: Máximo de 10 alertas exibidos
- Estado vazio: Mensagem "Nenhum ponto de atenção identificado" com ícone verde

**Lógica de Agregação:**
- A função `generateExecutiveSummary()` em `analytics-utils.ts` varre todos os lançamentos e:
  1. Separa por tipo de indicador usando `indicadores_config`
  2. Calcula KPIs agregados
  3. Gera gráficos combinados
  4. Identifica alertas críticos automaticamente
  5. Gera ranking de bases por atividade

**Comportamento:**
- Quando "Visão Geral" está selecionada, o sistema busca TODOS os lançamentos (sem filtro de indicador)
- Os filtros de Base, Equipe e Data continuam funcionando normalmente
- Os dados são processados em tempo real conforme os filtros são alterados

### GRUPO A: ANÁLISE INDIVIDUAL (Deep Dive)
*Estes indicadores possuem telas exclusivas com visualizações detalhadas.*

#### 1. Ocorrência Aeronáutica
*   **KPIs:**
    *   Total de Ocorrências
    *   Maior Tempo 1ª Viatura
    *   Maior Tempo Última Viatura
    *   Total Horas Somadas
*   **Gráficos:**
    *   [Linha] Evolução Mensal (Eixo X = Meses, Eixo Y = Quantidade)

#### 2. Ocorrência Não Aeronáutica
*   **KPIs:**
    *   Total de Ocorrências
    *   Total Horas Somadas
*   **Gráficos:**
    *   [Linha] Evolução Mensal
    *   [Barras Horizontais] Top 5 Tipos (Contagem por tipo_ocorrencia)

#### 3. Atividades Acessórias
*   **KPIs:**
    *   Total de Atividades Realizadas
*   **Gráficos:**
    *   [Linha] Evolução Mensal
    *   [Barras] Volume por Tipo de Atividade

#### 4. Teste de Aptidão Física (TAF)
*   **Filtro Crítico:** **Buscar Colaborador** (Select com lista de colaboradores ativos)
    *   *Comportamento:* Se um colaborador for selecionado, os gráficos mostram apenas o histórico dele
*   **KPIs:**
    *   Menor Tempo
    *   Tempo Médio
    *   Tempo Máximo
*   **Gráficos:**
    *   [Rosca/Donut] Taxa de Aprovação Global (Verde = Aprovado, Vermelho = Reprovado) com % no centro
    *   [Linha] Evolução Média Mensal (Curva de Agilidade)

#### 5. Prova Teórica (PTR-BA)
*   **Filtro Crítico:** **Buscar Colaborador**
*   **KPIs:**
    *   Total Avaliados
    *   Nota Média
    *   Taxa de Aprovação (%)
*   **Gráficos:**
    *   [Rosca/Donut] Taxa de Aprovação (Verde = Aprovado, Vermelho = Reprovado)
    *   [Linha] Evolução Nota Média Mensal

#### 6. Horas de Treinamento
*   **Filtro Crítico:** **Buscar Colaborador**
*   **Gráficos:**
    *   [Barras] Total de Horas por Equipe
    *   [Linha] Evolução Mensal (Total Absoluto)

#### 7. Inspeção de Viaturas
*   **KPIs:**
    *   Total Inspeções
    *   Total Não Conforme
    *   Taxa de Conformidade (%)
*   **Gráficos:**
    *   [Barras] Manutenção de Viaturas (Soma de qtd_nao_conforme agrupado por Modelo de Viatura: CCI 01, CCI 02, etc)

#### 8. Tempo TP/EPR
*   **Filtro Crítico:** **Buscar Colaborador**
*   **KPIs:**
    *   Menor Tempo
    *   Tempo Médio
    *   Tempo Máximo
*   **Gráficos:**
    *   [Linha] Evolução Média Mensal

#### 9. Tempo Resposta
*   **KPIs:**
    *   Menor Tempo (com Motorista e Viatura)
*   **Gráficos:**
    *   [Linha] Curva de Agilidade (Tempo Médio Mensal) - Inclui "Linha de Referência" (Meta) se possível
*   **Tabela Destaque:** "Top 3 Melhores Tempos de Resposta" (Mostrar Motorista, Viatura e Tempo)

---

### GRUPO B: LOGÍSTICA & MATERIAIS (Visão Agrupada)
*Estes indicadores são analisados em conjunto em uma única tela chamada "Logística".*

**Indicadores Agrupados:** Estoque, EPI, Trocas

*   **Gráfico 1 (Saúde do Estoque):** [Barras Compostas]
    *   Para Pó Químico, LGE e Nitrogênio
    *   Barra 1: Quantidade Atual
    *   Barra 2: Quantidade Exigida
    *   Regra de Cor: Se Atual < Exigido, a barra Atual deve ser Vermelha (#ef4444). Se ok, Azul/Verde
*   **Gráfico 2 (Entrega de EPI/Uniformes):** [Área/Linha]
    *   Média da % de atingimento (total_epi_pct e total_unif_pct)
*   **KPIs de Movimentação:** Total de Trocas no período

**Detalhes Técnicos:**
- Todos os gráficos usam Recharts
- Gráficos de pizza são sempre Donut (Roscas) com a % no centro ou legenda clara
- Cores do tema shadcn (primary, destructive, muted) para consistência visual
- Data Parsing: Funções em `analytics-utils.ts` suportam filtragem por nome dentro dos arrays JSON (ex: encontrar todas as provas do 'João' dentro dos lançamentos)

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

1.2. Edge Function (update-user)
Para permitir edição de usuários existentes sem interromper a sessão atual:
Crie uma função Supabase (supabase functions new update-user).
Lógica:
Receber o payload: { id, nome, role, base_id, equipe_id, email (opcional), password (opcional) }.
Instanciar o createClient usando a SUPABASE_SERVICE_ROLE_KEY (acesso admin).
Verificar se o usuário existe na tabela public.profiles.
Atualizar a tabela public.profiles: nome, role, base_id, equipe_id.
Se email ou password forem fornecidos e diferentes do atual:
  - Usar auth.admin.updateUserById(id, { email, password }) para atualizar credenciais.
Retornar sucesso ou erro para o frontend.
Observação: Se email ou password não forem fornecidos (ou vazios), apenas o perfil é atualizado.

1.3. Edge Function (delete-user)
Para permitir remoção de usuários:
Crie uma função Supabase (supabase functions new delete-user).
Lógica:
Receber o payload: { userId }.
Instanciar o createClient usando a SUPABASE_SERVICE_ROLE_KEY (acesso admin).
Deletar o perfil da tabela public.profiles.
Deletar o usuário do auth usando auth.admin.deleteUser(userId).
Retornar sucesso ou erro para o frontend.
Database: Gerar SQL para criar tabelas, JSONB e Policies RLS rigorosas.
Forms: Criar os 14 formulários em src/components/forms/. Use zod para validação e useFieldArray para as listas dinâmicas. Implementar a lógica de cálculo (ex: Notas do TAF) dentro do form usando watch ou useEffect.

INTEGRAÇÃO COM TABELA COLABORADORES:
- Os formulários que solicitam nomes de pessoas (TAF, Prova Teórica, Horas de Treinamento, Tempo TP/EPR, Tempo Resposta, Controle de EPI) agora usam Select que lista colaboradores ativos da Base do usuário logado.
- Isso garante integridade dos dados e evita erros de digitação.
- Os Selects são carregados dinamicamente usando o hook useColaboradores(baseId).
- Cálculos em tempo real: Controle de EPI calcula percentuais automaticamente; TAF e Prova Teórica calculam status automaticamente enquanto o usuário digita.
Dashboards: Implementar src/lib/analytics-utils.ts para processar (flatten/group) os dados JSONB antes de jogar nos gráficos Recharts.

## 9. Módulo de Monitoramento de Aderência (Compliance)

**Conceito:** Ferramenta de auditoria para identificar quais bases estão cumprindo a rotina de lançamentos e engajamento no uso do sistema.

**Objetivo:** Permitir que o Gerente Geral identifique rapidamente:
- Bases que não estão usando o sistema regularmente.
- Indicadores que não estão sendo preenchidos conforme esperado.
- Usuários cadastrados sem acesso há mais de 30 dias.

**Estrutura Técnica:**
- Arquivo de regras: `src/lib/compliance-rules.ts` define grupos de compliance (A, B, C) e periodicidade esperada para cada indicador.
- Página: `src/pages/Aderencia.tsx` com tabela de aderência e widget de usuários inativos.
- Rota: `/aderencia` protegida para Gerente Geral apenas.

**Funcionalidades:**
1. **Tabela de Aderência:** Organizada em 4 colunas (Base, Rotina Diária, Pendências Mensais, Última Ocorrência).
2. **Widget de Usuários Inativos:** Alerta mostrando usuários sem lançamentos há mais de 30 dias.
3. **Filtro Temporal:** Seleção de Mês/Ano para análise de períodos específicos.

**Regras de Compliance por Grupo:**

**GRUPO A: Obrigação Diária (Rotina de Plantão)**
- Indicadores: 'Atividades Acessórias', 'Horas de Treinamento Mensal'.
- Regra: Verifica se existe lançamento na Data Atual.
- Visual: ✅ Hoje OK | ⚠️ Ontem Pendente | ❌ Sem lançamentos há 2+ dias.
- Alerta: Destacar bases há mais de 24h sem lançar.

**GRUPO B: Eventuais (Sem Alerta de Atraso)**
- Indicadores: 'Ocorrência Aeronáutica', 'Ocorrência Não Aeronáutica', 'Teste de Aptidão Física (TAF)'.
- Regra: Não existe "atraso", apenas mostra última data.
- Visual: "Último: DD/MM/YYYY" (cor neutra/cinza).

**GRUPO C: Obrigação Mensal (Meta do Mês)**
- Indicadores: 'Prova Teórica', 'Inspeção de Viaturas', 'Tempo de TP/EPR', 'Tempo Resposta', 'Controle de Estoque', 'Controle de Trocas', 'Verificação de TP', 'Higienização de TP', 'Controle de EPI' (9 indicadores).
- Regra: Verifica se existe pelo menos 1 lançamento no Mês Atual.
- Visual: ✅ (Verde) se tem no mês | 🟡 (Amarelo) se não tem e mês aberto | 🔴 (Vermelho) se virou o mês e não teve.

## 10. Correções e Melhorias Implementadas

### 9.1. Nova Tabela: colaboradores
- Criada tabela para armazenar o efetivo das bases.
- Campos: id, created_at, nome, base_id (FK), ativo (boolean, default true).
- RLS configurado: Leitura para autenticados da mesma base; Escrita apenas Admin.

### 9.2. Correção de Bug Crítico: Sobrescrita de Dados
- PROBLEMA: Sistema sobrescrevia registros do mesmo dia (Upsert incorreto).
- SOLUÇÃO: Removida constraint UNIQUE da tabela lancamentos. O sistema agora sempre faz INSERT, permitindo múltiplos lançamentos para o mesmo indicador no mesmo dia.
- Arquivo modificado: supabase/schema.sql (removida constraint), src/hooks/useLancamento.ts (removida lógica de UPDATE).

### 9.3. Correção de Bug Crítico: Datas (D-1) - Timezone Offset
- PROBLEMA: Usuário seleciona dia 27/01, mas sistema salva e exibe 26/01. Isso acontece porque ao converter Date para string usando .toISOString(), o JavaScript converte para UTC. Como Brasil é UTC-3, a meia-noite do dia 27 vira 21h do dia 26, e o Supabase salva o dia 26.
- SOLUÇÃO IMPLEMENTADA:
  - Criada função `formatDateForStorage(date: Date)`: Retorna string "YYYY-MM-DD" usando métodos locais (getFullYear, getMonth, getDate), NÃO usa .toISOString().
  - Criada função `formatDateForDisplay(dateString: string)`: Recebe "YYYY-MM-DD" do banco e retorna "DD/MM/YYYY" usando .split('-'), NÃO instancia new Date() para evitar timezone.
  - Todos os 14 formulários atualizados para usar `formatDateForStorage` no onSubmit antes de enviar ao Supabase.
  - Tabelas de histórico e dashboard atualizadas para usar `formatDateForDisplay` ao exibir datas.
  - Hook `useLancamento` atualizado para garantir formato correto antes de inserir no banco.
- Arquivos modificados: 
  - src/lib/date-utils.ts (funções formatDateForStorage e formatDateForDisplay)
  - Todos os 14 formulários em src/components/forms/ (onSubmit atualizado)
  - src/pages/DashboardChefe.tsx (exibição de datas atualizada)
  - src/hooks/useLancamento.ts (normalização de data antes de inserir)

### 9.4. Funcionalidade: Edição de Usuários (Admin)
- IMPLEMENTAÇÃO: Adicionada funcionalidade completa para editar usuários existentes na tela de Gestão de Usuários.
- Funcionalidades:
  - Botão "Editar" na tabela de usuários que abre modal com dados preenchidos.
  - Modal reutilizado para criação e edição (modo edit detectado automaticamente).
  - Campos opcionais na edição: Email e Senha podem ser deixados em branco para manter valores atuais.
  - Validação inteligente: Schema Zod aceita string vazia, "N/A" ou email válido no modo edição.
  - Edge Function `update-user` criada para atualizar perfil e credenciais via Service Role Key.
- Arquivos criados:
  - supabase/functions/update-user/index.ts (Edge Function)
  - supabase/functions/update-user/README.md (Documentação)
  - DEPLOY_EDGE_FUNCTION_UPDATE_USER.md (Guia de deploy)
- Arquivos modificados:
  - src/pages/GestaoUsuarios.tsx (adicionada mutation updateUserMutation, função handleEditClick, schema updateUserSchema)

### 9.5. Correção: Validação de Email no Modo Edição
- PROBLEMA: Ao editar usuário com email "N/A" (valor padrão quando email não está disponível), o schema de validação rejeitava o formulário por não ser um email válido.
- SOLUÇÃO IMPLEMENTADA:
  - Schema `updateUserSchema` atualizado para aceitar: email válido, string vazia (`''`) ou literal `'N/A'` usando `z.union()`.
  - Função `handleEditClick` ajustada para limpar automaticamente o campo email quando o valor for `'N/A'`, permitindo edição sem erros.
  - Mutation `updateUserMutation` ajustada para não enviar `'N/A'` ou string vazia para a Edge Function (mantém email atual).
- Arquivos modificados:
  - src/pages/GestaoUsuarios.tsx (schema updateUserSchema, handleEditClick, updateUserMutation)

### 9.6. Melhoria: Tratamento de Erros na Edição de Usuários
- IMPLEMENTAÇÃO: Melhorado tratamento de erros na mutation `updateUserMutation` para capturar mensagens específicas da Edge Function.
- Funcionalidades:
  - Tratamento robusto de erros "non-2xx status code" com fallback para chamada direta via fetch.
  - Extração de mensagens de erro do `response.data` quando disponível.
  - Mensagens amigáveis ao usuário quando Edge Function não está disponível.
  - Logs detalhados no console para debug.
- Arquivos modificados:
  - src/pages/GestaoUsuarios.tsx (updateUserMutation com tratamento de erros melhorado)

### 9.7. Melhoria: Filtro por Base na Gestão de Usuários
- IMPLEMENTAÇÃO: Adicionado filtro dinâmico por Base na tela de Gestão de Usuários para facilitar a visualização do efetivo.
- Funcionalidades:
  - Select de filtro acima da tabela com opção "Todas as Bases" (padrão) e lista de todas as bases.
  - Filtro server-side: Quando uma base é selecionada, a query busca apenas Chefes de Equipe daquela base.
  - Comportamento especial: Gerentes Gerais (role='geral') sempre aparecem na lista, independente do filtro selecionado.
  - Query otimizada: Usa duas queries separadas quando há filtro (usuários da base + gerentes gerais) e combina os resultados removendo duplicatas.
  - Cache inteligente: Query key inclui `filtroBaseId` para cachear resultados por filtro.
- Arquivos modificados:
  - src/pages/GestaoUsuarios.tsx (adicionado estado filtroBaseId, Select de filtro, query atualizada com lógica de filtro)

### 9.8. Melhoria: Base ADMINISTRATIVO para Gerentes Gerais
- IMPLEMENTAÇÃO: Criada base especial 'ADMINISTRATIVO' para organizar usuários com perfil de Gerente Geral.
- Funcionalidades:
  - Migration SQL criada para inserir a base 'ADMINISTRATIVO' no banco de dados (se não existir).
  - Seleção automática: Quando o usuário seleciona o perfil "Gerente Geral" no formulário, o campo Base é automaticamente preenchido com "ADMINISTRATIVO" e desabilitado.
  - Campo Equipe: Não é exibido para Gerentes Gerais (apenas para Chefes de Equipe).
  - Filtro: A base 'ADMINISTRATIVO' aparece automaticamente no dropdown de filtro, permitindo filtrar Gerentes Gerais facilmente.
  - Edição: Ao editar um Gerente Geral, o sistema garante que a base seja 'ADMINISTRATIVO' (busca automaticamente se não estiver definida).
- Arquivos criados:
  - supabase/migrations/004_add_base_administrativo.sql (Migration para inserir base ADMINISTRATIVO)
  - APLICAR_MIGRACAO_BASE_ADMINISTRATIVO.md (Guia de aplicação da migration)
- Arquivos modificados:
  - src/pages/GestaoUsuarios.tsx (adicionado useEffect para seleção automática, lógica de exibição condicional de campos, handleEditClick atualizado)
  - docs/PRD.md (Seção 4 atualizada com base ADMINISTRATIVO, Seção 6 atualizada com regra de preenchimento automático)