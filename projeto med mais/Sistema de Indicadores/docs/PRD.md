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

**Gerente Geral (role='geral'):** Acesso irrestrito. Pode cadastrar usuários, acessar Analytics, Explorador de Dados, Aderência, Suporte, Gestão de Usuários e Gestão de Efetivo em todas as bases.

**Gerente de SCI (role='gerente_sci'):** Administrador local de uma base. Gerencia apenas usuários e colaboradores da sua base. Acesso a: Lançamentos (visualização/conferência), Gestão de Usuários, Gestão de Efetivo, Configurações. **Não tem acesso** a Dashboard Analytics nem Explorador de Dados. O filtro de Base nas telas de gestão vem travado na base dele (desabilitado). No cadastro de usuários/colaboradores, o campo Base é preenchido automaticamente e fica read-only.

**Chefe de Equipe (role='chefe'):**
Leitura: Vê dados de toda a sua Base (para comparação).
Escrita: Insere/Edita/Exclui lançamentos de **qualquer equipe da sua base** (não apenas a equipe do perfil). O formulário permite selecionar a equipe no modal (caso de troca de equipe sem atualização do perfil). RLS: migration 016.
Menu: Lançamentos, Configurações. **Não tem acesso** a Dashboard Analytics nem Explorador de Dados.

**Líder de Resgate (role='auxiliar'):**
Por diretriz jurídica, o Líder de Resgate é uma categoria distinta do Chefe de Equipe, com **permissões técnicas idênticas** ao Chefe. Leitura: Vê todos os registros da sua base_id. Escrita/Edição: Insere e edita lançamentos apenas da sua equipe_id e base_id (mesmas regras RLS do Chefe — migration 026). Menu: Lançamentos e Configurações (mesmos menus que o Chefe). No Header do sistema, o cargo exibido é "Líder de Resgate".

4. Estrutura de Dados (Supabase)

A. Tabelas de Catálogo (Dados Estáticos)

O script SQL de inicialização deve criar e popular estas tabelas automaticamente:
bases: Tabela contendo as 34 bases aeroportuárias + 1 base administrativa (total: 35 bases):
Bases Aeroportuárias (grafia com acentuação correta em português): "ALTAMIRA", "ARACAJU", "BACACHERI", "BELÉM", "BRASÍLIA", "CAMPO DE MARTE", "CARAJÁS", "CONFINS", "CONGONHAS", "CUIABÁ", "CURITIBA", "FLORIANÓPOLIS", "FOZ do IGUAÇU", "GOIÂNIA", "IMPERATRIZ", "JACAREPAGUÁ", "JOINVILLE", "LONDRINA", "MACAÉ", "MACAPÁ", "MACEIÓ", "MARABÁ", "NAVEGANTES", "PALMAS", "PAMPULHA", "PELOTAS", "PETROLINA", "PORTO ALEGRE", "SALVADOR", "SANTARÉM", "SÃO LUÍS", "SINOP", "TERESINA", "VITÓRIA".
Base Administrativa: "ADMINISTRATIVO" (usada para organizar usuários com perfil de Gerente Geral). Obs: A migration 010 corrige a acentuação em ambientes já existentes; o schema.sql já insere com a grafia correta.

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
"PTR-BA - Horas treinamento diário" (treinamento)
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
Campos: id (PK, UUID), nome, role ('geral', 'chefe', 'gerente_sci' ou 'auxiliar'), base_id (FK bases), equipe_id (FK equipes).
- geral: base_id e equipe_id = null.
- chefe: base_id e equipe_id obrigatórios.
- gerente_sci: base_id obrigatório, equipe_id = null (gerencia toda a base).
- auxiliar (Líder de Resgate): base_id e equipe_id obrigatórios (mesmas regras que chefe; categoria distinta por diretriz jurídica).

colaboradores: Tabela de efetivo (colaboradores) das bases.
Campos: id (PK, UUID), created_at, nome (TEXT), base_id (FK bases), ativo (BOOLEAN, default true).
RLS: Leitura permitida para autenticados da mesma base; Escrita apenas para Admin (Service Role).

feedbacks: Tabela para armazenar feedbacks, sugestões e relatórios de bugs dos usuários.
Campos: id (PK, UUID), created_at (TIMESTAMP), user_id (FK profiles), tipo ('bug' | 'sugestao' | 'outros'), mensagem (TEXT), status ('pendente' | 'em_andamento' | 'resolvido' | 'fechado', default: 'pendente'), tratativa_tipo (TEXT, opcional — tipo de tratativa realizada pelo suporte).
RLS:
- Insert: Usuários autenticados podem criar feedbacks.
- Select: Usuários veem seus próprios feedbacks. Gerentes Gerais (role='geral') veem todos os feedbacks.
- Update: Gerentes Gerais (role='geral') podem atualizar feedbacks (status e tratativa_tipo).

lancamentos: Tabela central (Single Source of Truth).
Estratégia: Uso de JSONB para dados variáveis.
Campos: id, created_at, updated_at, data_referencia (DATE), base_id (FK), equipe_id (FK), user_id (FK), indicador_id (FK), conteudo (JSONB).
IMPORTANTE: Permite múltiplos lançamentos para o mesmo indicador no mesmo dia (sem constraint UNIQUE). O salvamento é sempre um novo INSERT.

C. Segurança (Row Level Security - RLS)

Profiles: Leitura pública (para o sistema saber quem é quem), Escrita apenas via Admin (Service Role).

Colaboradores: 
Leitura: Autenticados da mesma base (geral vê tudo; chefe, gerente_sci e auxiliar veem apenas sua base).
Escrita: Geral (todas as bases); Gerente de SCI (apenas sua base, via RLS); Chefe e Auxiliar não escrevem em colaboradores.

Lancamentos (Leitura):
Se role == 'geral': TRUE (Vê tudo).
Se role == 'chefe': lancamento.base_id == profile.base_id (Vê a base toda).
Se role == 'auxiliar': lancamento.base_id == profile.base_id (Vê a base toda; mesmas regras que chefe).
Se role == 'gerente_sci': lancamento.base_id == profile.base_id (Vê a base toda para conferência).
Lancamentos (Escrita/Edição/Exclusão):
Se role == 'chefe': lancamento.base_id == profile.base_id (pode inserir/editar/excluir em **qualquer equipe da mesma base**). Implementação: migration 016 (supabase/migrations/016_chefe_equipe_livre_mesma_base.sql). Permite que o chefe registre indicadores na equipe em que está atuando mesmo antes da atualização do perfil (ex.: troca de equipe).
Se role == 'auxiliar': mesmas regras que chefe (políticas RLS duplicadas para role 'auxiliar'). Implementação: migration 026 (supabase/migrations/026_add_auxiliar_role_and_rls.sql).
IMPORTANTE: O sistema sempre faz INSERT (não UPDATE) para permitir múltiplos lançamentos no mesmo dia.

Profiles (para gerente_sci): RLS permite SELECT, INSERT, UPDATE e DELETE apenas em registros onde base_id = base_id do próprio perfil (gerenciam apenas usuários da sua base).

5. Especificação Técnica dos Formulários (Inputs & Lógica)
Regra Global: Todos os formulários possuem Base, Equipe e Data (dd/mm/aaaa).
- **Base:** Read-only (travada com o valor do perfil quando o usuário tem base_id).
- **Equipe:** **Editável** — o usuário pode selecionar a equipe no modal. Permite registrar indicador em outra equipe da mesma base (caso de troca sem atualização do perfil). Valor exibido vem do estado do formulário (watch) para refletir a seleção.
- **Data:** Editável via DatePicker.
Máscaras de Tempo: Inputs de horário devem formatar automaticamente (ex: digita 1400 -> vira 14:00).

CORREÇÃO CRÍTICA - Formato de Datas (Timezone Offset):
- PROBLEMA: Ao converter Date para string, o JavaScript usa UTC, causando bug de D-1 (dia anterior) em timezones negativos como Brasil (UTC-3).
- SOLUÇÃO IMPLEMENTADA:
  - Função `formatDateForStorage(date: Date)`: Converte Date para YYYY-MM-DD usando métodos locais (getFullYear, getMonth, getDate), NÃO usa .toISOString().
  - Função `formatDateForDisplay(dateString: string)`: Converte YYYY-MM-DD do banco para DD/MM/YYYY usando .split('-'), NÃO instancia new Date() para evitar timezone.
- Todos os formulários usam `formatDateForStorage` no onSubmit antes de enviar ao Supabase.
- Todas as tabelas (Histórico e Dashboard) usam `formatDateForDisplay` para exibir datas.
- O campo data_referencia no banco é do tipo DATE.

**Fluxo de salvamento e resiliência (hook useLancamento, src/hooks/useLancamento.ts):**
- Autenticação: usa o mesmo `useAuth` do **AuthContext** (fonte única de auth no app). Base e equipe não fornecidos ou vazios são preenchidos com valores do perfil.
- Sem refresh de sessão antes do insert: o insert é feito diretamente; se o token estiver expirado, o erro (401/jwt/session) é tratado como "Sessão expirada" e o usuário é redirecionado ao login.
- Timeout do cliente Supabase (src/lib/supabase.ts): fetch global com **25 segundos** para permitir conclusão do insert em rede/PC lentos.
- Timeout do save: todo o fluxo de salvamento tem limite de **35 segundos**; ao estourar, exibe "A requisição demorou muito. Verifique sua conexão e tente novamente." e o botão sai do estado "Salvando...".
- Tratamento de erro: `handleSaveError` exibe mensagem; se for sessão expirada, fecha o modal e redireciona para `/login`. Erros do insert (ex.: RLS, 401) são convertidos em mensagem clara.

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

3. Atividades Acessórias
Mensagem de Apoio: "Preenchido sempre que realizado atividade no plantão."
Campos:
tipo_atividade: Select ("Inspeção de extintores e mangueiras", "Inspeção de pista", "Inspeção de fauna", "Derramamento de combustível", "Acompanhamento de serviços", "Inspeção em área de cessionários", "Ronda TPS").
Campos obrigatórios para todos os tipos:
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

6. PTR-BA - Horas treinamento diário
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

**Tema Visual:**
- O sistema utiliza tema claro com cores padronizadas.
- Cor primária: Laranja (#fc4d00) aplicada em headers, botões principais e elementos de destaque.
- Sombras personalizadas: Cards e botões possuem sombra laranja sutil para consistência visual.
- Calendários: Tema customizado em laranja para seleção de datas.

**Padronização de Headers:**
- Todos os headers seguem layout consistente: logo e título no canto esquerdo, botões de ação no canto direito.
- Textos dos botões em laranja com sombra preta sutil.
- Fundo laranja (#fc4d00) com textos em branco.

**Histórico de Lançamentos:**
- Divisores entre linhas em laranja.
- Botões de paginação em laranja.

Tela 1: Login
Autenticação via Supabase Auth.

Tela 2: Painel do Chefe / Líder de Resgate (Dashboard & Histórico)

Navegação:
- Menu: Lançamentos (histórico operacional), Configurações. O usuário com role **chefe** ou **auxiliar** (Líder de Resgate) visualiza exatamente os mesmos menus (Lançamentos e Configurações).
- **Identificação:** No Header do sistema, onde aparece o cargo do usuário, exibir "Chefe de Equipe" para role='chefe' e "Líder de Resgate" para role='auxiliar' (Configurações > Meu Perfil e demais pontos que exibem o perfil).
- **Restrição:** Chefe e Auxiliar **não** têm acesso ao Dashboard Analytics nem ao Explorador de Dados. Apenas Gerente Geral (role='geral') pode visualizar essas telas.

Histórico: Painel de Controle de Lançamentos Profissional

Estrutura:
- Barra de Ferramentas (Toolbar) com filtros dinâmicos:
  - Input de Busca: Busca por texto em campos como local, tipo de ocorrência (busca no JSONB conteudo).
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

Regra de Permissão: Chefe pode Editar/Excluir lançamentos de **qualquer equipe da sua base** (RLS migration 016). Na tabela, Ver/Editar/Excluir seguem a regra de mesma base.
Modal de Detalhes: Ao clicar em "Ver", abre o formulário preenchido em modo readOnly={true}.

Tela 3: Dashboard Gerencial (Administrador)
Header: Exibe apenas o nome do usuário (sem a palavra "geral" ou role ao lado).
Filtros Globais: Base, Equipe, Período.
Cards de acesso rápido:
- Gestão de Usuários (Admin). Gestão de Efetivo (Colaboradores).
- Dashboard Analytics (apenas Gerente Geral).
- Monitoramento de Aderência.
- Explorador de Dados.
- Suporte / Feedback: Card com ícone MessageSquare. Permite acessar a tela de suporte para ver feedbacks enviados pelos usuários e dar tratativas. Exibe badge com a quantidade de feedbacks pendentes quando houver (ex.: "3 pendentes"). Rota: `/suporte`.

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
     - Ícones de status para "Atividades Acessórias" e "PTR-BA - Horas treinamento diário".
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
- Indicadores: 'Atividades Acessórias', 'PTR-BA - Horas treinamento diário'.
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

**Para Gerente de SCI:** O filtro de Base vem travado na base dele e desabilitado. No formulário de cadastro, o campo Base é preenchido automaticamente com a base do gerente e fica read-only — impede cadastrar em outra base. O Gerente de SCI pode cadastrar apenas Chefes de Equipe (não Gerentes Gerais nem outros Gerentes de SCI).

Tabela listando todos os usuários cadastrados (Nome | Email | Base | Equipe | Perfil | Ações).
Botões no topo: "Adicionar Novo Usuário" e "Cadastro em Lote".
Coluna Ações: Botões "Editar" e "Remover" para cada usuário.

Formulário de Cadastro (Modal):
Nome Completo: Texto (obrigatório).
Email: Email (obrigatório no cadastro, opcional na edição).
Senha Provisória: Password (min 6 chars no cadastro, opcional na edição).
Perfil (Role): Select ("Gerente Geral", "Gerente de SCI", "Chefe de Equipe" ou "Líder de Resgate").
- Seleção Automática de Base: Quando o usuário seleciona "Gerente Geral", o campo Base é automaticamente preenchido com "ADMINISTRATIVO" e desabilitado (campo visual apenas, não editável). O campo Equipe não é exibido para Gerentes Gerais.
- Seleção Manual: Quando o usuário seleciona "Chefe de Equipe" ou "Líder de Resgate", os campos Base e Equipe aparecem normalmente e são obrigatórios. Para Gerente de SCI, a Base é preenchida automaticamente com a base do gerente e fica read-only.
Base: Select (Carregar lista da tabela bases). Obrigatório se for Chefe ou Líder de Resgate, automático se for Gerente Geral ou (para Gerente de SCI) travado na base do gerente.
Equipe: Select (Carregar lista da tabela equipes). Obrigatório se for Chefe ou Líder de Resgate, não exibido se for Gerente Geral ou Gerente de SCI.

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

Tela 6: Explorador de Dados (/dashboard/explorer) - Apenas Gerente Geral
**Objetivo:** Fornecer acesso a relatórios avançados com filtros detalhados e capacidade de exportação para análise externa.

**Acesso:**
- Card "Explorador de Dados" no Dashboard Gerencial (Tela 3).
- Ícone: FileSpreadsheet (Lucide-react).
- Descrição: "Auditoria completa, filtros avançados e exportação para Excel (CSV)."
- Rota: `/dashboard/explorer`.
- Permissão: Apenas role='geral' (Gerente Geral).

**Estrutura da Tela:**
- Herda o Layout Padrão do sistema (mesmo cabeçalho e estrutura das outras telas).
- Header com logo, título "Explorador de Dados" e botão "Voltar ao Dashboard".
- Área de conteúdo principal contendo:
  - Filtros avançados (a serem implementados).
  - Tabela de dados detalhados (a ser implementada).
  - Botão de exportação para CSV/Excel (a ser implementado).

**Status:** Funcionalidade em desenvolvimento. Página base criada com estrutura visual e navegação funcional.

Tela: Suporte / Feedback (/suporte) - Apenas Gerente Geral
**Objetivo:** Permitir que o administrador visualize todos os feedbacks enviados pelos usuários (via Configurações > Suporte/Feedback) e registre as tratativas realizadas.

**Acesso:**
- Rota: `/suporte`.
- Permissão: Apenas `role === 'geral'` (Gerente Geral).
- Navegação: Card "Suporte / Feedback" no Dashboard Administrador (Tela 3), com ícone MessageSquare. O card exibe um badge com a quantidade de feedbacks pendentes quando houver (ex.: "3 pendentes").

**Estrutura da Tela:**
- Header: Título "Suporte / Feedback", subtítulo "Veja os feedbacks enviados pelos usuários e dê as tratativas", botão "Voltar ao Dashboard".
- Filtro por status: Select com opções Todos, Pendente, Em Andamento, Resolvido, Fechado.
- Tabela de feedbacks (colunas):
  - Data (data/hora de criação, formato pt-BR).
  - Usuário (nome do perfil; fallback: primeiros 8 caracteres do user_id).
  - Tipo (Bug, Sugestão, Outros).
  - Mensagem (resumo com line-clamp-2).
  - Ação: Botão "Ver" (ícone Eye) que abre modal com detalhe completo do feedback.
  - Status: Select para alterar (Pendente, Em Andamento, Resolvido, Fechado). Atualização imediata no Supabase.
  - Tipo de tratativa: Select para registrar a tratativa realizada. Opções: Selecione a tratativa, Correção aplicada, Em análise, Respondido ao usuário, Fechado sem alteração, Outros. Atualização imediata no Supabase.
- Modal de detalhe (ao clicar em "Ver"): Exibe data, usuário, tipo, status, tipo de tratativa (se houver) e mensagem completa em área com scroll (max-h-60). Botão Fechar. Clique no fundo escuro também fecha o modal.
- Paginação (abaixo da tabela):
  - Texto "Mostrando X a Y de Z feedback(s)".
  - Select "Itens por página" com opções 5, 10, 20, 50 (padrão 10).
  - Botões "Anterior" e "Próxima" (ícones ChevronLeft/ChevronRight), desabilitados na primeira/última página.
  - Texto "Página N de M".
  - Ao alterar o filtro por status, a página volta para 1. Ao alterar itens por página, a página volta para 1.

**Banco de dados:**
- Tabela `feedbacks`: coluna `tratativa_tipo` (TEXT, opcional). Migration: `supabase/migrations/009_add_tratativa_tipo_to_feedbacks.sql`.
- RLS: Política "Gerentes Gerais podem atualizar feedbacks" (FOR UPDATE) para permitir que administradores atualizem `status` e `tratativa_tipo`.

**Arquivos:**
- Página: `src/pages/Suporte.tsx`.
- Rota em `App.tsx`: `/suporte` com `ProtectedRoute` para role `geral`.
- Dashboard Administrador: card e contagem de pendentes em `src/pages/DashboardGerente.tsx`.

Tela 7: Configurações do Usuário (/settings)
**Objetivo:** Permitir que usuários gerenciem seu perfil, segurança e enviem feedback ao sistema.

**Acesso:**
- Rota: `/settings`
- Permissão: Todos os usuários autenticados (`role === 'geral'` ou `role === 'chefe'`).
- Navegação: Botão "Configurações" disponível no header de todas as páginas principais.

**Estrutura da Página:**
Interface com sistema de abas (Tabs) contendo três seções principais:

**Aba A: Meu Perfil (Dados)**
- Visual: Avatar grande (componente `Avatar` do shadcn/ui) exibindo apenas as iniciais do nome do usuário (`AvatarFallback`). Não há upload de foto.
- Dados Exibidos (todos os campos são read-only/bloqueados):
  - Nome Completo: Campo desabilitado com valor do perfil.
  - Email: Campo desabilitado com email do usuário autenticado (ou "N/A" se não disponível).
  - Perfil: Exibe "Administrador (Gerente Geral)" ou "Chefe de Equipe" conforme role.
  - Base: Nome da base vinculada ao usuário (ou "-" se não houver).
  - Equipe: Nome da equipe vinculada ao usuário (exibido apenas se `equipe_id` estiver preenchido).

**Aba B: Segurança (Troca de Senha)**
- Formulário de alteração de senha:
  - Campo "Nova Senha" (obrigatório, tipo password).
  - Campo "Confirmar Nova Senha" (obrigatório, tipo password).
  - Validação: Senhas devem coincidir e ter no mínimo 1 caractere.
  - Função: Usa `supabase.auth.updateUser({ password: newPassword })` para atualizar a senha.
  - Feedback: Mensagem de sucesso ou erro após tentativa de alteração.
  - Observação: Campo "Senha Atual" não é necessário, pois o Supabase Auth gerencia a autenticação.

**Aba C: Suporte / Feedback**
- Formulário para reportar erros ou enviar sugestões:
  - Campo "Tipo" (Select obrigatório):
    - Opções: "Bug", "Sugestão", "Outros".
  - Campo "Mensagem" (Textarea obrigatório):
    - Mínimo de 10 caracteres.
    - Placeholder: "Descreva o problema, sugestão ou comentário..."
  - Funcionalidade: Ao enviar, cria registro na tabela `feedbacks` com `status='pendente'`.
  - Feedback: Mensagem de confirmação após envio bem-sucedido.
- Lista de Feedbacks Anteriores:
  - Exibe todos os feedbacks enviados pelo usuário logado.
  - Informações exibidas: Tipo, Status (com badge colorido), Data de criação, Mensagem completa.
  - Status possíveis: Pendente (amarelo), Em Andamento (azul), Resolvido (verde), Fechado (cinza).
  - Ordenação: Mais recentes primeiro (`created_at DESC`).

**Header da Página:**
- Logo MedMais (se disponível).
- Título: "Configurações" com subtítulo "Gerencie seu perfil e preferências".
- Botões: "Voltar" (retorna ao dashboard conforme role), "Sair" (logout).

Tela 5: Admin - Gestão de Efetivo (Colaboradores) (Gerente Geral e Gerente de SCI)

**Para Gerente de SCI:** O Select de Base vem travado na base dele e desabilitado — gerencia apenas os colaboradores da sua base.

Objetivo: Cadastrar e gerenciar o efetivo (bombeiros/colaboradores) de cada base.

Estrutura da Página:
Topo: Select para escolher a Base (travado e desabilitado para Gerente de SCI).
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

**Monitoramento em Tempo Real e Modo Monitor (características nativas de todos os módulos analíticos):**
- **Realtime:** A página Analytics inscreve-se nas mudanças da tabela `lancamentos` (INSERT, UPDATE, DELETE). Qualquer alteração dispara a revalidação das queries (TanStack Query), atualizando automaticamente todos os sub-dashboards (Ocorrências, TAF, Treinamento, Estoque, etc.) sem necessidade de recarregar a página. A inscrição é limpa ao sair da página para evitar vazamento de memória. As queries usam `placeholderData` para evitar "piscar" em branco durante a atualização.
- **Modo Monitor (Modo TV):** Botão no header ativa tela cheia (Full Screen API). Em modo tela cheia, header e sidebar são ocultados, a barra de filtros é oculta, e o conteúdo exibe um badge "📡 MONITORAMENTO EM TEMPO REAL — [NOME DA BASE]" e layout em coluna única para gráficos grandes e legíveis à distância. Botão "Sair do Modo Monitor" ou tecla ESC restaura o layout normal.

**Filtros Dinâmicos (AnalyticsFilterBar):**
- **Filtros Globais (Sempre presentes):**
  1. **Base:** Select com opção "Todas as bases" + lista de bases
  2. **Equipe:** Select com opção "Todas as equipes" + lista de equipes
  3. **Data Início:** Input tipo date (calendário com tema laranja)
  4. **Data Fim:** Input tipo date (calendário com tema laranja)
- **Filtros Condicionais:**
  - **Filtro por Colaborador:** Aparece quando a visão é TAF, Prova Teórica, Treinamento ou TP/EPR
    - Select com lista de colaboradores ativos da base selecionada
    - Lógica: Se um colaborador for selecionado, os gráficos filtram os dados JSONB para mostrar apenas o histórico dele
  - **Filtro por Tipo de Ocorrência (Não Aeronáutica):** Aparece quando a visão é Ocorrência Não Aeronáutica
    - Select com opções: "Todos os tipos" + lista completa de tipos de ocorrência (9 opções)
    - Filtra dados por `conteudo.tipo_ocorrencia`
  - **Filtro por Tipo de Ocorrência (Aeronáutica):** Aparece quando a visão é Ocorrência Aeronáutica
    - Select com opções: "Todos os tipos", "Posicionamento", "Intervenção"
    - Filtra dados por `conteudo.acao`

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
   - Valor: Valor referência global dos tempos de resposta convertida para formato mm:ss
   - Cor condicional:
     - Verde: Se índice de agilidade < 3 minutos
     - Amarelo: Se índice de agilidade ≥ 3 minutos
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
- **Linha (Eixo Y Direito):** Agilidade de Resposta (valor referência dos tempos de resposta por mês)
  - Cor: Verde (#22c55e)
  - Nome: "Agilidade"
  - Formato do eixo: mm:ss
- **Objetivo:** Cruzar demanda (ocorrências) vs eficiência (agilidade de resposta) para identificar correlações

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
*   **Filtro Crítico:** **Tipo de Ocorrência** (Select com opções: Posicionamento, Intervenção)
    *   *Comportamento:* Filtra ocorrências pelo campo `conteudo.acao`
*   **KPIs (Focados em Tempos de Resposta e Tipo de Ação - Críticos para ANAC):**
    *   **Total Ocorrências:** Contagem simples de ocorrências no período
    *   **Performance de Resposta (1º CCI):** Valor referência do campo `tempo_chegada_1_cci`, formatado em mm:ss. Este é o KPI mais importante para monitoramento de performance operacional.
    *   **Pior Tempo Resposta (1º CCI):** Valor máximo encontrado no período, ajuda a identificar falhas e gargalos operacionais.
    *   **% de Intervenções:** Porcentagem das ocorrências onde `acao === 'Intervenção'`, indicador crítico para análise de perfil operacional.
*   **Gráficos:**
    *   **[Donut Chart] Perfil da Operação:** Distribuição entre "Posicionamento" vs "Intervenção" (campo `acao`). Cores: Azul para Posicionamento, Laranja para Intervenção.
    *   **[Line Chart] Agilidade da Equipe:** Eixo X = Meses (ordenados cronologicamente: Jan, Fev, Mar...), Eixo Y = Performance de Resposta (em segundos convertidos para mm:ss). Tooltip mostra tempo formatado "mm:ss" ao passar o mouse.
    *   **[Bar Chart Horizontal] Mapa de Calor de Locais:** Agrupa ocorrências pelo campo `local`. Barras horizontais para legibilidade dos nomes dos locais (ex: "Cabeceira 29") no eixo Y. Ordenado do maior para o menor (Top 5).
*   **Tabela Detalhada:**
    *   Colunas críticas: Data | Base | Ação | Local | Chegada 1º CCI | Chegada Últ. CCI
    *   Exibe todas as ocorrências do período filtrado com informações detalhadas para análise operacional.

#### 2. Ocorrência Não Aeronáutica
*   **Filtro Crítico:** **Tipo de Ocorrência** (Select com 9 opções específicas)
    *   *Comportamento:* Filtra ocorrências pelo campo `conteudo.tipo_ocorrencia`
*   **KPIs:**
    *   Total de Ocorrências
    *   Tempo de Atendimento Típico
    *   Eficiência de Chegada
*   **Gráficos:**
    *   [Linha] Evolução Mensal
    *   [Barras Horizontais] Top 5 Tipos (Contagem por tipo_ocorrencia)
    *   [Barras Horizontais] Eficiência por Tipo (Eficiência de Chegada por Tipo de Ocorrência)

#### 3. Atividades Acessórias
*   **KPIs (Focados em Produtividade e Gestão de Tempo):**
    *   **Total de Atividades:** Contagem simples de atividades realizadas no período
    *   **Total de Horas Empenhadas:** Soma de todo o `tempo_gasto` formatado em HH:mm. Justifica o salário da equipe e mostra o esforço total investido.
    *   **Equipamentos Inspecionados:** Soma do campo `qtd_equipamentos`. Indica o volume de trabalho realizado em inspeções.
    *   **Efetivo Empenhado por Atividade:** Valor referência do campo `qtd_bombeiros` (arredondado). Mostra o tamanho típico da equipe mobilizada para as atividades.
*   **Gráficos:**
    *   **[Donut Chart] Onde gastamos nosso tempo?:** Soma de `tempo_gasto` agrupado por `tipo_atividade`. Mostra qual atividade consome mais horas do plantão (Esforço), diferente de qual acontece mais vezes (Frequência). Gráfico de Rosca com legenda clara e porcentagens escritas.
    *   **[Bar Chart Horizontal] Ranking de Frequência:** Melhoria do gráfico "Atividades por Tipo". Barras horizontais para legibilidade dos nomes longos (ex: "Inspeção de extintores e mangueiras...") no eixo Y. Ordenado do mais frequente para o menos frequente.
    *   **[Composed Chart] Evolução de Produtividade:** Eixo X = Meses (ordenados cronologicamente). Barra = Quantidade de Atividades. Linha = Total de Horas Gastas no mês. Permite ver se o volume de trabalho aumentou junto com as horas ou se estamos sendo mais eficientes.
*   **Tabela de Registros:**
    *   Colunas: Data | Tipo | Qtd Bombeiros | Tempo Gasto
    *   Exibe todas as atividades do período filtrado com informações detalhadas para análise de produtividade.
*   **Processamento de Dados:**
    *   Função `processAtividadesAcessorias` suporta dois formatos de dados:
        1. `conteudo.atividades` como array (formato legado)
        2. Propriedades diretas em `conteudo` (formato atual do formulário)
    *   Utiliza função `timeToMinutes` para converter `tempo_gasto` (HH:mm) em minutos para cálculos e agregações.

#### 4. Teste de Aptidão Física (TAF)
*   **Filtro Crítico:** **Buscar Colaborador** (Select com lista de colaboradores ativos)
    *   *Comportamento:* Se um colaborador for selecionado, os gráficos e KPIs mostram apenas o histórico dele, filtrando os avaliados pelo nome selecionado
*   **KPIs (Focados em Performance e Condicionamento):**
    *   **Total Avaliados:** Contagem total de pessoas avaliadas no período
    *   **Taxa de Aprovação:** Porcentagem (Verde se > 90%). Subtítulo: "X Aprovados / Y Reprovados"
    *   **Melhor Tempo (Recorde):** O menor tempo registrado no período
    *   **Índice de Performance Física:** Valor referência de todos os tempos
*   **Gráficos:**
    *   **[Donut Chart] Status de Aprovação:** Distribuição "Aprovado" (Verde primary) vs "Reprovado" (Vermelho destructive). % de Aprovação no centro da rosca em destaque.
    *   **[Line Chart] Evolução do Condicionamento:** Eixo X = Meses (ordenados cronologicamente - CORRIGIDO). Eixo Y = Índice de Performance Física em minutos. Insight: Se a linha estiver descendo, o time está ficando mais rápido/forte.
    *   **[Bar Chart] Performance por Faixa Etária:** Agrupa avaliados em faixas: "Até 30 anos", "31-40 anos", "Acima de 40". Mostra o Índice de Performance Física de cada grupo. Identifica se o envelhecimento da tropa está impactando o tempo de resposta.
    *   **[Bar Chart] Distribuição de Notas:** Mostra quantos bombeiros tiraram Nota 10, Nota 9, Nota 8, etc. Indica a "Qualidade" da aprovação (passaram raspando ou sobraram?).
*   **Tabela de Resultados:**
    *   Colunas: Data | Nome | Idade | Tempo | Nota/Status
    *   Permite ordenar por Tempo (para ver o ranking dos mais rápidos). Botão de ordenação com ícone de setas.
*   **Processamento de Dados:**
    *   Função `processTAF` extrai todos os participantes de todos os lançamentos filtrados para um único array plano (flattening de `conteudo.avaliados`).
    *   Utiliza função `parseTimeMMSS` para converter tempo (mm:ss -> segundos) para cálculos de média.
*   **Lógica de Cálculo:**
    *   Status é recalculado se estiver vazio ou como '-' usando `calculateTAFStatus`.
    *   Comparação de status usa normalização (trim + toLowerCase) para maior robustez.

#### 5. Prova Teórica (PTR-BA)
*   **Filtro Crítico:** **Buscar Colaborador** (Select com lista de colaboradores ativos)
    *   *Comportamento:* Se um colaborador for selecionado, os gráficos e KPIs mostram apenas o histórico dele
*   **KPIs (Focados em Análise de Conhecimento):**
    *   **Total Avaliados:** Contagem total de pessoas avaliadas no período
    *   **Nível de Conhecimento Global:** Valor referência de todas as notas (1 ou 2 casas decimais)
    *   **Taxa de Aprovação:** % de pessoas com nota >= 8.0 (Verde se > 80%). Subtítulo: "X Aprovados / Y Reprovados"
    *   **Nota Máxima:** A maior nota tirada no período (ex: 10.0)
*   **Gráficos:**
    *   **[Donut Chart] Status de Aprovação (Corrigido):** Aprovado (Verde) vs Reprovado (Vermelho). Reflete a realidade baseada na regra >= 8.0. % de Aprovação no centro.
    *   **[Bar Chart] Distribuição de Notas (Histograma - NOVO):** Agrupa notas em faixas qualitativas: "Excelência (9.0 - 10.0)", "Na Média (8.0 - 8.9)", "Abaixo da Média (< 8.0)". Mostra se o nível alto é porque todos são bons ou se tem gente tirando 10 e gente tirando 5.
    *   **[Bar Chart] Ranking de Conhecimento por Equipe (NOVO):** Eixo Y = Equipes (Alfa, Bravo, etc). Eixo X = Nível de Conhecimento da Equipe. Descobre qual equipe está estudando mais.
    *   **[Line Chart] Evolução do Conhecimento (CORRIGIDO):** Eixo X = Meses (ordenados cronologicamente). Eixo Y = Nível de Conhecimento Mensal.
*   **Tabela de Resultados:**
    *   Colunas: Data | Nome | Equipe | Nota | Status (Badge Verde/Vermelho)
    *   Permite ordenar por Nota (Descrescente) para ver os "01" (melhores alunos). Botão de ordenação com ícone de setas.
    *   Paginação: 10 itens por página com controles Anterior/Próximo.
*   **Processamento de Dados:**
    *   Função `processProvaTeorica` utiliza mesma lógica de "flattening" (extrair avaliados dos arrays JSON) usada no TAF para ter uma lista única de todas as notas do período.
    *   **CORREÇÃO CRÍTICA:** Status calculado baseado em nota >= 8.0 (não depende do campo status do JSON). Regra de Negócio: Se nota >= 8.0: Status APROVADO. Se nota < 8.0: Status REPROVADO.

#### 6. PTR-BA - Horas treinamento diário (Foco em Compliance ANAC)
*   **Regra de Negócio:** Meta obrigatória de 16 horas mensais por bombeiro (Regra ANAC)
*   **Processamento de Dados:**
    *   Agrupa registros pelo nome do colaborador
    *   Soma as horas de treinamento de cada um dentro do período selecionado
    *   Classifica cada colaborador: Conforme (>=16h) ou Não Conforme (<16h)
*   **KPIs de Conformidade (Cards de Topo):**
    *   **Efetivo Total Analisado:** Quantidade de bombeiros únicos no período
    *   **Efetivo Apto (>=16h):** Quantidade e % (Cor Verde). Indica bombeiros que cumpriram a meta.
    *   **Efetivo Irregular (<16h):** Quantidade e % (Cor Vermelha). Este é o KPI crítico para identificar não conformidades.
    *   **Carga Horária de Qualificação:** Valor referência global para ver se a corporação como um todo está acima de 16h.
*   **Gráficos:**
    *   **[Donut Chart] Situação da Tropa:** Mostra a proporção de Conforme (Verde) vs Não Conforme (Vermelho). No centro ou legenda, destaca a % de Conformidade.
    *   **[Bar Chart] Distribuição de Carga Horária (Histograma):** Agrupa colaboradores em faixas: "0-8h", "8-15h", "16-24h", "25h+". Eixo X = Faixas, Eixo Y = Quantidade de Bombeiros. Insight: Mostra se a maioria dos irregulares está "quase lá" (8-15h) ou "críticos" (0-8h).
    *   **[Bar Chart] Desempenho por Equipe (com Reference Line):** Eixo X = Equipes (Alfa, Bravo, etc). Eixo Y = Carga Horária de Qualificação da Equipe. IMPORTANTE: Linha de referência vermelha tracejada em 16h. As barras que ficarem abaixo da linha indicam equipes que não bateram a meta coletiva.
*   **Remoção:** Todas as menções a Ranking foram removidas. O dashboard agora foca exclusivamente no Compliance da Meta de 16h/mês.

#### 7. Inspeção de Viaturas
*   **Objetivo:** Identificar tendências de desgaste e viaturas críticas para gestão de manutenção preventiva. Foco em identificar a "Viatura Crítica" e a "Tendência de Desgaste" da frota.
*   **Processamento de Dados:**
    *   Os dados estão em arrays: `conteudo.inspecoes` (viatura, qtd_inspecoes, qtd_nao_conforme).
    *   Função "achata" (flatten) esses arrays para somar os totais por Viatura e por Mês.
*   **KPIs (Cards de Topo):**
    *   **Total de Itens Inspecionados:** Soma de `qtd_inspecoes`. (Volume de trabalho).
    *   **Total de Não Conformidades:** Soma de `qtd_nao_conforme`. (Defeitos encontrados).
    *   **Taxa de Conformidade Global:** Cálculo: `(Total Conforme / Total Inspecionado) × 100`. Visual: Se < 90%, texto em Vermelho (Crítico). Se >= 90%, Verde.
    *   **Viatura Mais Crítica:** O nome da viatura que possui a maior soma de não conformidades no período. (Ex: "CCI 01 - 24 defeitos").
*   **Gráficos:**
    *   **[Donut Chart] Saúde da Frota:** Mostra a proporção de Itens Conformes (Verde) vs Itens Não Conformes (Vermelho). Coloca a % de Conformidade em destaque no centro.
    *   **[Bar Chart] Ranking de Problemas:** Mantém o gráfico de barras por viatura, mas com melhorias: Ordenação da viatura com MAIS defeitos para a com MENOS. Label exibe o número absoluto no topo da barra. Insight: Identifica imediatamente quais carros precisam de oficina.
    *   **[Line Chart] Tendência de Desgaste:** Eixo X: Meses (Ordenados cronologicamente). Eixo Y: Quantidade de Não Conformidades. Insight: Se a linha estiver subindo, significa que a frota está quebrando mais a cada mês (envelhecimento ou falta de manutenção preventiva).

#### 8. Tempo TP/EPR
*   **Objetivo:** Medir a agilidade de paramentação, vital para emergências. Meta: tempo ≤ 00:59.
*   **Filtro Crítico:** **Buscar Colaborador**
*   **KPIs (Cards de Topo):**
    *   **Total de Avaliações:** Contagem de pessoas avaliadas no período.
    *   **Taxa de Prontidão (%):** Porcentagem de bombeiros que fizeram abaixo de 59s (Verde se ≥ 90%).
    *   **Performance de Prontidão:** Valor referência de todos os tempos registrados (formato mm:ss).
    *   **Recorde (Menor Tempo):** Mostra o tempo mais rápido E o nome do colaborador + Equipe (Ex: "00:34 - Sd. Silva (Alfa)").
*   **Gráficos:**
    *   **[Donut Chart] Aderência à Meta:** Mostra a proporção de "Dentro da Meta (≤59s)" vs "Acima da Meta (>59s)". Cores: Verde (Dentro) e Vermelho (Acima). Exibe a % de Prontidão no centro.
    *   **[Bar Chart] Performance por Equipe com Linha de Corte:** Eixo X: Equipes (nomes, não UUIDs). Eixo Y: Performance de Prontidão (em segundos, formatado como mm:ss). **Destaque:** Linha de Referência vermelha tracejada em 60 segundos (meta de 59s). Equipes que passam dessa linha precisam treinar mais.
    *   **[Bar Chart] Distribuição de Tempos (Histograma):** Agrupa os tempos em faixas de 10 segundos: "30-40s", "41-50s", "51-59s" (Faixa Segura), "1m-1m10s", "1m10s+" (Faixa de Risco). Eixo Y: Quantidade de Bombeiros. Insight: Mostra a consistência da tropa.
    *   **[Line Chart] Evolução Mensal:** Performance de Prontidão Mensal ao longo do tempo. **Correção:** Ordenação cronológica correta (Janeiro antes de Fevereiro). Eixo Y formatado como mm:ss.
*   **Lógica de Cálculo:**
    *   Para cada registro individual (dentro do array `avaliados`), o status é calculado dinamicamente:
        *   Tempo ≤ 59 segundos (00:59) → **Aprovado**
        *   Tempo > 59 segundos → **Reprovado**
    *   A Taxa de Prontidão é calculada como: (Quantidade de Aprovados / Total de Avaliações) × 100

#### 9. Tempo Resposta
*   **Objetivo:** Medir a eficiência das viaturas e a consistência dos tempos de resposta. Foco em identificar problemas mecânicos e garantir agilidade operacional. **Não há ranking de motoristas** - a análise é focada na performance das viaturas.
*   **KPIs (Cards de Topo):**
    *   **Menor Tempo (Recorde):** Exibe o Tempo e a Viatura (ex: "01:50 - CCI 01").
    *   **Índice de Agilidade Operacional:** Valor referência de todas as aferições registradas.
    *   **Maior Tempo (Alerta):** O tempo mais lento registrado com a viatura correspondente. Indica falha grave ou problema mecânico.
    *   **Total de Exercícios:** Quantidade total de aferições realizadas no período.
*   **Gráficos:**
    *   **[Bar Chart] Performance por Viatura:** Substitui qualquer ranking de motoristas. Eixo X: Viaturas (CCI 01, CCI 02, etc). Eixo Y: Índice de Agilidade Operacional de cada viatura. Insight: Identifica se algum caminhão está mecanicamente mais lento que os outros, independente de quem dirige.
    *   **[Line Chart] Curva de Agilidade:** Eixo X: Meses (Ordenados Corretamente - ordenação cronológica corrigida). Eixo Y: Índice de Agilidade Operacional Mensal. **Linha de Referência:** Adicionada linha vermelha tracejada em 3:00 (meta padrão de segurança).
    *   **[Donut Chart] Consistência:** Classifica os tempos em três faixas: "Excelente (< 2min)" (Verde), "Bom (2min - 3min)" (Amarelo), "Crítico (> 3min)" (Vermelho). Mostra a proporção dessas faixas para avaliar a consistência da frota.
*   **Lógica de Processamento:**
    *   Todos os tempos são convertidos de mm:ss para segundos para realizar os cálculos.
    *   Ordenação cronológica corrigida no gráfico de evolução (datas em ordem ascendente).
    *   Análise focada em viaturas, não em motoristas individuais.

---

### GRUPO B: LOGÍSTICA & MATERIAIS (Visão Agrupada - Ênfase em Estoque)
*Estes indicadores são analisados em conjunto em uma única tela chamada "Logística". O Controle de Estoque é o indicador mais crítico, com EPI e Trocas como secundários.*

**Layout Hierárquico:**
- **Área de Destaque (Topo - "Stock Command Center"):** Seção superior larga e dedicada exclusivamente ao Estoque
- **Área Secundária (Rodapé):** EPI e Trocas em tamanho menor (metade da largura cada) apenas para constar

**Indicadores Agrupados:** Estoque (Primário), EPI e Trocas (Secundários)

#### Área de Destaque: Stock Command Center

**KPIs de Estoque (Cards Grandes):**
*   **Cobertura de Pó Químico:** % (Atual vs Exigido). Cor: Verde se > 95%, Vermelho se menor.
*   **Cobertura de LGE:** % (Atual vs Exigido). Cor: Verde se > 95%, Vermelho se menor.
*   **Cobertura de Nitrogênio:** % (Atual vs Exigido). Cor: Verde se > 95%, Vermelho se menor.
*   **Bases com Déficit:** Número absoluto de bases com estoque abaixo do mínimo.

**Gráfico Principal (Grouped Bar Chart):**
*   Mostra os 3 materiais lado a lado (Pó Químico, LGE, Nitrogênio).
*   Para cada material, duas barras:
    *   Barra 1 (Cinza/Outline): Meta Exigida.
    *   Barra 2 (Azul Sólido ou Vermelho/Laranja): Estoque Atual.
    *   Visual: Se a barra Atual for menor que a Exigida, mude a cor dela para Vermelho/Laranja.

**Widget de Alerta "Falta de Material" (Tabela Compacta):**
*   Lista apenas as bases que estão com déficit.
*   Exemplo: "Goiânia: Faltam 20kg de Pó".
*   Objetivo: Ação rápida do gestor.

**Processamento de Dados (Stock Intelligence):**
*   Função analisa Base por Base.
*   Identifica Déficits: Se atual < exigido para Pó, LGE ou Nitrogênio, marca a base como "Crítica".
*   Calcula a Taxa de Cobertura Global: (Soma Atual / Soma Exigido) × 100.

#### Área Secundária (Rodapé)

*   **Gráfico de EPI/Uniformes:** [Linha] Média da % de atingimento (total_epi_pct e total_unif_pct) - Tamanho reduzido (metade da largura).
*   **Gráfico de Trocas:** [Barras] Total de Trocas no período - Tamanho reduzido (metade da largura).

**Detalhes Técnicos:**
- Todos os gráficos usam Recharts
- Gráficos de pizza são sempre Donut (Roscas) com a % no centro ou legenda clara
- Layout responsivo: Área de estoque ocupa largura total, EPI e Trocas dividem a linha inferior
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
- Os formulários que solicitam nomes de pessoas (TAF, Prova Teórica, PTR-BA - Horas treinamento diário, Tempo TP/EPR, Tempo Resposta, Controle de EPI) agora usam Select que lista colaboradores ativos da Base do usuário logado.
- Isso garante integridade dos dados e evita erros de digitação.
- Os Selects são carregados dinamicamente usando o hook useColaboradores(baseId).
- Cálculos em tempo real: Controle de EPI calcula percentuais automaticamente; TAF e Prova Teórica calculam status automaticamente enquanto o usuário digita.
Dashboards: Implementar src/lib/analytics-utils.ts para processar (flatten/group) os dados JSONB antes de jogar nos gráficos Recharts.

## 9. Requisitos Não-Funcionais (Performance e Escalabilidade)

**Objetivo:** Preparar o sistema para escalar para 100k+ registros sem degradação de performance. Implementar otimizações de banco de dados e frontend para evitar travamentos e sobrecarga de memória.

### 9.1. Índices de Banco de Dados (PostgreSQL)

**OBRIGATÓRIO:** O sistema utiliza índices estratégicos para evitar "Full Table Scan" e garantir performance mesmo com grandes volumes de dados.

#### Índices B-Tree (Padrão)
Índices criados nas colunas de filtro frequente para acelerar queries:
- `idx_lancamentos_base_id`: Acelera filtros por base (filtro mais comum)
- `idx_lancamentos_equipe_id`: Acelera filtros por equipe
- `idx_lancamentos_indicador_id`: Acelera filtros por tipo de indicador
- `idx_lancamentos_data_referencia`: **CRÍTICO** - Acelera filtros de período (essencial para Analytics)
- `idx_lancamentos_base_data`: Índice composto para queries base + data (otimização comum)
- `idx_lancamentos_indicador_data`: Índice composto para queries indicador + data (otimização Analytics)

#### Índice GIN (JSONB) - CRÍTICO
**OBRIGATÓRIO:** Índice GIN criado na coluna `conteudo` (JSONB):
- `idx_lancamentos_conteudo_gin`: Permite busca instantânea dentro de campos JSONB
- Permite queries como: `WHERE conteudo->>'nota' > '8'` ou `WHERE conteudo ? 'tipo_ocorrencia'`
- Essencial para Analytics que processam dados dentro do JSONB

**Arquivo:** `supabase/migrations/007_performance_indexes.sql`

### 9.2. Travas de Segurança no Frontend (Analytics)

**OBRIGATÓRIO:** Relatórios analíticos devem ter limitação de intervalo de datas (Date Range) para evitar sobrecarga de memória no cliente.

#### Regra de Data Default
- **Se o usuário não selecionar data:** O sistema carrega automaticamente apenas o **Mês Atual** (Start: 1º dia do mês, End: Hoje).
- Implementado em `src/lib/date-utils.ts` com função `getDefaultDateRange()`.

#### Bloqueio de "All Time"
- **Impedido:** Usuário deixar datas em branco para buscar "Tudo desde o início".
- **Intervalo Máximo:** 12 meses para consultas pesadas.
- **Validação Automática:** Se o usuário selecionar intervalo > 12 meses, o sistema ajusta automaticamente para 12 meses antes da data fim.
- Implementado em `src/lib/date-utils.ts` com funções `validateDateRange()` e `enforceMaxDateRange()`.

**Arquivos modificados:**
- `src/pages/DashboardAnalytics.tsx` (validação e aplicação de datas padrão)
- `src/components/AnalyticsFilterBar.tsx` (validação em tempo real)
- `src/lib/date-utils.ts` (funções utilitárias de data)

### 9.3. Otimização de Queries (Select Parcial)

**OBRIGATÓRIO:** Queries devem buscar apenas as colunas necessárias para reduzir transferência de dados e uso de memória.

#### Implementação
- **Hook `useLancamentos`:** Otimizado para buscar apenas: `id, data_referencia, base_id, equipe_id, indicador_id, conteudo, user_id, created_at, updated_at`.
- **Dashboard Analytics:** Query otimizada busca apenas colunas necessárias para processamento de Analytics.
- **Benefício:** Reduz transferência de dados em ~30-40% e uso de memória no cliente.

**Arquivos modificados:**
- `src/hooks/useLancamentos.ts` (queries otimizadas com `.select()`)
- `src/pages/DashboardAnalytics.tsx` (query de Analytics otimizada)

### 9.4. Métricas de Performance Esperadas

Com as otimizações implementadas, o sistema deve suportar:
- **100k+ registros:** Queries de Analytics devem completar em < 2 segundos com índices adequados.
- **Intervalo de 12 meses:** Processamento de Analytics deve ser responsivo (< 3 segundos).
- **Memória do Cliente:** Uso de memória reduzido em ~40% com select parcial e limitação de intervalo.

### 9.5. Manutenção de Índices

**IMPORTANTE:** Após criar os índices, o PostgreSQL atualiza automaticamente as estatísticas. Em caso de degradação de performance:
1. Verificar se os índices estão sendo utilizados: `EXPLAIN ANALYZE` nas queries lentas.
2. Manter estatísticas atualizadas: `ANALYZE lancamentos;` (executado automaticamente pelo PostgreSQL periodicamente).
3. Monitorar crescimento de índices: Índices GIN podem crescer significativamente com grandes volumes de JSONB.

---

## 10. Módulo de Relatórios e Exportação (Explorador de Dados)

**Objetivo:** Fornecer ao Gerente Geral uma ferramenta de auditoria completa com capacidade de exportação para análise externa em Excel/CSV.

**Acesso:**
- Rota: `/dashboard/explorer`
- Permissão: Apenas `role='geral'` (Gerente Geral)
- Acesso via card "Explorador de Dados" no Dashboard Gerencial

**Estrutura da Tela:**

1. **Filtros Globais (Topo):**
   - Base: Select com todas as bases (opção "Todas as Bases")
   - Equipe: Select com todas as equipes (opção "Todas as Equipes")
   - Indicador: Select com todos os 14 indicadores (opção "Todos os Indicadores")
   - Data Início: Input tipo `date` (formato YYYY-MM-DD)
   - Data Fim: Input tipo `date` (formato YYYY-MM-DD)
   - Validação: Intervalo máximo de 12 meses (mesma regra do Analytics)
   - Botão "Limpar Filtros": Reseta todos os filtros para valores padrão

2. **Botão de Exportação (Meio):**
   - Botão primário: "Exportar Resultados (.csv)"
   - Ícone: Download (Lucide-react)
   - Funcionalidade:
     - Busca todos os lançamentos filtrados (sem paginação)
     - Limite: Máximo 1000 linhas por exportação (para evitar sobrecarga)
     - Aplana (flatten) dados JSONB para formato tabular
     - Gera arquivo CSV com BOM UTF-8 (compatível com Excel)
     - Dispara download automático: `relatorio_indicadores_[DDMMAAAA].csv`
   - Estado: Desabilitado durante exportação e quando não há dados

3. **Tabela de Auditoria (Baixo):**
   - Paginação Server-side: 20 registros por página
   - Colunas:
     - **ID**: Primeiros 8 caracteres do UUID (para referência)
     - **Data/Hora Registro**: `created_at` formatado (DD/MM/YYYY HH:mm:ss) - mostra quando foi lançado
     - **Data Referência**: `data_referencia` formatada (DD/MM/YYYY) - data do fato
     - **Usuário**: Nome do usuário que fez o lançamento (busca na tabela `profiles`)
     - **Base**: Nome da base (busca na tabela `bases`)
     - **Equipe**: Nome da equipe (busca na tabela `equipes`)
     - **Indicador**: Nome do indicador (busca na tabela `indicadores_config`)
     - **Ações**: Botão "Ver Detalhes" que abre modal com formulário em modo read-only
   - Paginação: Controles "Anterior" e "Próximo" com informação "Página X de Y (Z lançamentos)"

**Funcionalidade de Exportação CSV:**

- **Utilitário:** `src/lib/export-utils.ts`
- **Flattening de Dados:**
  - Indicadores Simples (ex: Estoque): Uma linha por lançamento com colunas específicas do tipo
  - Indicadores com Arrays (ex: TAF, Prova Teórica): Uma linha por item do array, repetindo dados do cabeçalho
  - Campos Comuns: ID, Data/Hora Registro, Data Referência, Usuário, Base, Equipe, Indicador
  - Campos Específicos: Adicionados conforme o tipo de indicador (ex: `po_quimico_atual`, `nome`, `nota`, etc.)
- **Formato CSV:**
  - Encoding: UTF-8 com BOM (para Excel reconhecer acentos)
  - Escape: Valores com vírgulas, aspas ou quebras de linha são escapados corretamente
  - Headers: Primeira linha contém nomes das colunas
- **Limitações:**
  - Máximo 1000 registros por exportação (para evitar timeout)
  - Aviso exibido se total de registros exceder o limite

**Modal de Visualização:**

- Ao clicar em "Ver Detalhes", abre modal com:
  - Formulário do indicador em modo `readOnly={true}`
  - Mesma estrutura visual dos formulários de lançamento
  - Botão "Fechar" para retornar à tabela

**Arquivos Implementados:**
- `src/pages/DataExplorer.tsx` - Página principal do Explorador
- `src/lib/export-utils.ts` - Utilitários de exportação CSV com flattening

## 10. Módulo de Monitoramento de Aderência (Compliance)

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
- Indicadores: 'Atividades Acessórias', 'PTR-BA - Horas treinamento diário'.
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

## 11. Correções e Melhorias Implementadas

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

### 9.9. Correção: Taxa de Aprovação TAF Não Exibida
- PROBLEMA: O card de "Taxa de Aprovação" no Dashboard Analytics para o indicador TAF não mostrava a taxa de aprovação, nem no card nem no gráfico de rosca.
- CAUSA: 
  1. O status do avaliado poderia estar vazio ou como '-' quando calculado pela função `calculateTAFStatus`.
  2. A comparação de status usava comparação exata sem normalização (case-sensitive, sem trim).
  3. O TAF usava dados paginados (máximo 20 registros) em vez de todos os dados do período filtrado.
- SOLUÇÃO IMPLEMENTADA:
  - Função `processTAF` em `analytics-utils.ts` atualizada para:
    - Recalcular o status usando `calculateTAFStatus` se o status estiver vazio ou for '-'.
    - Normalizar strings de status para comparação (trim + toLowerCase).
    - Retornar novos KPIs: `totalAvaliados`, `aprovados`, `reprovados`, `taxaAprovacao`.
  - Array `viewsComTodosLancamentos` em `DashboardAnalytics.tsx` atualizado para incluir 'taf', garantindo que todos os lançamentos sejam buscados para cálculos de TAF.
  - Componente `DonutChart` atualizado para exibir um placeholder cinza com "0.0%" quando não há dados.
- Arquivos modificados:
  - src/lib/analytics-utils.ts (processTAF atualizado)
  - src/pages/DashboardAnalytics.tsx (viewsComTodosLancamentos atualizado)
  - src/components/charts/DonutChart.tsx (placeholder para zero dados)

### 9.10. Correção: Filtro de Colaborador TAF Não Funcionando
- PROBLEMA: Ao selecionar um colaborador no filtro da view TAF, os dados individuais do colaborador não eram exibidos.
- CAUSA: A função `processTAF` não recebia o parâmetro `colaboradorNome` e não filtrava os avaliados pelo nome selecionado.
- SOLUÇÃO IMPLEMENTADA:
  - Função `processTAF` em `analytics-utils.ts` atualizada para aceitar parâmetro opcional `colaboradorNome`.
  - Quando `colaboradorNome` é fornecido, a função filtra os avaliados para incluir apenas aqueles cujo nome contém a string de busca (case-insensitive).
  - Chamada de `processTAF` em `DashboardAnalytics.tsx` atualizada para passar `colaboradorNome || undefined`.
- Arquivos modificados:
  - src/lib/analytics-utils.ts (processTAF com parâmetro colaboradorNome)
  - src/pages/DashboardAnalytics.tsx (passagem de colaboradorNome para processTAF)

### 9.11. Correção: IDs de Equipes nos Gráficos
- PROBLEMA: Os gráficos que exibiam dados por equipe mostravam UUIDs em vez dos nomes das equipes.
- SOLUÇÃO IMPLEMENTADA:
  - Adicionada query para buscar lista de equipes (id, nome) em `DashboardAnalytics.tsx`.
  - Criada função helper `getEquipeName(id)` que retorna o nome da equipe dado seu ID.
  - Gráficos de "Total Horas por Equipe" (Treinamento) e "Desempenho por Equipe" (Tempo TP/EPR) atualizados para usar `getEquipeName()` no mapeamento de dados.
- Arquivos modificados:
  - src/pages/DashboardAnalytics.tsx (query equipes, getEquipeName, mapeamento de dados nos gráficos)

### 9.12. Melhoria: Alinhamento de Headers
- IMPLEMENTAÇÃO: Todos os headers do sistema foram padronizados para ter o logo e título no canto esquerdo e botões no canto direito.
- Mudanças:
  - Container interno do header alterado de `max-w-7xl mx-auto ...` para `w-full px-4 sm:px-6 lg:px-8 py-4`.
  - Bloco esquerdo (logo + título) com `flex-shrink-0` sem padding adicional.
  - Bloco direito (botões) com `flex-shrink-0 ml-4`.
- Arquivos modificados:
  - src/pages/DashboardAnalytics.tsx
  - src/pages/DashboardGerente.tsx
  - src/pages/DashboardChefe.tsx
  - src/pages/Settings.tsx
  - src/pages/GestaoUsuarios.tsx
  - src/pages/Colaboradores.tsx
  - src/pages/Aderencia.tsx

### 9.13. Correção: Filtro de Tipo de Ocorrência Não Aeronáutica
- PROBLEMA: O filtro de "Tipo de Ocorrência" na view de Ocorrência Não Aeronáutica não estava filtrando os dados corretamente.
- SOLUÇÃO IMPLEMENTADA:
  - Adicionada lógica de filtro em `DashboardAnalytics.tsx` que filtra `lancamentos` por `conteudo.tipo_ocorrencia` quando a view é 'ocorrencia_nao_aero' e um tipo é selecionado.
- Arquivos modificados:
  - src/pages/DashboardAnalytics.tsx (filtro para ocorrencia_nao_aero)

### 9.14. Nova Funcionalidade: Filtro de Tipo de Ocorrência Aeronáutica
- IMPLEMENTAÇÃO: Adicionado filtro "Tipo de Ocorrência" na view de Ocorrência Aeronáutica para filtrar entre Posicionamento e Intervenção.
- Funcionalidades:
  - Novo estado `tipoOcorrenciaAero` em `DashboardAnalytics.tsx`.
  - Novo Select no `AnalyticsFilterBar` com opções: "Todos os tipos", "Posicionamento", "Intervenção".
  - Filtro aplicado baseado no campo `conteudo.acao`.
- Arquivos modificados:
  - src/pages/DashboardAnalytics.tsx (estado tipoOcorrenciaAero, lógica de filtro)
  - src/components/AnalyticsFilterBar.tsx (novas props e Select para tipo de ocorrência aero)

### 9.15. Correção: Atividades Acessórias Sem Dados
- PROBLEMA: O Dashboard Analytics de Atividades Acessórias não mostrava dados.
- CAUSA: A função `processAtividadesAcessorias` esperava dados no formato `conteudo.atividades` (array), mas o formulário salva os dados diretamente em `conteudo` (tipo_atividade, qtd_equipamentos, etc.).
- SOLUÇÃO IMPLEMENTADA:
  - Função `processAtividadesAcessorias` em `analytics-utils.ts` atualizada para suportar dois formatos:
    1. `conteudo.atividades` como array (formato legado/hipotético).
    2. Propriedades diretas em `conteudo` (formato atual do formulário).
- Arquivos modificados:
  - src/lib/analytics-utils.ts (processAtividadesAcessorias com suporte a dois formatos)

### 9.16. Remoção: Modo Escuro (Dark Mode)
- IMPLEMENTAÇÃO: O modo escuro foi completamente removido do sistema conforme solicitação do usuário.
- Remoções:
  - Removido `ThemeContext` e `ThemeProvider`.
  - Removido componente `ModeToggle`.
  - Removidas todas as classes `.dark` do CSS.
  - Removido botão de alternância de tema dos headers.
- Arquivos modificados:
  - src/contexts/ThemeContext.tsx (removido)
  - src/components/ModeToggle.tsx (removido)
  - src/App.tsx (removido ThemeProvider)
  - src/index.css (removidas classes dark)
  - Todos os headers (removido ModeToggle)

### 9.17. Melhorias Visuais: Padronização de Interface
- IMPLEMENTAÇÃO: Diversas melhorias visuais aplicadas ao sistema para padronizar a interface.
- Mudanças:
  1. **Sidebar (Dashboard Analytics):**
     - Textos em branco para melhor contraste.
     - Divisores entre grupos de menu.
  2. **Headers:**
     - Textos em branco.
     - Textos dos botões em laranja (#fc4d00).
     - Sombra preta sutil nos botões.
  3. **Cards:**
     - Sombra laranja sutil (`shadow-orange-sm` e `shadow-orange-md`).
  4. **Histórico de Lançamentos:**
     - Divisores entre linhas em laranja.
     - Botões de paginação em laranja.
  5. **Calendários:**
     - Tema personalizado em laranja usando CSS customizado.
     - Dias selecionados com fundo laranja.
     - Hover em laranja claro.
- Arquivos modificados:
  - src/index.css (classes de sombra laranja, estilos de calendário)
  - src/pages/DashboardAnalytics.tsx (estilos de sidebar e header)
  - src/pages/DashboardChefe.tsx (estilos de tabela e paginação)
  - Componentes de calendário (DatePicker)

### 9.18. Atualização: Lista de Tipos de Ocorrência Não Aeronáutica
- IMPLEMENTAÇÃO: O campo `tipo_ocorrencia` no formulário de Ocorrência Não Aeronáutica foi atualizado com a lista completa de opções.
- Opções:
  1. Incêndios ou Vazamentos de Combustíveis no PAA
  2. Condições de Baixa Visibilidade
  3. Atendimento a Aeronave Presidencial
  4. Incêndio em Instalações Aeroportuárias
  5. Ocorrências com Artigos Perigosos
  6. Remoção de Animais e Dispersão de Avifauna
  7. Incêndios Florestais
  8. Emergências Médicas em Geral
  9. Iluminação de Emergência em Pista
- Arquivos modificados:
  - src/components/forms/OcorrenciaNaoAeroForm.tsx (lista de opções atualizada)
  - src/components/AnalyticsFilterBar.tsx (lista de opções no filtro)

### 9.19. Refinamento Visual: Dashboard de Ocorrência Aeronáutica
- **OBJETIVO:** Refatorar o dashboard de Ocorrência Aeronáutica para focar em Tempos de Resposta e Tipo de Ação, críticos para a ANAC.
- **IMPLEMENTAÇÃO:**
  - **Função Utilitária:**
    - Criada função `parseMmSsToSeconds(timeString)` em `analytics-utils.ts` para converter strings "mm:ss" em segundos, permitindo calcular médias e máximos.
  - **KPIs Refatorados:**
    - Substituídos cards genéricos por KPIs focados em performance operacional:
      - Total Ocorrências (contagem simples)
      - Performance de Resposta (1º CCI): Valor referência do campo `tempo_chegada_1_cci`, formatado em mm:ss (KPI mais importante)
      - Pior Tempo Resposta (1º CCI): Valor máximo encontrado no período (identifica falhas)
      - % de Intervenções: Porcentagem onde `acao === 'Intervenção'`
  - **Gráficos Implementados:**
    1. **Perfil da Operação (Donut Chart):** Distribuição entre "Posicionamento" vs "Intervenção" (campo `acao`). Cores: Azul (#3b82f6) para Posicionamento, Laranja (#fc4d00) para Intervenção.
    2. **Agilidade da Equipe (Line Chart):** Eixo X = Meses (ordenados cronologicamente), Eixo Y = Performance de Resposta (em segundos convertidos para mm:ss). Tooltip mostra tempo formatado "mm:ss" ao passar o mouse.
    3. **Mapa de Calor de Locais (Bar Chart Horizontal):** Agrupa ocorrências pelo campo `local`. Barras horizontais para legibilidade dos nomes dos locais no eixo Y. Ordenado do maior para o menor (Top 5).
  - **Tabela Detalhada:**
    - Adicionada tabela com colunas críticas: Data | Base | Ação | Local | Chegada 1º CCI | Chegada Últ. CCI
    - Exibe todas as ocorrências do período filtrado com informações detalhadas para análise operacional.
- **Arquivos modificados:**
  - src/lib/analytics-utils.ts (função `parseMmSsToSeconds`, refatoração completa de `processOcorrenciaAeronautica`)
  - src/pages/DashboardAnalytics.tsx (atualização completa da seção de Ocorrência Aeronáutica com novos KPIs, gráficos e tabela)

### 9.20. Refinamento Visual: Dashboard de Atividades Acessórias
- **OBJETIVO:** Refatorar o dashboard de Atividades Acessórias para focar em produtividade e gestão de tempo, subutilizando melhor os dados de Tempo e Recursos Humanos.
- **IMPLEMENTAÇÃO:**
  - **KPIs Refatorados:**
    - Substituídos cards genéricos por 4 indicadores de produtividade:
      - Total de Atividades (contagem simples)
      - Total de Horas Empenhadas: Soma de todo o `tempo_gasto` formatado em HH:mm. Justifica o salário da equipe.
      - Equipamentos Inspecionados: Soma do campo `qtd_equipamentos`.
      - Média de Bombeiros: Média do campo `qtd_bombeiros` (arredondado). Mostra o tamanho médio da equipe mobilizada.
  - **Gráficos Implementados:**
    1. **Onde gastamos nosso tempo? (Donut Chart):** Soma de `tempo_gasto` agrupado por `tipo_atividade`. Mostra qual atividade consome mais horas do plantão (Esforço), diferente de qual acontece mais vezes (Frequência). Gráfico de Rosca com legenda clara e porcentagens escritas.
    2. **Ranking de Frequência (Bar Chart Horizontal):** Melhoria do gráfico "Atividades por Tipo". Barras horizontais para legibilidade dos nomes longos no eixo Y. Ordenado do mais frequente para o menos frequente.
    3. **Evolução de Produtividade (Composed Chart):** Eixo X = Meses (ordenados cronologicamente). Barra = Quantidade de Atividades. Linha = Total de Horas Gastas no mês. Permite ver se o volume de trabalho aumentou junto com as horas ou se estamos sendo mais eficientes.
  - **Tabela de Registros:**
    - Adicionadas colunas: Data | Tipo | Qtd Bombeiros | Tempo Gasto
    - Exibe todas as atividades do período filtrado com informações detalhadas para análise de produtividade.
  - **Processamento de Dados:**
    - Função `processAtividadesAcessorias` refatorada para calcular novos KPIs usando `timeToMinutes` para converter `tempo_gasto` (HH:mm) em minutos.
    - Agregações por tipo de atividade para tempo gasto e frequência.
    - Agregações mensais para evolução de produtividade (quantidade e horas).
- **Arquivos modificados:**
  - src/lib/analytics-utils.ts (refatoração completa de `processAtividadesAcessorias` com novos KPIs e gráficos)
  - src/pages/DashboardAnalytics.tsx (atualização completa da seção de Atividades Acessórias com novos KPIs, gráficos e tabela)
  - src/components/charts/ComposedChart.tsx (melhorias no tooltip para formatação de horas)

### 9.21. Refinamento Visual: Dashboard de TAF (Aptidão Física)
- **OBJETIVO:** Corrigir ordenação cronológica e adicionar análises demográficas (Idade x Performance), vitais para este indicador.
- **IMPLEMENTAÇÃO:**
  - **Processamento de Dados:**
    - Função `processTAF` refatorada para extrair todos os participantes de todos os lançamentos filtrados para um único array plano (flattening de `conteudo.avaliados`).
    - Utiliza função `parseTimeMMSS` (exportada) para converter tempo (mm:ss -> segundos) para cálculos de média.
  - **KPIs Refatorados:**
    - Total Avaliados (contagem total)
    - Taxa de Aprovação: Porcentagem (Verde se > 90%). Subtítulo: "X Aprovados / Y Reprovados"
    - Melhor Tempo (Recorde): O menor tempo registrado no período
    - Tempo Médio Geral: A média de todos os tempos
  - **Gráficos Implementados:**
    1. **Status de Aprovação (Donut Chart - Melhorado):** Distribuição "Aprovado" (Verde) vs "Reprovado" (Vermelho). % de Aprovação no centro da rosca em destaque.
    2. **Evolução do Condicionamento (Line Chart - CORRIGIDO):** Eixo X = Meses ordenados cronologicamente (corrigido erro de Fev antes de Jan). Eixo Y = Tempo Médio em minutos. Insight: Linha descendo = time mais rápido/forte.
    3. **Performance por Faixa Etária (Bar Chart - NOVO):** Agrupa avaliados em faixas: "Até 30 anos", "31-40 anos", "Acima de 40". Mostra Tempo Médio de cada grupo. Identifica se o envelhecimento da tropa está impactando o tempo de resposta.
    4. **Distribuição de Notas (Bar Chart - NOVO):** Mostra quantos bombeiros tiraram Nota 10, Nota 9, Nota 8, etc. Indica a "Qualidade" da aprovação (passaram raspando ou sobraram?).
  - **Tabela de Resultados:**
    - Colunas: Data | Nome | Idade | Tempo | Nota/Status
    - Permite ordenar por Tempo (botão clicável com ícone de setas) para ver o ranking dos mais rápidos
    - Componente `TafResultsTable` criado com estado de ordenação
  - **Correções:**
    - Ordenação cronológica corrigida no gráfico de evolução usando `mesKey` para ordenação antes de formatar para exibição
- **Arquivos modificados:**
  - src/lib/analytics-utils.ts (refatoração completa de `processTAF` com novos KPIs, gráficos e exportação de `parseTimeMMSS`)
  - src/pages/DashboardAnalytics.tsx (atualização completa da seção de TAF com novos KPIs, gráficos, tabela ordenável e componente `TafResultsTable`)

### 9.22. Refinamento e Correção: Dashboard de Prova Teórica
- **OBJETIVO:** Corrigir inconsistência grave onde Nota Média aparecia alta mas Taxa de Aprovação aparecia como 0%, e melhorar gráficos para análise de conhecimento.
- **PROBLEMA IDENTIFICADO:**
  - A função `processProvaTeorica` estava verificando apenas o campo `status` do JSON, mas deveria calcular o status baseado na nota (>= 8.0).
  - Isso causava inconsistência: média alta mas taxa de aprovação baixa.
- **IMPLEMENTAÇÃO:**
  - **CORREÇÃO CRÍTICA DE LÓGICA:**
    - Função `processProvaTeorica` refatorada para calcular status baseado em nota >= 8.0.
    - Regra de Negócio: Se nota >= 8.0: Status APROVADO. Se nota < 8.0: Status REPROVADO.
    - Conversão numérica correta (Number(avaliado.nota)) antes de comparar.
  - **Processamento de Dados:**
    - Utiliza mesma lógica de "flattening" (extrair avaliados dos arrays JSON) usada no TAF.
    - Adicionado `equipe_id` aos avaliados para gráfico de ranking por equipe.
  - **KPIs Refatorados:**
    - Total Avaliados (contagem)
    - Nota Média Geral: Média de todas as notas (1 ou 2 casas decimais)
    - Taxa de Aprovação: % de pessoas com nota >= 8.0 (Verde se > 80%). Subtítulo: "X Aprovados / Y Reprovados"
    - Nota Máxima: A maior nota tirada no período
  - **Gráficos Implementados:**
    1. **Status de Aprovação (Donut Chart - Corrigido):** Aprovado (Verde) vs Reprovado (Vermelho). Reflete a realidade baseada na regra >= 8.0. % de Aprovação no centro.
    2. **Distribuição de Notas (Histograma - Bar Chart - NOVO):** Agrupa notas em faixas: "Excelência (9.0 - 10.0)", "Na Média (8.0 - 8.9)", "Abaixo da Média (< 8.0)". Mostra se a média alta é porque todos são bons ou se tem gente tirando 10 e gente tirando 5.
    3. **Ranking de Conhecimento por Equipe (Bar Chart - NOVO):** Eixo Y = Equipes (Alfa, Bravo, etc). Eixo X = Nota Média da Equipe. Descobre qual equipe está estudando mais.
    4. **Evolução do Conhecimento (Line Chart - CORRIGIDO):** Eixo X = Meses (ordenados cronologicamente usando `mesKey`). Eixo Y = Nota Média Mensal.
  - **Tabela de Resultados:**
    - Colunas: Data | Nome | Equipe | Nota | Status (Badge Verde/Vermelho)
    - Permite ordenar por Nota (Descrescente) para ver os "01" (melhores alunos). Botão de ordenação com ícone de setas.
    - Paginação: 10 itens por página com controles Anterior/Próximo.
    - Componente `ProvaTeoricaResultsTable` criado com estado de ordenação e paginação.
- **Arquivos modificados:**
  - src/lib/analytics-utils.ts (refatoração completa de `processProvaTeorica` com correção crítica de lógica de aprovação, novos KPIs e gráficos)
  - src/pages/DashboardAnalytics.tsx (atualização completa da seção de Prova Teórica com novos KPIs, gráficos, tabela ordenável e componente `ProvaTeoricaResultsTable`)

### 9.23. Refatoração Total: Dashboard de Treinamento (Foco em Compliance ANAC)
- **OBJETIVO:** Refatorar completamente o dashboard de Treinamento para focar no cumprimento da meta obrigatória de 16 horas mensais por bombeiro (Regra ANAC), removendo rankings e focando em compliance.
- **MUDANÇA DE REGRA DE NEGÓCIO:**
  - Não queremos mais ranking
  - Objetivo agora é monitorar o cumprimento da meta obrigatória de 16 horas mensais por bombeiro (Regra ANAC)
- **IMPLEMENTAÇÃO:**
  - **Processamento de Dados (Aggregation):**
    - Agrupa registros pelo nome do colaborador
    - Soma as horas de treinamento de cada um dentro do período selecionado
    - Classifica cada colaborador: Conforme (>=16h) ou Não Conforme (<16h)
  - **KPIs de Conformidade:**
    - Efetivo Total Analisado: Quantidade de bombeiros únicos no período
    - Efetivo Apto (>=16h): Quantidade e % (Cor Verde)
    - Efetivo Irregular (<16h): Quantidade e % (Cor Vermelha). Este é o KPI crítico.
    - Média de Horas Geral: Média global para ver se a corporação como um todo está acima de 16h
  - **Gráficos Implementados:**
    1. **Situação da Tropa (Donut Chart):** Mostra a proporção de Conforme (Verde) vs Não Conforme (Vermelho). No centro, destaca a % de Conformidade.
    2. **Distribuição de Carga Horária (Bar Chart - Histograma):** Agrupa colaboradores em faixas: "0-8h", "8-15h", "16-24h", "25h+". Eixo X = Faixas, Eixo Y = Quantidade de Bombeiros. Insight: Mostra se a maioria dos irregulares está "quase lá" (8-15h) ou "críticos" (0-8h).
    3. **Desempenho por Equipe (Bar Chart com Reference Line):** Eixo X = Equipes (Alfa, Bravo, etc). Eixo Y = Média de Horas da Equipe. IMPORTANTE: Linha de referência vermelha tracejada em 16h. As barras que ficarem abaixo da linha indicam equipes que não bateram a meta coletiva.
  - **Remoções:**
    - Removidas todas as menções a Ranking
    - Removidos gráficos de ranking e comparação competitiva
    - Dashboard agora foca exclusivamente no Compliance da Meta de 16h/mês
  - **Melhorias Técnicas:**
    - Componente `BarChart` atualizado para suportar `ReferenceLine` (linha de referência)
    - Agregação por colaborador com soma de horas no período
    - Classificação automática de conformidade baseada em meta de 16h
- **Arquivos modificados:**
  - src/lib/analytics-utils.ts (refatoração completa de `processHorasTreinamento` com agregação por colaborador, classificação de conformidade e novos gráficos)
  - src/components/charts/BarChart.tsx (adicionado suporte para `ReferenceLine` para exibir linha de referência em gráficos)
  - src/pages/DashboardAnalytics.tsx (atualização completa da seção de Treinamento com novos KPIs de conformidade e gráficos focados em compliance)

### 9.24. Módulo Suporte / Feedback (Administrador) e Ajustes no Dashboard Administrador
- **OBJETIVO:** Permitir que o administrador visualize todos os feedbacks enviados pelos usuários (via Configurações > Suporte/Feedback) e registre as tratativas realizadas; ajustar o header do Dashboard Administrador.
- **IMPLEMENTAÇÃO:**
  1. **Dashboard Administrador (Tela 3):**
     - Header: Removida a palavra "geral" (ou role) ao lado do nome do usuário. Agora exibe apenas o nome do usuário no subtítulo do header.
     - Novo card "Suporte / Feedback": Ícone MessageSquare. Descrição: "Veja os feedbacks enviados pelos usuários e dê as tratativas". Botão "Acessar Suporte" navega para `/suporte`. Badge exibe a quantidade de feedbacks pendentes (status = 'pendente') quando > 0 (ex.: "3 pendentes").
  2. **Nova tela: Suporte / Feedback (/suporte):**
     - Rota: `/suporte`. Protegida para role `geral` (Gerente Geral).
     - Filtro por status: Todos, Pendente, Em Andamento, Resolvido, Fechado.
     - Tabela: Data, Usuário (nome do perfil), Tipo (Bug/Sugestão/Outros), Mensagem (resumo), Ação (botão Ver), Status (select para alterar), Tipo de tratativa (select). Larguras mínimas nos selects para evitar texto cortado (Status: min-w 170px; Tipo de tratativa: min-w 260px).
     - Coluna "Tipo de tratativa": Select com opções: Selecione a tratativa, Correção aplicada, Em análise, Respondido ao usuário, Fechado sem alteração, Outros. Valor persistido na coluna `tratativa_tipo` da tabela `feedbacks`.
     - Botão "Ver" (coluna Ação): Abre modal com detalhe completo do feedback (data, usuário, tipo, status, tipo de tratativa se houver, mensagem completa em área com scroll). Fechar por botão ou clique no fundo.
     - Paginação: "Mostrando X a Y de Z feedback(s)"; select "Itens por página" (5, 10, 20, 50, padrão 10); botões Anterior/Próxima; "Página N de M". Ao alterar filtro ou itens por página, página volta para 1.
     - Tratamento de erro: Exibição de mensagem amigável quando a query de feedbacks falha (ex.: permissão RLS). Evitada query `.in('id', [])` quando não há feedbacks (lista vazia de user_ids).
  3. **Banco de dados:**
     - Tabela `feedbacks`: adicionada coluna `tratativa_tipo` (TEXT, opcional). Migration: `supabase/migrations/009_add_tratativa_tipo_to_feedbacks.sql`.
     - RLS: Política "Gerentes Gerais podem atualizar feedbacks" (FOR UPDATE) para permitir que administradores atualizem `status` e `tratativa_tipo`.
  4. **Tipos:** `database.types.ts` atualizado com `tratativa_tipo` em Row, Insert e Update da tabela `feedbacks`.
- **Arquivos criados:**
  - src/pages/Suporte.tsx (página completa de suporte com listagem, filtro, paginação, modal de detalhe, atualização de status e tratativa_tipo)
  - supabase/migrations/009_add_tratativa_tipo_to_feedbacks.sql (coluna tratativa_tipo e política UPDATE)
- **Arquivos modificados:**
  - src/App.tsx (rota /suporte com lazy load e ProtectedRoute para 'geral')
  - src/pages/DashboardGerente.tsx (card Suporte/Feedback, query de feedbacks pendentes, ícone MessageSquare)
  - src/lib/database.types.ts (tratativa_tipo em feedbacks)
  - docs/PRD.md (seção 4 feedbacks com tratativa_tipo e UPDATE; Tela 3 com header e card Suporte; nova Tela Suporte/Feedback; item 9.24)

### 9.25. Acentuação dos Nomes das Bases (Banco e Frontend)
- **OBJETIVO:** Exibir os nomes das bases com grafia correta em português (acentuação) em todos os modais e listas do sistema.
- **IMPLEMENTAÇÃO:**
  1. **Banco de dados:** Migration `010_fix_bases_acentuacao.sql` atualiza os nomes na tabela `bases`: BELEM → BELÉM, BRASILIA → BRASÍLIA, CARAJAS → CARAJÁS, CUIABA → CUIABÁ, GOIANIA → GOIÂNIA, JACAREPAGUA → JACAREPAGUÁ, JOINVILE → JOINVILLE, MACAE → MACAÉ, MACAPA → MACAPÁ, MACEIO → MACEIÓ, MARABA → MARABÁ, SANTAREM → SANTARÉM, SÃO LUIZ → SÃO LUÍS, VITORIA → VITÓRIA. A base ADMINISTRATIVO permanece sem alteração.
  2. **Schema:** O arquivo `supabase/schema.sql` foi atualizado para que o INSERT inicial das 34 bases utilize a grafia com acentuação correta (para novos ambientes).
- **Arquivos criados:** supabase/migrations/010_fix_bases_acentuacao.sql
- **Arquivos modificados:** supabase/schema.sql

### 9.26. Botão Limpar Filtros no Dashboard Analytics
- **OBJETIVO:** Permitir que o usuário resete todos os filtros da barra de Analytics (Base, Equipe, Data Início/Fim, Colaborador, Tipo de Ocorrência) em um único clique.
- **IMPLEMENTAÇÃO:**
  1. **AnalyticsFilterBar:** Nova prop opcional `onClearFilters?: () => void`. Botão "Limpar filtros" (ícone RotateCcw) exibido abaixo da grade de filtros, alinhado à direita, quando a prop é passada.
  2. **DashboardAnalytics:** Função `handleClearFilters` que redefine: Data Início/Fim para o intervalo padrão (mês atual via `getDefaultDateRange()`), Equipe e Colaborador para vazio, Tipo de Ocorrência (aero e não aero) para vazio; Base para vazio apenas para Gerente (Chefe mantém a base fixa).
- **Arquivos modificados:** src/components/AnalyticsFilterBar.tsx, src/pages/DashboardAnalytics.tsx

### 9.27. Ordenação do Histórico de Lançamentos (Último Lançado no Topo)
- **OBJETIVO:** Exibir no Histórico de Lançamentos sempre o último indicador lançado (mais recente por `created_at`) no topo da lista.
- **IMPLEMENTAÇÃO:**
  1. **useLancamentos:** Todas as queries (principal, busca por texto e fallback RPC) passaram a ordenar por `data_referencia` descendente e `created_at` descendente (antes era ascendente), garantindo que o lançamento mais recente apareça primeiro dentro da mesma data.
  2. **HistoryTable:** O `useMemo` de ordenação no cliente foi ajustado para, na mesma data, ordenar por `created_at` descendente (`(b.created_at).localeCompare(a.created_at)`).
- **Arquivos modificados:** src/hooks/useLancamentos.ts, src/components/HistoryTable.tsx

### 9.28. Responsividade Mobile (Layout e Headers)
- **OBJETIVO:** Melhorar a experiência em telas pequenas (celulares e tablets) em todas as dashboards e telas principais.
- **IMPLEMENTAÇÃO:**
  1. **Dashboard Analytics:**
     - Sidebar em drawer no mobile: Em telas &lt; 1024px (lg), a sidebar fica oculta e é aberta por um botão de menu (ícone Menu) no header. Backdrop escuro fecha o drawer ao clicar fora. Botão X dentro do drawer para fechar. Ao selecionar uma opção do menu, o drawer fecha automaticamente (`setViewAndCloseSidebar`).
     - Sidebar: Em mobile é fixa (`fixed inset-y-0 left-0 z-50`), com transição de entrada/saída (`translate-x`). Em desktop (lg+) permanece no fluxo (`lg:relative`, `lg:translate-x-0`).
     - Header: Botão hambúrguer visível apenas em mobile (`lg:hidden`), logo e título com tamanhos responsivos (`text-lg sm:text-2xl`, `h-8 sm:h-10`), padding do conteúdo `p-4 sm:p-6`, `min-w-0` no main para evitar overflow.
  2. **Dashboard Chefe:** Header com título "Dashboard - Chefe" em mobile, logo e texto responsivos (`text-lg sm:text-2xl`, `h-8 sm:h-10`), botão "Painel de Indicadores" abreviado para "Painel" no mobile com `size="sm"`. Main com `py-6 sm:py-8` e `min-w-0`.
  3. **Dashboard Gerente:** Header com título "Dashboard - Admin", logo e texto responsivos (mesmo padrão do Chefe).
  4. **Histórico de Lançamentos (HistoryTable):** Paginação em coluna no mobile (`flex-col sm:flex-row`) com botões acima do texto; toolbar de filtros já em grid responsivo (`grid-cols-1 md:grid-cols-4`).
  5. **Login:** Container com `p-4` na página e `px-4 sm:px-6` no card para evitar conteúdo colado nas bordas em mobile.
- **Arquivos modificados:** src/pages/DashboardAnalytics.tsx, src/pages/DashboardChefe.tsx, src/pages/DashboardGerente.tsx, src/components/HistoryTable.tsx, src/pages/Login.tsx

### 9.29. Realtime e Modo Monitor (Monitoramento em Tempo Real — Todos os Módulos Analíticos)
- **OBJETIVO:** Disponibilizar monitoramento em tempo real e "Modo TV" em todas as visualizações analíticas do sistema, com atualização automática dos dados e layout otimizado para exibição em tela cheia (monitores/salas).
- **IMPLEMENTAÇÃO:**
  1. **Realtime (Banco de Dados):**
     - A tabela `lancamentos` foi adicionada à publicação `supabase_realtime` para permitir inscrição em mudanças (INSERT, UPDATE, DELETE). Migration: `supabase/migrations/011_enable_realtime_lancamentos.sql`.
  2. **Hook useRealtimeSync:**
     - Novo hook `src/hooks/useRealtimeSync.ts` que se inscreve no canal de mudanças da tabela `lancamentos` (postgres_changes). Ao detectar qualquer evento (INSERT, UPDATE, DELETE), dispara `queryClient.invalidateQueries` para as chaves `lancamentos` e `lancamentos-todos`, garantindo que todos os sub-dashboards (Ocorrências, TAF, Treinamento, Estoque, etc.) sejam atualizados automaticamente.
     - A inscrição é removida no unmount (cleanup) para evitar vazamento de memória quando o usuário sai da página Analytics.
  3. **Prevenção de "piscar" (placeholderData):**
     - Nas queries de lançamentos usadas no Analytics foi aplicado `placeholderData: (prev) => prev` (TanStack Query): no hook `useLancamentos` e na query `lancamentos-todos` em DashboardAnalytics. Assim, durante a revalidação após um evento Realtime, os gráficos mantêm os dados anteriores até os novos carregarem, sem tela em branco.
  4. **Modo Monitor (Modo TV):**
     - Botão "Modo Monitor" no header do Dashboard Analytics (ícone Monitor + texto em telas maiores). Ao clicar, ativa a Full Screen API do navegador (`document.documentElement.requestFullscreen()`).
     - Quando em modo tela cheia: Header e Sidebar são ocultados (`display: none` via condicional); barra de filtros oculta; área de conteúdo com padding reduzido (`p-2 sm:p-4`), largura total (`max-w-none`).
     - Badge fixo no topo do conteúdo: "📡 MONITORAMENTO EM TEMPO REAL — [NOME DA BASE]" (nome da base atual ou "Todas as bases"), com botão "Sair do Modo Monitor" para sair da tela cheia.
     - Classe CSS `.monitor-mode` aplicada ao container de conteúdo: grids internos forçados a uma coluna (`grid-template-columns: repeat(1, minmax(0, 1fr))`) para que os gráficos fiquem grandes e legíveis à distância.
     - Sincronização com o evento `fullscreenchange`: se o usuário sair da tela cheia (ex.: tecla ESC), o estado `isMonitorMode` é atualizado e header/sidebar voltam a ser exibidos.
  5. **Escopo:** O hook `useRealtimeSync` é chamado na página pai do Analytics (`DashboardAnalytics.tsx`), portanto todos os sub-dashboards (Visão Geral, Ocorrência Aeronáutica, Ocorrência Não Aeronáutica, Atividades Acessórias, TAF, Prova Teórica, Treinamento, Tempo TP/EPR, Tempo Resposta, Inspeção Viaturas, Logística) se beneficiam da atualização automática e do Modo Monitor.
- **Arquivos criados:**
  - supabase/migrations/011_enable_realtime_lancamentos.sql
  - src/hooks/useRealtimeSync.ts
- **Arquivos modificados:**
  - src/pages/DashboardAnalytics.tsx (useRealtimeSync, estado isMonitorMode, toggleMonitorMode, fullscreenchange, botão Modo Monitor, layout condicional, placeholderData na query lancamentos-todos)
  - src/hooks/useLancamentos.ts (placeholderData)
  - src/index.css (classe .monitor-mode para grid em coluna única)
  - docs/PRD.md (item 9.29)

### 9.30. Edição de Usuário e Acesso ao Painel Gerente de SCI + Visibilidade por Role

- **OBJETIVO:** Permitir que o Administrador (role='geral') altere o campo "Pode acessar painel Gerente de SCI" na edição de usuários, e que o Gerente de SCI veja apenas usuários da sua base (sem Administradores).
- **IMPLEMENTAÇÃO:**
  1. **RPC update_user_profile:** Criada RPC no Supabase para atualização de perfil. Apenas Administrador pode alterar `acesso_gerente_sci`; outros campos continuam sujeitos às regras de RLS. Função auxiliar `get_caller_role_for_update()` (SECURITY DEFINER) retorna o role do usuário sem depender de RLS.
  2. **Remoção do trigger:** O trigger `trg_check_acesso_gerente_sci_only_geral` que revertia o valor de `acesso_gerente_sci` após o update foi removido — a lógica passou a ficar na RPC.
  3. **Visibilidade na Gestão de Usuários:** Quando o usuário logado é Gerente de SCI (`role='gerente_sci'`), a lista exibe apenas usuários cujo `base_id` é igual à base do gerente — Administradores (role='geral', base_id=null ou ADMINISTRATIVO) deixam de ser incluídos na consulta.
  4. **Nomenclatura:** "Gerente Geral" substituído por "Administrador" na interface (labels, headers, cards).
- **Arquivos criados:**
  - supabase/migrations/021_rpc_update_user_profile.sql
  - supabase/migrations/022_get_caller_role.sql
  - supabase/migrations/023_fix_update_user_profile_definer.sql
  - supabase/APLICAR_023_FIX_UPDATE_USER_PROFILE_UMA_VEZ.sql
  - supabase/APLICAR_024_REMOVER_TRIGGER.sql
- **Arquivos modificados:**
  - src/pages/GestaoUsuarios.tsx (uso de supabase.rpc('update_user_profile', ...) em vez de update direto; filtro de lista por role/base quando isGerenteSCI)
  - docs/PRD.md (item 9.30)