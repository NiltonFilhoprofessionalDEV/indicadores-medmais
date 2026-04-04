/**
 * TestSprite Tests - Dashboard Analytics
 * Testa a funcionalidade de Analytics e visualização de dados
 */

describe('Dashboard Analytics', () => {
  beforeEach(() => {
    // Fazer login antes de cada teste (credenciais reais)
    cy.login('cabralsussa@gmail.com', 'Nilton@2013')
    cy.visit('/dashboard-analytics')
  })

  it('should display Analytics dashboard correctly', () => {
    // Verificar se o header está presente
    cy.contains('Dashboard').should('be.visible')
    cy.contains('Analytics e Indicadores').should('be.visible')
  })

  it('should display sidebar navigation', () => {
    // Verificar se o menu lateral está presente
    cy.contains('Visão Geral').should('be.visible')
    cy.contains('Ocorrência Aeronáutica').should('be.visible')
    cy.contains('Ocorrência Não Aeronáutica').should('be.visible')
  })

  it('should filter by base', () => {
    // Selecionar uma base no filtro
    cy.get('select').first().select('BRASILIA')
    
    // Verificar se os dados foram filtrados
    cy.wait(1000) // Aguardar carregamento
    cy.get('[data-testid="kpi-card"]').should('be.visible')
  })

  it('should filter by date range', () => {
    // Selecionar data início
    cy.get('input[type="date"]').first().type('2025-01-01')
    
    // Selecionar data fim
    cy.get('input[type="date"]').last().type('2025-01-31')
    
    // Verificar se os dados foram filtrados
    cy.wait(1000)
    cy.get('[data-testid="kpi-card"]').should('be.visible')
  })

  it('should enforce maximum 12 months date range', () => {
    // Tentar selecionar intervalo maior que 12 meses
    const hoje = new Date()
    const dataInicio = new Date(hoje.getFullYear() - 1, hoje.getMonth() - 1, 1)
    const dataFim = hoje
    
    cy.get('input[type="date"]').first().type(dataInicio.toISOString().split('T')[0])
    cy.get('input[type="date"]').last().type(dataFim.toISOString().split('T')[0])
    
    // Verificar mensagem de erro ou ajuste automático
    cy.contains(/máximo.*12.*meses/i).should('be.visible')
  })

  it('should switch between different analytics views', () => {
    // Clicar em "Ocorrência Aeronáutica"
    cy.contains('Ocorrência Aeronáutica').click()
    cy.wait(500)
    
    // Verificar se os KPIs específicos aparecem
    cy.contains('Total Ocorrências').should('be.visible')
    
    // Clicar em "Teste de Aptidão Física"
    cy.contains('Teste de Aptidão Física').click()
    cy.wait(500)
    
    // Verificar se os KPIs específicos aparecem
    cy.contains('Total Avaliados').should('be.visible')
  })

  it('should display charts correctly', () => {
    // Selecionar uma view que tem gráficos
    cy.contains('Visão Geral').click()
    cy.wait(1000)
    
    // Verificar se os gráficos estão presentes
    cy.get('svg').should('have.length.greaterThan', 0)
  })

  it('should filter by collaborator when applicable', () => {
    // Navegar para TAF
    cy.contains('Teste de Aptidão Física').click()
    cy.wait(500)
    
    // Verificar se o filtro de colaborador aparece
    cy.contains('Colaborador').should('be.visible')
    
    // Selecionar um colaborador
    cy.get('select').contains('Colaborador').parent().select(1)
    cy.wait(1000)
    
    // Verificar se os dados foram filtrados
    cy.get('[data-testid="kpi-card"]').should('be.visible')
  })
})
