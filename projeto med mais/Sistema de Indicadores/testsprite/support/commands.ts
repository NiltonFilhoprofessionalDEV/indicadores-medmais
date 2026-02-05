/**
 * Custom Cypress Commands for TestSprite
 * Comandos personalizados para facilitar os testes
 */

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Faz login no sistema
       * @param email - Email do usuário
       * @param password - Senha do usuário
       */
      login(email: string, password: string): Chainable<void>
      
      /**
       * Faz logout do sistema
       */
      logout(): Chainable<void>
      
      /**
       * Navega para uma página específica (com autenticação)
       * @param path - Caminho da página
       */
      visitAuthenticated(path: string): Chainable<void>
    }
  }
}

// Comando para fazer login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login')
  cy.get('input[type="email"]').type(email)
  cy.get('input[type="password"]').type(password)
  cy.contains('button', 'Entrar').click()
  
  // Aguardar redirecionamento após login (com timeout maior para autenticação)
  cy.url({ timeout: 10000 }).should('not.include', '/login')
})

// Comando para fazer logout
Cypress.Commands.add('logout', () => {
  cy.get('button[aria-label*="configurações"]').click()
  cy.contains('Sair').click()
  cy.url().should('include', '/login')
})

// Comando para visitar página autenticada
Cypress.Commands.add('visitAuthenticated', (path: string) => {
  // Assumir que já está logado ou fazer login primeiro
  cy.visit(path)
  // Se redirecionar para login, fazer login primeiro
  cy.url().then((url) => {
    if (url.includes('/login')) {
      cy.login('gerente@test.com', 'password123')
      cy.visit(path)
    }
  })
})

export {}
