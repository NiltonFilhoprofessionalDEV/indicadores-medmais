# Script para fazer push do código para o GitHub
# Execute este script APÓS criar o repositório no GitHub

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUser,
    
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "indicadores-medmais"
)

Write-Host "🚀 Configurando repositório Git para GitHub..." -ForegroundColor Cyan

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto (onde está o package.json)" -ForegroundColor Red
    exit 1
}

# Verificar se já existe um remote origin
$existingRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "⚠️  Já existe um remote 'origin' configurado: $existingRemote" -ForegroundColor Yellow
    $response = Read-Host "Deseja substituir? (s/N)"
    if ($response -ne "s" -and $response -ne "S") {
        Write-Host "Operação cancelada." -ForegroundColor Yellow
        exit 0
    }
    git remote remove origin
}

# Adicionar remote
$repoUrl = "https://github.com/$GitHubUser/$RepoName.git"
Write-Host "📦 Adicionando remote: $repoUrl" -ForegroundColor Cyan
git remote add origin $repoUrl

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao adicionar remote. Verifique se o repositório existe no GitHub." -ForegroundColor Red
    exit 1
}

# Renomear branch para main (se necessário)
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "🔄 Renomeando branch de '$currentBranch' para 'main'..." -ForegroundColor Cyan
    git branch -M main
}

# Verificar se há mudanças não commitadas
$status = git status --porcelain
if ($status) {
    Write-Host "⚠️  Há mudanças não commitadas. Deseja fazer commit?" -ForegroundColor Yellow
    $response = Read-Host "Digite 's' para fazer commit ou 'n' para pular (s/N)"
    if ($response -eq "s" -or $response -eq "S") {
        $message = Read-Host "Digite a mensagem do commit"
        if (-not $message) {
            $message = "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
        }
        git add .
        git commit -m $message
    }
}

# Fazer push
Write-Host "📤 Fazendo push para o GitHub..." -ForegroundColor Cyan
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Push realizado com sucesso!" -ForegroundColor Green
    Write-Host "🔗 Repositório: https://github.com/$GitHubUser/$RepoName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Próximo passo: Faça o deploy na Vercel:" -ForegroundColor Yellow
    Write-Host "  1. Acesse https://vercel.com" -ForegroundColor White
    Write-Host "  2. Clique em 'Add New Project'" -ForegroundColor White
    Write-Host "  3. Importe o repositório '$RepoName'" -ForegroundColor White
    Write-Host "  4. Configure as variáveis de ambiente" -ForegroundColor White
    Write-Host "  5. Clique em 'Deploy'" -ForegroundColor White
} else {
    Write-Host "❌ Erro ao fazer push. Verifique:" -ForegroundColor Red
    Write-Host "  - Se o repositório existe no GitHub" -ForegroundColor White
    Write-Host "  - Se você tem permissão para fazer push" -ForegroundColor White
    Write-Host "  - Se suas credenciais estão configuradas" -ForegroundColor White
    exit 1
}
