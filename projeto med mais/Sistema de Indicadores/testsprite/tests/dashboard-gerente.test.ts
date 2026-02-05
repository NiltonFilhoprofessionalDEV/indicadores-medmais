/**
 * TestSprite Tests - Dashboard Gerente
 * Testa o dashboard principal do Gerente Geral
 */

describe('Dashboard Gerente', () => {
  beforeEach(() => {
    // Fazer login como Gerente (credenciais reais)
    cy.login('cabralsussa@gmail.com', 'Nilton@2013')
    cy.visit('/dashboard-gerente')
  })

  it('should display dashboard correctly', () => {
    // Verificar elementos principais
    cy.contains('Dashboard').should('be.visible')
    cy.contains('Gerente Geral').should('be.visible')
  })

  it('should display navigation cards', () => {
    // Verificar cards de navegação
    cy.contains('Gestão de Usuários').should('be.visible')
    cy.contains('Dashboard Analytics').should('be.visible')
    cy.contains('Gestão de Efetivo').should('be.visible')
    cy.contains('Monitoramento de Aderência').should('be.visible')
  })

  it('should navigate to Gestão de Usuários', () => {
    cy.contains('Gestão de Usuários').click()
    cy.url().should('include', '/gestao-usuarios')
  })

  it('should navigate to Dashboard Analytics', () => {
    cy.contains('Dashboard Analytics').click()
    cy.url().should('include', '/dashboard-analytics')
  })

  it('should navigate to Gestão de Efetivo', () => {
    cy.contains('Gestão de Efetivo').click()
    cy.url().should('include', '/colaboradores')
  })

  it('should navigate to Monitoramento de Aderência', () => {
    cy.contains('Monitoramento de Aderência').click()
    cy.url().should('include', '/aderencia')
  })

  it('should display settings dropdown', () => {
    // Clicar no ícone de engrenagem
    cy.get('button[aria-label*="configurações"]').click()
    
    // Verificar se o dropdown aparece
    cy.contains('Configurações').should('be.visible')
    cy.contains('Sair').should('be.visible')
  })

  it('should navigate to Settings', () => {
    cy.get('button[aria-label*="configurações"]').click()
    cy.contains('Configurações').click()
    cy.url().should('include', '/settings')
  })

  it('should logout successfully', () => {
    cy.get('button[aria-label*="configurações"]').click()
    cy.contains('Sair').click()
    
    // Verificar redirecionamento para login
    cy.url().should('include', '/login')
  })
})
