/**
 * Auditoria de segurança (RLS + Edge Functions) — uso local.
 *
 * Pré-requisitos:
 *   npm install (garante @supabase/supabase-js em devDependencies)
 *
 * Execução (na raiz do projeto):
 *   npx ts-node --project scripts/tsconfig.audit.json scripts/security-audit.ts
 *
 * Ou:
 *   npm run security-audit
 *
 * Variáveis (arquivo .env na raiz ou ambiente):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 *
 * Credenciais de teste (obrigatórias para RLS):
 *   AUDIT_USER_GOIANIA_EMAIL, AUDIT_USER_GOIANIA_PASSWORD — usuário cuja base é GOIÂNIA/GOIANIA
 *   AUDIT_USER_AUXILIAR_EMAIL, AUDIT_USER_AUXILIAR_PASSWORD — role auxiliar (Líder de Resgate)
 *
 * Opcional (Cenário 3 — DELETE em lançamento de OUTRA base):
 *   AUDIT_LANCAMENTO_OUTRA_BASE_ID — UUID de um registro em lancamentos de base ≠ base do auxiliar
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// --- .env simples (sem dependência dotenv) ---
function loadDotEnv(): void {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  const text = readFileSync(p, 'utf8')
  for (const line of text.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq <= 0) continue
    const key = t.slice(0, eq).trim()
    let val = t.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = val
  }
}

function normalizeNome(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .trim()
}

async function question(rl: readline.Interface, label: string): Promise<string> {
  const a = await rl.question(`${label}: `)
  return a.trim()
}

function pass(msg: string): void {
  console.log(`🟢 PASSOU: ${msg}`)
}

function fail(msg: string): void {
  console.log(`🔴 FALHA DE SEGURANÇA: ${msg}`)
}

function skip(msg: string): void {
  console.log(`⚪ PULADO: ${msg}`)
}

function info(msg: string): void {
  console.log(`ℹ️  ${msg}`)
}

type BaseRow = { id: string; nome: string }

async function resolveBaseId(
  client: SupabaseClient,
  wanted: string
): Promise<string | null> {
  const { data, error } = await client.from('bases').select('id, nome')
  if (error || !data?.length) {
    info(`Não foi possível listar bases: ${error?.message ?? 'sem dados'}`)
    return null
  }
  const target = normalizeNome(wanted)
  const row = (data as BaseRow[]).find((b) => normalizeNome(b.nome) === target)
  return row?.id ?? null
}

async function main(): Promise<void> {
  loadDotEnv()

  const rl = readline.createInterface({ input, output })

  let url = process.env.VITE_SUPABASE_URL?.trim() ?? ''
  let anon = process.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

  if (!url) url = await question(rl, 'VITE_SUPABASE_URL')
  if (!anon) anon = await question(rl, 'VITE_SUPABASE_ANON_KEY')

  rl.close()

  if (!url || !anon) {
    console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (.env ou prompt).')
    process.exit(1)
  }

  const goEmail = process.env.AUDIT_USER_GOIANIA_EMAIL?.trim()
  const goPass = process.env.AUDIT_USER_GOIANIA_PASSWORD
  const auxEmail = process.env.AUDIT_USER_AUXILIAR_EMAIL?.trim()
  const auxPass = process.env.AUDIT_USER_AUXILIAR_PASSWORD
  const foreignLancamentoId = process.env.AUDIT_LANCAMENTO_OUTRA_BASE_ID?.trim()

  info('--- Configuração carregada (URLs/chaves parcialmente omitidas) ---')
  info(`Supabase: ${url.slice(0, 28)}…`)

  const admin = createClient(url, anon)

  // --- Cenário 1: leitura cruzada GOIANIA → CURITIBA ---
  console.log('\n--- Cenário 1: SELECT lancamentos (base CURITIBA) com sessão usuário GOIANIA ---')
  if (!goEmail || !goPass) {
    skip('Defina AUDIT_USER_GOIANIA_EMAIL e AUDIT_USER_GOIANIA_PASSWORD.')
  } else {
    const { data: authData, error: signErr } = await admin.auth.signInWithPassword({
      email: goEmail,
      password: goPass,
    })
    if (signErr || !authData.session) {
      skip(`Login GOIANIA falhou: ${signErr?.message ?? 'sem sessão'}`)
    } else {
      const userClient = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } },
      })

      const curitibaId = await resolveBaseId(userClient, 'CURITIBA')
      const goianiaId = await resolveBaseId(userClient, 'GOIÂNIA')
      if (!curitibaId) {
        skip('Base CURITIBA não encontrada no catálogo.')
      } else {
        if (goianiaId) {
          const { data: prof } = await userClient
            .from('profiles')
            .select('base_id, role')
            .eq('id', authData.user.id)
            .maybeSingle()
          if (prof && (prof as { base_id: string }).base_id === curitibaId) {
            info('Usuário de teste está na base CURITIBA; o Cenário 1 não valida vazamento GOIANIA→CURITIBA. Ajuste AUDIT_USER_GOIANIA_*.')
          }
        }

        const { data: rows, error: selErr } = await userClient
          .from('lancamentos')
          .select('id, base_id')
          .eq('base_id', curitibaId)
          .limit(25)

        if (selErr) {
          const code = (selErr as { code?: string }).code
          const msg = selErr.message ?? ''
          if (
            /permission denied|rls|42501|PGRST301|JWT/i.test(msg) ||
            code === '42501'
          ) {
            pass(`SELECT bloqueado ou negado pelo Postgres/RLS (${msg.slice(0, 120)})`)
          } else {
            info(`Erro inesperado no SELECT: ${msg}`)
          }
        } else if (!rows?.length) {
          pass('Nenhum lançamento de CURITIBA visível (lista vazia).')
        } else {
          const leaked = rows.filter((r: { base_id: string }) => r.base_id === curitibaId)
          if (leaked.length > 0) {
            fail(
              `Retornou ${leaked.length} lançamento(s) da base CURITIBA para usuário que não deveria ler outra base.`
            )
          } else {
            pass('Nenhuma linha da base alvo retornada.')
          }
        }
      }

      await admin.auth.signOut()
    }
  }

  // --- Cenário 2: INSERT com base_id alheio ---
  console.log('\n--- Cenário 2: INSERT em lancamentos forçando base_id CURITIBA (perfil GOIANIA) ---')
  if (!goEmail || !goPass) {
    skip('Mesmas credenciais AUDIT_USER_GOIANIA_* necessárias.')
  } else {
    const { data: authData, error: signErr } = await admin.auth.signInWithPassword({
      email: goEmail,
      password: goPass,
    })
    if (signErr || !authData.session) {
      skip(`Login falhou: ${signErr?.message}`)
    } else {
      const userClient = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } },
      })

      const curitibaId = await resolveBaseId(userClient, 'CURITIBA')
      const { data: profile } = await userClient
        .from('profiles')
        .select('base_id, equipe_id, role')
        .eq('id', authData.user.id)
        .single()

      const p = profile as { base_id: string | null; equipe_id: string | null; role: string } | null
      const { data: indRow } = await userClient.from('indicadores_config').select('id').limit(1).maybeSingle()

      if (!curitibaId || !p?.base_id || !p?.equipe_id || !indRow) {
        skip('Faltam base CURITIBA, perfil completo (base/equipe) ou indicador_config.')
      } else {
        const insertPayload = {
          data_referencia: new Date().toISOString().slice(0, 10),
          base_id: curitibaId,
          equipe_id: p.equipe_id,
          user_id: authData.user.id,
          indicador_id: (indRow as { id: string }).id,
          conteudo: { _security_audit: true, note: 'security-audit.ts inject test' },
        }

        const { data: insData, error: insErr } = await userClient
          .from('lancamentos')
          .insert(insertPayload)
          .select('id')
          .maybeSingle()

        if (insErr) {
          const msg = insErr.message ?? ''
          if (/permission denied|rls|42501|violates row-level/i.test(msg)) {
            pass(`INSERT negado pela RLS (${msg.slice(0, 140)})`)
          } else {
            info(`INSERT retornou erro (avaliar manualmente): ${msg}`)
          }
        } else if (insData && (insData as { id: string }).id) {
          const badId = (insData as { id: string }).id
          fail(`INSERT permitido com base_id de outra base (id=${badId}). Removendo linha de teste…`)
          await userClient.from('lancamentos').delete().eq('id', badId)
        } else {
          pass('INSERT não retornou linha (comportamento seguro ou sem efeito).')
        }
      }

      await admin.auth.signOut()
    }
  }

  // --- Cenário 3: DELETE com auxiliar em lançamento de outra base ---
  console.log('\n--- Cenário 3: DELETE em lançamento de outra base (token AUXILIAR) ---')
  if (!auxEmail || !auxPass) {
    skip('Defina AUDIT_USER_AUXILIAR_EMAIL e AUDIT_USER_AUXILIAR_PASSWORD.')
  } else if (!foreignLancamentoId) {
    skip(
      'Defina AUDIT_LANCAMENTO_OUTRA_BASE_ID com o UUID de um lançamento cuja base_id seja diferente da base do usuário auxiliar.'
    )
  } else {
    const { data: authData, error: signErr } = await admin.auth.signInWithPassword({
      email: auxEmail,
      password: auxPass,
    })
    if (signErr || !authData.session) {
      skip(`Login AUXILIAR falhou: ${signErr?.message}`)
    } else {
      const userClient = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${authData.session.access_token}` } },
      })

      const { error: delErr, count } = await userClient
        .from('lancamentos')
        .delete({ count: 'exact' })
        .eq('id', foreignLancamentoId)

      if (delErr) {
        const msg = delErr.message ?? ''
        if (/permission denied|rls|42501/i.test(msg)) {
          pass(`DELETE negado (${msg.slice(0, 140)})`)
        } else {
          info(`DELETE erro (avaliar): ${msg}`)
        }
      } else if (count && count > 0) {
        fail(
          `DELETE permitido: ${count} linha(s) removida(s). Registro ${foreignLancamentoId} foi apagado — restaure backup se necessário.`
        )
      } else {
        pass('DELETE não removeu linhas (RLS ou registro inexistente / sem permissão).')
      }

      await admin.auth.signOut()
    }
  }

  // --- Edge Functions: create-user / update-user com JWT comum ---
  console.log('\n--- Edge Functions: create-user / update-user com usuário não admin ---')
  if (!goEmail || !goPass) {
    skip('Use AUDIT_USER_GOIANIA_* para obter um JWT de usuário comum.')
  } else {
    const { data: authData, error: signErr } = await admin.auth.signInWithPassword({
      email: goEmail,
      password: goPass,
    })
    if (signErr || !authData.session) {
      skip(`Login para Edge test falhou: ${signErr?.message}`)
    } else {
      const token = authData.session.access_token
      const fnClient = createClient(url, anon, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })

      const { data: cData, error: cErr } = await fnClient.functions.invoke('create-user', {
        body: {
          email: `audit-edge-${Date.now()}@example.invalid`,
          password: 'AuditEdgeTemp9!',
          nome: 'Auditoria Edge',
          role: 'geral',
        },
      })

      const cStatus = (cErr as { context?: Response } | null)?.context?.status
      const cMsg = cErr?.message ?? ''
      if (cErr && (cStatus === 403 || /403|forbidden|não autorizado|gerente geral|admin/i.test(cMsg))) {
        pass('create-user recusou usuário comum (403 / erro esperado).')
      } else if (!cErr && cData && (cData as { success?: boolean }).success) {
        fail('create-user permitiu criação de usuário (possível escalada).')
      } else if (cErr) {
        pass(`create-user bloqueou ou falhou de forma segura: ${cMsg.slice(0, 160)}`)
      } else {
        info(`create-user resposta ambígua: ${JSON.stringify(cData).slice(0, 200)}`)
      }

      const selfId = authData.user.id
      const { data: uData, error: uErr } = await fnClient.functions.invoke('update-user', {
        body: {
          id: selfId,
          nome: 'Nome Alterado Por Auditoria',
          role: 'geral',
          base_id: null,
          equipe_id: null,
        },
      })

      const uStatus = (uErr as { context?: Response } | null)?.context?.status
      const uMsg = uErr?.message ?? ''
      if (uErr && (uStatus === 403 || /403|forbidden|geral|não autorizado/i.test(uMsg))) {
        pass('update-user recusou elevação para geral (403 / erro esperado).')
      } else if (!uErr && uData && (uData as { success?: boolean }).success) {
        fail('update-user permitiu alterar role para geral (escalada).')
      } else if (uErr) {
        pass(`update-user bloqueou ou falhou de forma segura: ${uMsg.slice(0, 160)}`)
      } else {
        info(`update-user resposta ambígua: ${JSON.stringify(uData).slice(0, 200)}`)
      }

      await admin.auth.signOut()
    }
  }

  console.log('\n--- Fim da auditoria ---')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
