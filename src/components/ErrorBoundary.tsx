import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background transition-colors duration-300">
          <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-6 border border-border">
            <h1 className="text-2xl font-bold text-destructive mb-4">Erro ao carregar a aplicação</h1>
            <p className="text-foreground mb-4">
              Ocorreu um erro inesperado. Por favor, recarregue a página.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-muted-foreground mb-2">
                  Detalhes do erro
                </summary>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto text-foreground">
                  {this.state.error.toString()}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-primary text-primary-foreground py-2 px-4 rounded hover:bg-primary/90 transition-colors"
              >
                Recarregar Página
              </button>
              <a
                href="/logout"
                className="block w-full text-center py-2 px-4 rounded border border-border hover:bg-muted transition-colors text-foreground"
              >
                Fazer logout e voltar ao login
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
