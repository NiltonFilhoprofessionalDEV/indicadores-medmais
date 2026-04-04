/**
 * TestSprite Tests - Login Page
 * Testa o fluxo de autenticação do sistema
 */

describe('Login Page', () => {
  beforeEach(() => {
    // Navegar para a página de login antes de cada teste
    cy.visit('/login')
  })

  it('should display login form correctly', () => {
    // Verificar se os elementos do formulário estão presentes
    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
    cy.contains('button', 'Entrar').should('be.visible')
  })

  it('should show validation errors for invalid email', () => {
    cy.get('input[type="email"]').type('invalid-email')
    cy.get('input[type="password"]').type('password123')
    cy.contains('button', 'Entrar').click()
    
    // Verificar mensagem de erro de email inválido
    cy.contains('Email inválido').should('be.visible')
  })

  it('should show validation errors for short password', () => {
    cy.get('input[type="email"]').type('test@example.com')
    cy.get('input[type="password"]').type('12345')
    cy.contains('button', 'Entrar').click()
    
    // Verificar mensagem de erro de senha curta
    cy.contains('Senha deve ter no mínimo 6 caracteres').should('be.visible')
  })

  it('should toggle password visibility', () => {
    cy.get('input[type="password"]').type('password123')
    
    // Clicar no botão de mostrar senha
    cy.get('button[aria-label*="password"]').click()
    
    // Verificar se o tipo mudou para text
    cy.get('input[type="text"]').should('be.visible')
  })

  it('should redirect to dashboard after successful login (Gerente)', () => {
    // Credenciais reais de teste
    cy.get('input[type="email"]').type('cabralsussa@gmail.com')
    cy.get('input[type="password"]').type('Nilton@2013')
    cy.contains('button', 'Entrar').click()
    
    // Aguardar autenticação e redirecionamento
    cy.url({ timeout: 10000 }).should('include', '/dashboard-gerente')
  })

  it('should redirect to dashboard after successful login (Chefe)', () => {
    // Credenciais reais de teste
    cy.get('input[type="email"]').type('gediael.santos.sbgo@gmail.com')
    cy.get('input[type="password"]').type('gediael.santos.sbgo@')
    cy.contains('button', 'Entrar').click()
    
    // Aguardar autenticação e redirecionamento
    cy.url({ timeout: 10000 }).should('include', '/dashboard-chefe')
  })

  it('should show error message for invalid credentials', () => {
    cy.get('input[type="email"]').type('invalid@test.com')
    cy.get('input[type="password"]').type('wrongpassword')
    cy.contains('button', 'Entrar').click()
    
    // Verificar mensagem de erro
    cy.contains(/erro|inválido|credenciais/i).should('be.visible')
  })
})
