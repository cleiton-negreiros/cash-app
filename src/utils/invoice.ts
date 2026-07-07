export interface InvoicePeriod {
  start: string
  end: string
  dueDate: string | null
  label: string
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril',
  'Maio', 'Junho', 'Julho', 'Agosto',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function getInvoicePeriod(
  closingDay: number | undefined,
  dueDay: number | undefined,
  referenceDate: Date
): InvoicePeriod | null {
  if (!closingDay) return null

  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const day = referenceDate.getDate()

  let startMonth: number, startYear: number, endMonth: number, endYear: number

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
    label: `${MONTH_NAMES[endMonth]} ${endYear}`,
  }
}
