import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { KAnalysis } from '../types'

interface Props {
  analysis: KAnalysis
  k: number
  onSelectK: (k: number) => void
}

const axis = { stroke: '#8892a6', fontSize: 12 }
const tooltipStyle = {
  background: '#12182a',
  border: '1px solid #263149',
  borderRadius: 8,
  color: '#e8ecf5',
}

export function KAnalysisPanel({ analysis, k, onSelectK }: Props) {
  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Choosing k</h2>
          <p className="muted">
            Elbow suggests k = {analysis.elbow_k ?? '—'} · best silhouette at k ={' '}
            {analysis.best_silhouette_k}
          </p>
        </div>
        <div className="k-picker">
          {Array.from({ length: 9 }, (_, i) => i + 2).map((value) => (
            <button
              key={value}
              className={value === k ? 'chip active' : 'chip'}
              onClick={() => onSelectK(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </header>

      <div className="chart-row">
        <div className="chart">
          <h3>Elbow (WCSS)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analysis.wcss}>
              <CartesianGrid stroke="#1e2740" />
              <XAxis dataKey="k" {...axis} />
              <YAxis {...axis} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={k} stroke="#f4a261" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="wcss" stroke="#5b8cff" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart">
          <h3>Silhouette score</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analysis.silhouette}>
              <CartesianGrid stroke="#1e2740" />
              <XAxis dataKey="k" {...axis} />
              <YAxis {...axis} domain={['auto', 'auto']} tickFormatter={(v) => v.toFixed(2)} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x={k} stroke="#f4a261" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="score" stroke="#41d3a5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
