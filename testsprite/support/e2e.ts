// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configurações globais
Cypress.on('uncaught:exception', (err, runnable) => {
  // Retornar false aqui previne que Cypress falhe o teste
  // Útil para ignorar erros de terceiros que não afetam os testes
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }
  // Não ignorar outros erros
  return true
})
