/**
 * validate-cc-invoice.mjs
 *
 * Validates credit-card invoice calculation logic.
 * Mirrors src/utils/invoice.ts exactly.
 *
 * Usage:  node scripts/validate-cc-invoice.mjs
 */

/* ============================================================
   Exact mirror of src/utils/invoice.ts:getInvoicePeriod
   ============================================================ */
function getInvoicePeriod(closingDay, dueDay, referenceDate) {
  if (!closingDay) return null

  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const day = referenceDate.getDate()

  let startMonth, startYear, endMonth, endYear

  if (day >= closingDay) {
    startMonth = month
    startYear = year
    endMonth = month + 1
    endYear = year
  } else {
    startMonth = month - 1
    startYear = year
    endMonth = month
    endYear = year
  }

  if (endMonth > 11) { endMonth = 0; endYear++ }
  if (startMonth < 0) { startMonth = 11; startYear-- }

  const startClosing = Math.min(closingDay, new Date(startYear, startMonth + 1, 0).getDate())
  const endClosing = Math.min(closingDay, new Date(endYear, endMonth + 1, 0).getDate())

  return {
    start: `${startYear}-${String(startMonth + 1).padStart(2, '0')}-${String(startClosing).padStart(2, '0')}`,
    end: `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(endClosing).padStart(2, '0')}`,
    dueDate: dueDay
      ? `${endYear}-${String(endMonth + 1).padStart(2, '0')}-${String(Math.min(dueDay, endClosing)).padStart(2, '0')}`
      : null,
    label: `${['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][endMonth]} ${endYear}`,
  }
}

/* ============================================================
   Invoice total computation (mirrors useAccounts.ts:27-39)
   ============================================================ */
function computeInvoiceTotal(transactions, account, referenceDate) {
  const period = getInvoicePeriod(account.closingDay, account.dueDay, referenceDate)
  if (!period) return 0
  return transactions
    .filter(t =>
      t.account === account.id &&
      t.type === 'expense' &&
      t.date >= period.start &&
      t.date < period.end
    )
    .reduce((sum, t) => sum + t.value, 0)
}

/* ============================================================
   linked-account deduction (mirrors useAccounts.ts:40-64)
   ============================================================ */
function computeLinkedDeduction(accounts, transactions, referenceDate) {
  const ccInvoices = {}
  for (const acc of accounts) {
    if (acc.accountType === 'credit_card') {
      const total = computeInvoiceTotal(transactions, acc, referenceDate)
      if (acc.linkedAccountId) {
        ccInvoices[acc.id] = { total, linkedTo: acc.linkedAccountId }
      }
    }
  }
  const deductions = {}
  for (const inv of Object.values(ccInvoices)) {
    deductions[inv.linkedTo] = (deductions[inv.linkedTo] || 0) + inv.total
  }
  return deductions
}

/* ============================================================
   Raw balance for non-CC account (mirrors useAccounts.ts:47-55)
   ============================================================ */
function computeRawBalance(account, transactions) {
  return transactions
    .filter(t => t.account === account.id)
    .reduce((acc, t) => {
      if (t.type === 'income')       return acc + t.value
      if (t.type === 'expense' || t.type === 'investment') return acc - t.value
      return acc
    }, account.balance)
}

/* ============================================================
   Helpers
   ============================================================ */
let passed = 0
let failed = 0

function assert(condition, msg) {
  if (!condition) {
    console.error('  FAIL: ' + msg)
    failed++
    return false
  }
  console.log('  PASS')
  passed++
  return true
}

function header(text) {
  console.log(`\n${'='.repeat(60)}\n${text}\n${'='.repeat(60)}`)
}

/* ============================================================
   ISSUE REPORTS
   ============================================================ */
const issues = []
function reportIssue(section, severity, description, suggestedFix) {
  issues.push({ section, severity, description, suggestedFix })
}

/* ============================================================
   TEST DATA
   ============================================================ */

const cardNubank = {
  id: 'nubank',
  name: 'Nubank',
  balance: 0,
  color: '#820ad1',
  accountType: 'credit_card',
  closingDay: 15,
  dueDay: 2,
  linkedAccountId: 'c6',
  creditLimit: 5000,
}

const cardInter = {
  id: 'inter',
  name: 'Inter',
  balance: 0,
  color: '#ff6b00',
  accountType: 'credit_card',
  closingDay: 10,
  dueDay: 18,
  linkedAccountId: 'santander',
  creditLimit: 3000,
}

const checkingC6 = {
  id: 'c6',
  name: 'C6',
  balance: 10000,
  color: '#e11d48',
  accountType: 'checking',
}

const checkingSantander = {
  id: 'santander',
  name: 'Santander',
  balance: 5000,
  color: '#ec0000',
  accountType: 'checking',
}

/* ============================================================
   TEST 1  –  Basic invoice, no boundary overlap
   ============================================================ */
header('TEST 1: Basic invoice (no boundary)')
{
  const ref = new Date('2026-07-20T12:00:00')
  const txs = [
    { id: 't1', account: 'nubank', type: 'expense', date: '2026-07-16', value: 150 },
    { id: 't2', account: 'nubank', type: 'expense', date: '2026-07-25', value: 200 },
    { id: 't3', account: 'nubank', type: 'expense', date: '2026-08-10', value: 80 },
    { id: 't4', account: 'nubank', type: 'expense', date: '2026-07-10', value: 999 },
  ]
  const period = getInvoicePeriod(cardNubank.closingDay, cardNubank.dueDay, ref)
  console.log('  Period:', period)
  const total = computeInvoiceTotal(txs, cardNubank, ref)
  console.log('  Total:', total, '(expect 430)')
  assert(total === 430, `expected 430, got ${total}`)
}

/* ============================================================
   TEST 2  –  Transaction ON the closing day (boundary)
   ============================================================ */
header('TEST 2: Transaction ON the closing day (boundary)')
{
  const txs = [
    { id: 't1', account: 'nubank', type: 'expense', date: '2026-07-15', value: 300 },
  ]

  const refBefore = new Date('2026-07-14T12:00:00')
  const periodBefore = getInvoicePeriod(cardNubank.closingDay, cardNubank.dueDay, refBefore)
  console.log('  Period (Jul 14):', periodBefore)

  const refOn = new Date('2026-07-15T12:00:00')
  const periodOn = getInvoicePeriod(cardNubank.closingDay, cardNubank.dueDay, refOn)
  console.log('  Period (Jul 15):', periodOn)

  const totalBefore = computeInvoiceTotal(txs, cardNubank, refBefore)
  const totalOn     = computeInvoiceTotal(txs, cardNubank, refOn)

  console.log('  Total checked Jul 14:', totalBefore)
  console.log('  Total checked Jul 15:', totalOn)

  // App uses t.date < period.end (exclusive), so Jul 15 is NOT in [Jun 15, Jul 15)
  assert(totalBefore === 0,
    `Expected 0 (Jul 15 is EXCLUDED by <), got ${totalBefore}`
  )
  // Jul 15 is in [Jul 15, Aug 15)
  assert(totalOn === 300,
    `Expected 300 (Jul 15 is now in this period), got ${totalOn}`
  )
}

/* ============================================================
   TEST 3  –  Closed invoice disappears after closing day
   ============================================================ */
header('TEST 3: Closed invoice disappears after closing day')
{
  const txs = [
    { id: 't1', account: 'nubank', type: 'expense', date: '2026-07-10', value: 200 },
    { id: 't2', account: 'nubank', type: 'expense', date: '2026-07-14', value: 150 },
  ]

  const refBefore = new Date('2026-07-14T12:00:00')
  const totalBefore = computeInvoiceTotal(txs, cardNubank, refBefore)
  console.log('  Total before closing (Jul 14):', totalBefore, '(should be 350)')

  const refAfter = new Date('2026-07-16T12:00:00')
  const totalAfter = computeInvoiceTotal(txs, cardNubank, refAfter)
  console.log('  Total after closing (Jul 16):', totalAfter, '(should be 0)')

  assert(totalBefore === 350, `expected 350 before closing, got ${totalBefore}`)
  assert(totalAfter === 0, `expected 0 after closing, got ${totalAfter}`)

  reportIssue(
    'useAccounts.ts:40-64',
    'medium',
    `After closing day (${cardNubank.closingDay}), getInvoicePeriod() shifts to the next period. ` +
      'The previous (closed) invoice is no longer visible. The linked-account deduction drops to 0 ' +
      'immediately, even if the invoice hasn\'t been paid yet.',
    'This is by design. The "Pagar Fatura" button creates an expense transaction on the linked account, ' +
      'which becomes the cash outflow deduction.'
  )
}

/* ============================================================
   TEST 4  –  Linked account deduction
   ============================================================ */
header('TEST 4: Linked account deduction')
{
  const ref = new Date('2026-07-20T12:00:00')
  const txs = [
    { id: 'n1', account: 'nubank', type: 'expense', date: '2026-07-16', value: 500 },
    { id: 'n2', account: 'nubank', type: 'expense', date: '2026-08-05', value: 300 },
    { id: 'i1', account: 'inter', type: 'expense', date: '2026-07-11', value: 200 },
    { id: 'i2', account: 'inter', type: 'expense', date: '2026-07-20', value: 100 },
    { id: 'c1', account: 'c6', type: 'income', date: '2026-07-20', value: 5000 },
  ]

  const deductions = computeLinkedDeduction(
    [cardNubank, cardInter, checkingC6, checkingSantander],
    txs, ref
  )

  console.log('  Deductions:', JSON.stringify(deductions))
  assert(deductions['c6'] === 800, `expected C6 deduction 800, got ${deductions['c6']}`)
  assert(deductions['santander'] === 300, `expected Santander deduction 300, got ${deductions['santander']}`)

  const rawC6 = computeRawBalance(checkingC6, txs)
  const finalC6 = rawC6 - (deductions['c6'] || 0)
  console.log('  C6 raw:', rawC6, ', final:', finalC6)
  assert(finalC6 === 14200, `expected C6 final 14200, got ${finalC6}`)
}

/* ============================================================
   TEST 5  –  Closing on the 31st (month-end edge case)
   ============================================================ */
header('TEST 5: Closing on the 31st (month-end edge case)')
{
  const cardEnd = {
    id: 'card-end',
    name: 'EndMonth',
    balance: 0,
    accountType: 'credit_card',
    closingDay: 31,
    dueDay: 10,
    linkedAccountId: 'c6',
  }

  // Feb 28, 2026 — closing is normally 31, but Feb has only 28 days
  const refFeb = new Date('2026-02-28T12:00:00')
  const period = getInvoicePeriod(cardEnd.closingDay, cardEnd.dueDay, refFeb)
  console.log('  Period (Feb 28):', JSON.stringify(period))

  // Start uses Jan's valid closing (31), end is clipped to Feb 28
  assert(period.start === '2026-01-31', `start expected 2026-01-31, got ${period.start}`)
  assert(period.end   === '2026-02-28', `end expected 2026-02-28, got ${period.end}`)
  assert(period.dueDate === '2026-02-10', `dueDate expected 2026-02-10, got ${period.dueDate}`)
}

/* ============================================================
   TEST 6  –  Account without closingDay returns null
   ============================================================ */
header('TEST 6: Account without closingDay returns null')
{
  const result = getInvoicePeriod(undefined, undefined, new Date('2026-07-20'))
  assert(result === null, `expected null, got ${JSON.stringify(result)}`)
}

/* ============================================================
   TEST 7  –  December → January year boundary
   ============================================================ */
header('TEST 7: Year boundary (Dec/Jan)')
{
  const ref = new Date('2026-12-20T12:00:00')
  const period = getInvoicePeriod(cardNubank.closingDay, cardNubank.dueDay, ref)
  console.log('  Period (Dec 20):', JSON.stringify(period))
  assert(period.start === '2026-12-15', `start expected 2026-12-15, got ${period.start}`)
  assert(period.end   === '2027-01-15', `end expected 2027-01-15, got ${period.end}`)

  // Jan 14, 2027 (before closing day 15)
  const refJanBefore = new Date('2027-01-14T12:00:00')
  const periodJan = getInvoicePeriod(cardNubank.closingDay, cardNubank.dueDay, refJanBefore)
  console.log('  Period (Jan 14):', JSON.stringify(periodJan))
  assert(periodJan.start === '2026-12-15', `start expected 2026-12-15, got ${periodJan.start}`)
  assert(periodJan.end   === '2027-01-15', `end expected 2027-01-15, got ${periodJan.end}`)
}

/* ============================================================
   TEST 8  –  Multiple linked CCs to same account
   ============================================================ */
header('TEST 8: Multiple CCs linked to the same account')
{
  const cardC6 = {
    id: 'c6-card',
    name: 'C6 Card',
    balance: 0,
    accountType: 'credit_card',
    closingDay: 3,
    dueDay: 10,
    linkedAccountId: 'c6',
    creditLimit: 2000,
  }

  const ref = new Date('2026-07-20T12:00:00')
  const txs = [
    { id: 'n1', account: 'nubank', type: 'expense', date: '2026-07-16', value: 100 },
    { id: 'c1', account: 'c6-card', type: 'expense', date: '2026-07-05', value: 200 },
  ]

  const deductions = computeLinkedDeduction(
    [cardNubank, cardC6, checkingC6],
    txs, ref
  )

  console.log('  Deductions:', JSON.stringify(deductions))
  // Nubank = 100 (Jul 16 in [Jul 15, Aug 15)), C6 Card period = [Jul 3, Aug 3)
  //   Jul 5 in [Jul 3, Aug 3) = 200
  assert(deductions['c6'] === 300, `expected C6 deduction 300, got ${deductions['c6']}`)
}

/* ============================================================
   SUMMARY
   ============================================================ */

console.log(`\n${'='.repeat(60)}`)
console.log(`  ${passed} PASSED, ${failed} FAILED`)
console.log('='.repeat(60))

if (failed > 0) {
  process.exitCode = 1
}

if (issues.length > 0) {
  console.log(`\n${'='.repeat(60)}`)
  console.log('  OBSERVATIONS (not failures)')
  console.log('='.repeat(60))
  const order = { high: 0, medium: 1, low: 2 }
  issues.sort((a, b) => order[a.severity] - order[b.severity])
  for (const [i, issue] of issues.entries()) {
    console.log(`\n--- Issue #${i + 1} [${issue.severity.toUpperCase()}] ${issue.section}`)
    console.log(`  ${issue.description}`)
    console.log(`  Note: ${issue.suggestedFix}`)
  }
}

console.log()
