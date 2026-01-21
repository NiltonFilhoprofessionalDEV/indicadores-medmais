# Script para fazer deploy da Edge Function create-user
# Requer: SUPABASE_ACCESS_TOKEN e SUPABASE_PROJECT_REF

Write-Host "🚀 Fazendo deploy da Edge Function create-user..." -ForegroundColor Cyan

# Verificar se as variáveis estão definidas
if (-not $env:SUPABASE_ACCESS_TOKEN) {
    Write-Host "❌ Erro: SUPABASE_ACCESS_TOKEN não está definido!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para obter o token:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    Write-Host "2. Crie um novo token" -ForegroundColor Yellow
    Write-Host "3. Execute: `$env:SUPABASE_ACCESS_TOKEN='seu-token-aqui'" -ForegroundColor Yellow
    exit 1
}

if (-not $env:SUPABASE_PROJECT_REF) {
    Write-Host "❌ Erro: SUPABASE_PROJECT_REF não está definido!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para obter o project-ref:" -ForegroundColor Yellow
    Write-Host "1. Acesse o Dashboard do Supabase" -ForegroundColor Yellow
    Write-Host "2. Vá em Settings > General" -ForegroundColor Yellow
    Write-Host "3. Copie o 'Reference ID'" -ForegroundColor Yellow
    Write-Host "4. Execute: `$env:SUPABASE_PROJECT_REF='seu-project-ref-aqui'" -ForegroundColor Yellow
    exit 1
}

# Verificar se o arquivo da função existe
$functionPath = "supabase\functions\create-user\index.ts"
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Erro: Arquivo da função não encontrado em $functionPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivo da função encontrado" -ForegroundColor Green

# Fazer deploy usando npx
Write-Host ""
Write-Host "Fazendo deploy..." -ForegroundColor Yellow
npx supabase functions deploy create-user --project-ref $env:SUPABASE_PROJECT_REF

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy realizado com sucesso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Erro ao fazer deploy. Verifique os logs acima." -ForegroundColor Red
    exit 1
}
