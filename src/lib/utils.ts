export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('pt-BR').format(d)
}

export function formatDateInput(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(' ')
}

export const STATUS_OBRA: Record<string, { label: string; color: string }> = {
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
  concluida: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
  pausada: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800' },
  cancelada: { label: 'Cancelada', color: 'bg-red-100 text-red-800' },
}

export const CATEGORIAS_LANCAMENTO = [
  { value: 'material', label: 'Material' },
  { value: 'mao_de_obra', label: 'Mão de Obra' },
  { value: 'equipamento', label: 'Equipamento' },
  { value: 'servico', label: 'Serviço Terceirizado' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'receita', label: 'Receita de Cliente' },
  { value: 'outros', label: 'Outros' },
]

export const TIPOS_PAGAMENTO = [
  { value: 'salario', label: 'Salário' },
  { value: 'adiantamento', label: 'Adiantamento' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'hora_extra', label: 'Hora Extra' },
  { value: 'rescisao', label: 'Rescisão' },
]
