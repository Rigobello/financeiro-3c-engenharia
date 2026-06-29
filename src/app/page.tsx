'use client'

import { useEffect, useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  HardHat,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import Link from 'next/link'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface DashboardData {
  totalEntradas: number
  totalSaidas: number
  totalPagamentos: number
  saldoGeral: number
  obrasEmAndamento: number
  obrasConcluidas: number
  totalObras: number
  funcionariosAtivos: number
  resumoObras: {
    id: string
    nome: string
    status: string
    orcamento: number
    saldo: number
    totalEntradas: number
    totalSaidas: number
  }[]
  ultimasMovimentacoes: {
    id: string
    tipo: string
    descricao: string
    valor: number
    data: string
    obra: string
    categoria: string
  }[]
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  sub,
}: {
  title: string
  value: string
  icon: React.ElementType
  color: string
  sub?: string
}) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-xl font-bold text-slate-900">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardBody>
    </Card>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const chartData = data.resumoObras
    .filter((o) => o.status === 'em_andamento')
    .map((o) => ({
      name: o.nome.length > 15 ? o.nome.slice(0, 15) + '...' : o.nome,
      Entradas: o.totalEntradas,
      Saídas: o.totalSaidas,
    }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Financeiro</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral de todas as obras</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Geral"
          value={formatCurrency(data.saldoGeral)}
          icon={Wallet}
          color={data.saldoGeral >= 0 ? 'bg-green-500' : 'bg-red-500'}
        />
        <StatCard
          title="Total de Entradas"
          value={formatCurrency(data.totalEntradas)}
          icon={TrendingUp}
          color="bg-blue-500"
        />
        <StatCard
          title="Total de Saídas"
          value={formatCurrency(data.totalSaidas + data.totalPagamentos)}
          icon={TrendingDown}
          color="bg-red-400"
          sub={`Pagamentos: ${formatCurrency(data.totalPagamentos)}`}
        />
        <StatCard
          title="Obras em Andamento"
          value={String(data.obrasEmAndamento)}
          icon={HardHat}
          color="bg-orange-500"
          sub={`${data.funcionariosAtivos} funcionários ativos`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <h2 className="font-semibold text-slate-800">Entradas vs Saídas por Obra</h2>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Saídas" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Obras em Andamento</h2>
            <Link href="/obras" className="text-xs text-orange-500 hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {data.resumoObras.filter((o) => o.status === 'em_andamento').length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhuma obra em andamento</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.resumoObras
                  .filter((o) => o.status === 'em_andamento')
                  .slice(0, 5)
                  .map((obra) => (
                    <Link
                      key={obra.id}
                      href={`/obras/${obra.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{obra.nome}</p>
                        <p className="text-xs text-slate-400">
                          Orçamento: {formatCurrency(obra.orcamento)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${obra.saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {obra.saldo >= 0 ? (
                            <ArrowUpRight size={12} className="inline" />
                          ) : (
                            <ArrowDownRight size={12} className="inline" />
                          )}
                          {formatCurrency(Math.abs(obra.saldo))}
                        </p>
                        <p className="text-xs text-slate-400">saldo</p>
                      </div>
                    </Link>
                  ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-800">Últimas Movimentações</h2>
        </CardHeader>
        <CardBody className="p-0">
          {data.ultimasMovimentacoes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhuma movimentação registrada</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.ultimasMovimentacoes.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        mov.tipo === 'entrada' ? 'bg-green-100' : mov.tipo === 'pagamento' ? 'bg-purple-100' : 'bg-red-100'
                      }`}
                    >
                      {mov.tipo === 'entrada' ? (
                        <TrendingUp size={14} className="text-green-600" />
                      ) : mov.tipo === 'pagamento' ? (
                        <Users size={14} className="text-purple-600" />
                      ) : (
                        <TrendingDown size={14} className="text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{mov.descricao}</p>
                      <p className="text-xs text-slate-400">
                        {mov.obra} · {formatDate(mov.data)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-500'}`}>
                    {mov.tipo === 'entrada' ? '+' : '-'} {formatCurrency(mov.valor)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
