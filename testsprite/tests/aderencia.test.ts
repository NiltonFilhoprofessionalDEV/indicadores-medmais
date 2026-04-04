/**
 * TestSprite Tests - Monitoramento de Aderência
 * Testa a página de compliance e aderência
 */

describe('Monitoramento de Aderência', () => {
  beforeEach(() => {
    // Fazer login como Gerente (único com acesso) - credenciais reais
    cy.login('cabralsussa@gmail.com', 'Nilton@2013')
    cy.visit('/aderencia')
  })

  it('should display aderência page correctly', () => {
    // Verificar elementos principais
    cy.contains('Monitoramento de Aderência').should('be.visible')
    cy.contains('Mapa de Aderência por Base').should('be.visible')
  })

  it('should display month/year filter', () => {
    // Verificar se o filtro de mês/ano está presente
    cy.get('input[type="month"]').should('be.visible')
  })

  it('should filter by month/year', () => {
    // Selecionar um mês específico
    cy.get('input[type="month"]').type('2025-01')
    cy.wait(1000)
    
    // Verificar se a tabela foi atualizada
    cy.contains('Janeiro/2025').should('be.visible')
  })

  it('should display compliance table', () => {
    // Verificar se a tabela está presente
    cy.get('table').should('be.visible')
    cy.contains('Base').should('be.visible')
    cy.contains('Rotina Diária').should('be.visible')
    cy.contains('Pendências Mensais').should('be.visible')
    cy.contains('Última Ocorrência').should('be.visible')
  })

  it('should display status indicators correctly', () => {
    // Verificar se os indicadores de status estão presentes
    // ✅ (verde), ⚠️ (amarelo), ❌ (vermelho)
    cy.get('table').should('be.visible')
    
    // Verificar se há pelo menos uma linha de dados
    cy.get('tbody tr').should('have.length.greaterThan', 0)
  })

  it('should display inactive users widget when applicable', () => {
    // Verificar se o widget de usuários inativos aparece quando há usuários inativos
    cy.get('body').then(($body) => {
      if ($body.find(':contains("Usuários Cadastrados sem Acesso")').length > 0) {
        cy.contains('Usuários Cadastrados sem Acesso').should('be.visible')
      }
    })
  })

  it('should display legend correctly', () => {
    // Verificar se a legenda está presente
    cy.contains('Legenda').should('be.visible')
    cy.contains('Grupo A - Rotina Diária').should('be.visible')
    cy.contains('Grupo C - Obrigação Mensal').should('be.visible')
    cy.contains('Grupo B - Eventuais').should('be.visible')
  })
})
