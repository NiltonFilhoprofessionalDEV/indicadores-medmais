/**
 * TestSprite Example Test
 * Este é um exemplo básico de teste usando TestSprite/Cypress
 * 
 * Para executar: npm run test:open
 */

describe('Example Test Suite', () => {
  it('should visit the login page', () => {
    cy.visit('/login')
    cy.contains('Login').should('be.visible')
  })

  it('should have correct page title', () => {
    cy.visit('/login')
    cy.title().should('not.be.empty')
  })
})
