/**
 * TestSprite Tests - Gestão de Usuários
 * Testa a funcionalidade de gestão de usuários (apenas Gerente)
 */

describe('Gestão de Usuários', () => {
  beforeEach(() => {
    // Fazer login como Gerente antes de cada teste
    cy.login('cabralsussa@gmail.com', 'Nilton@2013')
    cy.visit('/gestao-usuarios')
  })

  it('should display users management page correctly', () => {
    // Verificar elementos principais
    cy.contains('Gestão de Usuários').should('be.visible')
    cy.contains('button', 'Novo Usuário').should('be.visible')
  })

  it('should display users table', () => {
    // Verificar se a tabela está presente
    cy.get('table').should('be.visible')
    cy.contains('Nome').should('be.visible')
    cy.contains('Email').should('be.visible')
    cy.contains('Role').should('be.visible')
    cy.contains('Base').should('be.visible')
  })

  it('should filter users by base', () => {
    // Verificar se o filtro de base está presente
    cy.get('select').first().should('be.visible')
    
    // Selecionar uma base
    cy.get('select').first().select('BRASILIA')
    cy.wait(1000)
    
    // Verificar se a tabela foi filtrada
    cy.get('table tbody tr').should('have.length.greaterThan', 0)
  })

  it('should open create user modal', () => {
    // Clicar em "Novo Usuário"
    cy.contains('button', 'Novo Usuário').click()
    
    // Verificar se o modal foi aberto
    cy.contains(/novo usuário|cadastrar usuário/i).should('be.visible')
    cy.get('input[type="text"]').first().should('be.visible') // Campo nome
  })

  it('should validate user form fields', () => {
    // Abrir modal de criação
    cy.contains('button', 'Novo Usuário').click()
    
    // Tentar submeter sem preencher
    cy.contains('button', /salvar|cadastrar/i).click()
    
    // Verificar mensagens de validação
    cy.contains(/obrigatório|required/i).should('be.visible')
  })

  it('should display edit user button', () => {
    // Verificar se há botões de edição na tabela
    cy.get('table tbody tr').first().within(() => {
      cy.get('button').contains(/editar|edit/i).should('exist')
    })
  })

  it('should open edit user modal', () => {
    // Clicar no primeiro botão de editar
    cy.get('table tbody tr').first().within(() => {
      cy.get('button').contains(/editar|edit/i).click()
    })
    
    // Verificar se o modal foi aberto com dados preenchidos
    cy.get('input[type="text"]').first().should('have.value')
  })
})
