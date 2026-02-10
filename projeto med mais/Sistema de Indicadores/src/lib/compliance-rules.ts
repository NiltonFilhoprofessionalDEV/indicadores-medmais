/**
 * Regras de Compliance (Aderência)
 * Define a classificação e periodicidade esperada para cada indicador
 */

export type GrupoCompliance = 'A' | 'B' | 'C'
export type Periodicidade = 'mensal' | 'diario' | 'eventual'

export interface ComplianceRule {
  schema_type: string
  nome: string
  grupo: GrupoCompliance
  periodicidade: Periodicidade
  obrigatorio: boolean
}

/**
 * GRUPO A: Obrigação Diária (Rotina de Plantão)
 * Verifica se existe lançamento na Data Atual
 */
const GRUPO_A: ComplianceRule[] = [
  {
    schema_type: 'atividades_acessorias',
    nome: 'Atividades Acessórias',
    grupo: 'A',
    periodicidade: 'diario',
    obrigatorio: true,
  },
  {
    schema_type: 'treinamento',
    nome: 'PTR-BA - Horas treinamento diário',
    grupo: 'A',
    periodicidade: 'diario',
    obrigatorio: true,
  },
]

/**
 * GRUPO B: Eventuais (Sem Alerta de Atraso)
 * Não existe "atraso", apenas mostra última data
 */
const GRUPO_B: ComplianceRule[] = [
  {
    schema_type: 'ocorrencia_aero',
    nome: 'Ocorrência Aeronáutica',
    grupo: 'B',
    periodicidade: 'eventual',
    obrigatorio: false,
  },
  {
    schema_type: 'ocorrencia_nao_aero',
    nome: 'Ocorrência Não Aeronáutica',
    grupo: 'B',
    periodicidade: 'eventual',
    obrigatorio: false,
  },
  {
    schema_type: 'taf',
    nome: 'Teste de Aptidão Física (TAF)',
    grupo: 'B',
    periodicidade: 'eventual',
    obrigatorio: false,
  },
]

/**
 * GRUPO C: Obrigação Mensal (Meta do Mês)
 * Verifica se existe pelo menos 1 lançamento no Mês Atual
 */
const GRUPO_C: ComplianceRule[] = [
  {
    schema_type: 'prova_teorica',
    nome: 'Prova Teórica',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
  {
    schema_type: 'inspecao_viaturas',
    nome: 'Inspeção de Viaturas',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
  {
    schema_type: 'tempo_tp_epr',
    nome: 'Tempo de TP/EPR',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
  {
    schema_type: 'tempo_resposta',
    nome: 'Tempo Resposta',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
  {
    schema_type: 'estoque',
    nome: 'Controle de Estoque',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
  {
    schema_type: 'controle_trocas',
    nome: 'Controle de Trocas',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
  {
    schema_type: 'verificacao_tp',
    nome: 'Verificação de TP',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
  {
    schema_type: 'higienizacao_tp',
    nome: 'Higienização de TP',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
  {
    schema_type: 'controle_epi',
    nome: 'Controle de EPI',
    grupo: 'C',
    periodicidade: 'mensal',
    obrigatorio: true,
  },
]

/**
 * Todas as regras de compliance
 */
export const COMPLIANCE_RULES: ComplianceRule[] = [
  ...GRUPO_A,
  ...GRUPO_B,
  ...GRUPO_C,
]

/**
 * Obter regra de compliance por schema_type
 */
export function getComplianceRule(schemaType: string): ComplianceRule | undefined {
  return COMPLIANCE_RULES.find((rule) => rule.schema_type === schemaType)
}

/**
 * Obter regras por grupo
 */
export function getRulesByGrupo(grupo: GrupoCompliance): ComplianceRule[] {
  return COMPLIANCE_RULES.filter((rule) => rule.grupo === grupo)
}

/**
 * Verificar se um indicador pertence ao Grupo A (Obrigação Diária)
 */
export function isGrupoA(schemaType: string): boolean {
  const rule = getComplianceRule(schemaType)
  return rule?.grupo === 'A'
}

/**
 * Verificar se um indicador pertence ao Grupo B (Eventuais)
 */
export function isGrupoB(schemaType: string): boolean {
  const rule = getComplianceRule(schemaType)
  return rule?.grupo === 'B'
}

/**
 * Verificar se um indicador pertence ao Grupo C (Obrigação Mensal)
 */
export function isGrupoC(schemaType: string): boolean {
  const rule = getComplianceRule(schemaType)
  return rule?.grupo === 'C'
}
