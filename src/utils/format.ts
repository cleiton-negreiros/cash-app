export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('pt-BR')
}

export function getMonthYear(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const month = date.getMonth()
  const year = date.getFullYear()
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril',
    'Maio', 'Junho', 'Julho', 'Agosto',
    'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return `${months[month]} ${year}`
}

export function getMonth(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getMonth()
}

export function getYear(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getFullYear()
}

export function getCurrentMonthYear(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
