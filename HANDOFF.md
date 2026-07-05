# Handoff: opencode + Hermes Agent

## Processo de Trabalho (Automático)

O workflow completo está em `.hermes/workflow.md`. Resumo:

1. **opencode** recebe tarefa → implementa → escreve `.hermes/ready.md` + commita com `[hermes:ready]`
2. **Hermes** detecta `ready.md` → revisa o diff → escreve `.hermes/review.md`
3. **opencode** lê `review.md` → corrige se necessário → ciclo continua até `approved: true`
4. **opencode** remove `ready.md` → ciclo encerra

> ⚡ **Sem intervenção do usuário.** O ciclo roda por si só via arquivos de sinalização.

## Tarefas Hermes

| # | Tarefa | Status | Observações |
|---|--------|--------|-------------|
| 1 | Garantir fechamento de cartão gerar saída de caixa na conta de pagamento | [feito] | `linkedAccountId` adicionado no tipo Account, migration, `useAccounts` deduz fatura do saldo da conta vinculada, `InvoiceView` tem botão "Pagar Fatura via [CONTA]" |
| 2 | Vincular amortização de empréstimo a transação mensal | [feito] | `loanPayment` (monthly_payment* dos loans) agora é computado e exibido no Balanço Mensal e usado na PROVA |
| 3 | Remover dupla contagem entre `transactions` e `investments` | [feito] | `investmentTx` removido do Balanço Mensal. `expense` = apenas `type: 'expense'` (não investment). `investedTotal/redeemedTotal` vêm só de `investment_transactions`. Fórmula da PROVA usa uma fonte única |
| 4 | Padronizar CSV/OFX de importação e regra de categorização | [feito] | `detectCategory()` adicionada ao parser com 12 regras de padrões brasileiros (alimentação, transporte, moradia, etc). Toda transação importada já chega com `category` |
| 5 | Definir tela inicial padrão por perfil | [feito] | `localStorage('cashapp:defaultTab')`. Perfil do usuário tem seção "Tela Inicial" com select. Padrão = dashboard |

## Tarefas Opencode (pendentes)

- [x] Rodar migrations no Supabase (00001-00006 aplicadas, tracking em `_migrations`)
- [x] Popular `investments` com dados reais da planilha (14 categorias, ~R$90k)
- [x] Popular `monthly_snapshots` com histórico mensal (11 meses, ago/25 a jun/26)
- [x] Popular `loans` (empréstimo SH - Economato Shalom, R$10.923,33)
- [x] Popular transações de Julho/26 (63 transações importadas do CSV mensal)
- [ ] Commit e revisão Hermes das alterações

## Como usar

### App
```bash
npm run dev
```
Login com email/senha. Dados já estão no Supabase.

### Fluxo para bater com a planilha
1. A cada transação em Julho, adicione no app (ou importe CSV/OFX)
2. No fim do mês, confira o Balanço Mensal vs planilha
3. A PROVA (fórmula de verificação) deve mostrar 0 quando tudo bater

## Decisões de Arquitetura

| Decisão | Justificativa |
|---------|---------------|
| `investments` com `total_invested`, `total_redeemed`, `total_yield` | Evita recomputar histórico a cada carga; espelha a planilha |
| `monthly_snapshots` separado de `transactions` | Permite armazenar balanços mensais mesmo sem transação por transação no sistema |
| `InvestmentType` com 17 subtipos | Cobre exatamente os grupos da planilha do usuário |
| ROFX parser dedicado em `api/investment/parse.ts` | Formato OFX de corretagem (`INVSTMTMSGSRSV1`) difere do bancário |

## Mudanças Recentes

- 04/jul/2026: Seed de dados reais no Supabase (investments, loans, monthly_snapshots, transações Jul/26)
- 04/jul/2026: Pooler configurado para conexão direta via `pg` (scripts/seed-from-csv.mjs)
- 04/jul/2026: Unique constraints adicionadas em `investments(id)`, `transactions(id)`, `accounts(id)` para FK funcionarem
- 30/jun/2026: Criadas migrations 00005 e 00006
- 30/jun/2026: Types expandidos (InvestmentType, Loan, MonthlySnapshot)
- 30/jun/2026: Services: investmentService, loanService, snapshotService
- 30/jun/2026: Pages: InvestmentPortfolio, PosicaoAtual, BalancoMensal
- 30/jun/2026: Tabs adicionadas: Investimentos, Posição, Balanço
