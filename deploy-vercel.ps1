# Script de Deploy para Vercel
# Execute este script para fazer o deploy do projeto na Vercel

Write-Host "Iniciando deploy na Vercel..." -ForegroundColor Cyan

# Verificar se esta logado
Write-Host "`nVerificando autenticacao..." -ForegroundColor Yellow
$whoami = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Voce precisa fazer login primeiro!" -ForegroundColor Red
    Write-Host "`nExecute: vercel login" -ForegroundColor Yellow
    Write-Host "Ou acesse: https://vercel.com/login" -ForegroundColor Yellow
    exit 1
}

Write-Host "Autenticado!" -ForegroundColor Green

# Verificar se as variaveis de ambiente estao configuradas
Write-Host "`nVerificando variaveis de ambiente..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "Arquivo .env nao encontrado!" -ForegroundColor Yellow
    Write-Host "Certifique-se de configurar as variaveis na Vercel:" -ForegroundColor Yellow
    Write-Host "  - VITE_SUPABASE_URL" -ForegroundColor Yellow
    Write-Host "  - VITE_SUPABASE_ANON_KEY" -ForegroundColor Yellow
    Write-Host "`nVoce pode configurar via dashboard: https://vercel.com/dashboard" -ForegroundColor Cyan
}

# Perguntar se e deploy de producao
Write-Host "`nTipo de deploy:" -ForegroundColor Yellow
Write-Host "1. Preview (teste)" -ForegroundColor Cyan
Write-Host "2. Producao" -ForegroundColor Green
$deployType = Read-Host "Escolha (1 ou 2)"

if ($deployType -eq "2") {
    Write-Host "`nFazendo deploy de PRODUCAO..." -ForegroundColor Green
    vercel --prod
} else {
    Write-Host "`nFazendo deploy de PREVIEW..." -ForegroundColor Cyan
    vercel
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeploy concluido com sucesso!" -ForegroundColor Green
} else {
    Write-Host "`nErro no deploy. Verifique os logs acima." -ForegroundColor Red
}
