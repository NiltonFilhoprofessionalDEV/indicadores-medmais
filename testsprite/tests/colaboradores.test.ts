/**
 * TestSprite Tests - Gestão de Efetivo/Colaboradores
 * Testa a funcionalidade de gestão de colaboradores (apenas Gerente)
 */

describe('Gestão de Efetivo/Colaboradores', () => {
  beforeEach(() => {
    // Fazer login como Gerente antes de cada teste
    cy.login('cabralsussa@gmail.com', 'Nilton@2013')
    cy.visit('/colaboradores')
  })

  it('should display colaboradores page correctly', () => {
    // Verificar elementos principais
    cy.contains(/colaboradores|efetivo/i).should('be.visible')
    cy.contains('button', 'Novo Colaborador').should('be.visible')
  })

  it('should display colaboradores table', () => {
    // Verificar se a tabela está presente
    cy.get('table').should('be.visible')
    cy.contains('Nome').should('be.visible')
    cy.contains('Base').should('be.visible')
    cy.contains('Status').should('be.visible')
  })

  it('should filter colaboradores by base', () => {
    // Verificar se o filtro de base está presente
    cy.get('select').first().should('be.visible')
    
    // Selecionar uma base
    cy.get('select').first().select('BRASILIA')
    cy.wait(1000)
    
    // Verificar se a tabela foi filtrada
    cy.get('table tbody tr').should('have.length.greaterThan', 0)
  })

  it('should open create colaborador modal', () => {
    // Clicar em "Novo Colaborador"
    cy.contains('button', /novo colaborador|novo/i).click()
    
    // Verificar se o modal foi aberto
    cy.contains(/novo colaborador|cadastrar/i).should('be.visible')
    cy.get('input[type="text"]').first().should('be.visible') // Campo nome
  })

  it('should validate colaborador form', () => {
    // Abrir modal de criação
    cy.contains('button', /novo colaborador|novo/i).click()
    
    // Tentar submeter sem preencher
    cy.contains('button', /salvar|cadastrar/i).click()
    
    // Verificar mensagens de validação
    cy.contains(/obrigatório|required/i).should('be.visible')
  })

  it('should toggle colaborador status (ativo/inativo)', () => {
    // Verificar se há botões de ativar/desativar
    cy.get('table tbody tr').first().within(() => {
      cy.get('button').should('exist')
    })
  })
})
