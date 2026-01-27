# Script completo para criar repositório no GitHub e fazer deploy na Vercel
# Usa GitHub CLI para automatizar todo o processo

param(
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "indicadores-medmais",
    
    [Parameter(Mandatory=$false)]
    [string]$Description = "Sistema de Indicadores MedMais",
    
    [Parameter(Mandatory=$false)]
    [switch]$Private = $false
)

Write-Host "🚀 Configurando repositório GitHub e deploy Vercel..." -ForegroundColor Cyan

# Verificar se estamos no diretório correto
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script na raiz do projeto (onde está o package.json)" -ForegroundColor Red
    exit 1
}

# Verificar se GitHub CLI está instalado
try {
    $ghVersion = gh --version 2>&1
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub CLI não encontrado"
    }
    Write-Host "✅ GitHub CLI encontrado" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub CLI não está instalado. Instalando..." -ForegroundColor Yellow
    winget install --id GitHub.cli --silent
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao instalar GitHub CLI. Instale manualmente de https://cli.github.com" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ GitHub CLI instalado. Por favor, reinicie o terminal e execute o script novamente." -ForegroundColor Green
    exit 0
}

# Verificar autenticação no GitHub
Write-Host "🔐 Verificando autenticação no GitHub..." -ForegroundColor Cyan
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Você não está autenticado no GitHub CLI." -ForegroundColor Yellow
    Write-Host "Iniciando processo de autenticação..." -ForegroundColor Cyan
    gh auth login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erro ao fazer login no GitHub. Tente novamente." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Autenticado no GitHub" -ForegroundColor Green
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

# Verificar se há mudanças não commitadas
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Há mudanças não commitadas. Fazendo commit..." -ForegroundColor Cyan
    git add .
    git commit -m "Update: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
}

# Renomear branch para main (se necessário)
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "🔄 Renomeando branch de '$currentBranch' para 'main'..." -ForegroundColor Cyan
    git branch -M main
}

# Criar repositório no GitHub
Write-Host "📦 Criando repositório no GitHub: $RepoName..." -ForegroundColor Cyan
$visibility = if ($Private) { "--private" } else { "--public" }
$createRepo = gh repo create $RepoName --description $Description $visibility --source=. --remote=origin --push 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Repositório criado e código enviado com sucesso!" -ForegroundColor Green
    $repoUrl = gh repo view $RepoName --json url -q .url
    Write-Host "🔗 Repositório: $repoUrl" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📋 Próximos passos para deploy na Vercel:" -ForegroundColor Yellow
    Write-Host "  1. Acesse https://vercel.com" -ForegroundColor White
    Write-Host "  2. Clique em 'Add New Project'" -ForegroundColor White
    Write-Host "  3. Importe o repositório '$RepoName'" -ForegroundColor White
    Write-Host "  4. Configure as variáveis de ambiente:" -ForegroundColor White
    Write-Host "     - VITE_SUPABASE_URL: https://eanobeiqmpymrdbvdnnr.supabase.co" -ForegroundColor White
    Write-Host "     - VITE_SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbm9iZWlxbXB5bXJkYnZkbm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTU0MTYsImV4cCI6MjA4NDU5MTQxNn0.jAQNXQr5PciPgobAH0cm0iDOxCBn43mhKIJGPAiOOXk" -ForegroundColor White
    Write-Host "  5. Clique em 'Deploy'" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Dica: Após o primeiro deploy, a Vercel fará deploy automático a cada push!" -ForegroundColor Cyan
} else {
    Write-Host "❌ Erro ao criar repositório:" -ForegroundColor Red
    Write-Host $createRepo -ForegroundColor Red
    Write-Host ""
    Write-Host "Possíveis causas:" -ForegroundColor Yellow
    Write-Host "  - O repositório já existe com esse nome" -ForegroundColor White
    Write-Host "  - Você não tem permissão para criar repositórios" -ForegroundColor White
    Write-Host "  - Problema de conexão com o GitHub" -ForegroundColor White
    exit 1
}
