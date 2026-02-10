export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bases: {
        Row: {
          id: string
          nome: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          created_at?: string
        }
      }
      equipes: {
        Row: {
          id: string
          nome: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          created_at?: string
        }
      }
      colaboradores: {
        Row: {
          id: string
          created_at: string
          nome: string
          base_id: string
          ativo: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          nome: string
          base_id: string
          ativo?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          nome?: string
          base_id?: string
          ativo?: boolean
        }
      }
      indicadores_config: {
        Row: {
          id: string
          nome: string
          schema_type: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          schema_type: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          schema_type?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          nome: string
          role: 'geral' | 'chefe' | 'gerente_sci'
          base_id: string | null
          equipe_id: string | null
          acesso_gerente_sci: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome: string
          role: 'geral' | 'chefe' | 'gerente_sci'
          base_id?: string | null
          equipe_id?: string | null
          acesso_gerente_sci?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          role?: 'geral' | 'chefe' | 'gerente_sci'
          base_id?: string | null
          equipe_id?: string | null
          acesso_gerente_sci?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      feedbacks: {
        Row: {
          id: string
          created_at: string
          user_id: string
          tipo: 'bug' | 'sugestao' | 'outros'
          mensagem: string
          status: 'pendente' | 'em_andamento' | 'resolvido' | 'fechado'
          tratativa_tipo: string | null
          resposta_suporte: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          tipo: 'bug' | 'sugestao' | 'outros'
          mensagem: string
          status?: 'pendente' | 'em_andamento' | 'resolvido' | 'fechado'
          tratativa_tipo?: string | null
          resposta_suporte?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          tipo?: 'bug' | 'sugestao' | 'outros'
          mensagem?: string
          status?: 'pendente' | 'em_andamento' | 'resolvido' | 'fechado'
          tratativa_tipo?: string | null
          resposta_suporte?: string | null
        }
      }
      lancamentos: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          data_referencia: string
          base_id: string
          equipe_id: string
          user_id: string
          indicador_id: string
          conteudo: Json
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          data_referencia: string
          base_id: string
          equipe_id: string
          user_id: string
          indicador_id: string
          conteudo: Json
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          data_referencia?: string
          base_id?: string
          equipe_id?: string
          user_id?: string
          indicador_id?: string
          conteudo?: Json
        }
      }
    }
    Functions: {
      update_user_profile: {
        Args: {
          target_id: string
          p_nome: string
          p_role: string
          p_base_id: string | null
          p_equipe_id: string | null
          p_acesso_gerente_sci: boolean
        }
        Returns: Json
      }
      get_caller_role: {
        Args: Record<string, never>
        Returns: Json
      }
    }
  }
}
