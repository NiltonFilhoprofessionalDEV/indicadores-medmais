-- Migration 024: Remover o trigger que reverte acesso_gerente_sci.
-- A regra "só role=geral altera" já é aplicada na RPC update_user_profile (get_caller_role_for_update).
-- O trigger usava get_current_user_role_and_base() e revertia o valor; isso impedia a alteração
-- mesmo quando a RPC já tinha escrito corretamente.

DROP TRIGGER IF EXISTS trg_check_acesso_gerente_sci_only_geral ON public.profiles;
