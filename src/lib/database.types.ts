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
          role: 'geral' | 'chefe'
          base_id: string | null
          equipe_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome: string
          role: 'geral' | 'chefe'
          base_id?: string | null
          equipe_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          role?: 'geral' | 'chefe'
          base_id?: string | null
          equipe_id?: string | null
          created_at?: string
          updated_at?: string
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
  }
}
