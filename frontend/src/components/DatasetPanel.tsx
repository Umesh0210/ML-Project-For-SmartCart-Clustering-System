import { useRef, useState } from 'react'
import { uploadDataset } from '../api'
import type { DatasetSummary } from '../types'

interface Props {
  dataset: DatasetSummary
  onDatasetChange: (id: string) => void
}

const formatNumber = (value: number) =>
  value >= 1000 ? Math.round(value).toLocaleString() : value.toFixed(1)

export function DatasetPanel({ dataset, onDatasetChange }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File) {
    setBusy(true)
    setError(undefined)
    try {
      const { dataset_id } = await uploadDataset(file)
      onDatasetChange(dataset_id)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Dataset</h2>
          <p className="muted">{dataset.name}</p>
        </div>
        <div className="actions">
          <button className="ghost" onClick={() => onDatasetChange('default')}>
            Use sample data
          </button>
          <button onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Processing…' : 'Upload CSV'}
          </button>
          <input
            ref={input}
            type="file"
            accept=".csv"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) handleFile(file)
              event.target.value = ''
            }}
          />
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="stat-grid">
        <div className="stat">
          <span>{dataset.rows.toLocaleString()}</span>
          <label>Customers</label>
        </div>
        <div className="stat">
          <span>{dataset.columns}</span>
          <label>Raw columns</label>
        </div>
        <div className="stat">
          <span>{dataset.missing_income}</span>
          <label>Missing incomes filled</label>
        </div>
        <div className="stat">
          <span>{(dataset.rows - dataset.rows_after_cleaning).toLocaleString()}</span>
          <label>Outliers removed</label>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Mean</th>
            <th>Min</th>
            <th>Max</th>
          </tr>
        </thead>
        <tbody>
          {dataset.summary.map((row) => (
            <tr key={row.metric}>
              <td>{row.metric}</td>
              <td>{formatNumber(row.mean)}</td>
              <td>{formatNumber(row.min)}</td>
              <td>{formatNumber(row.max)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="muted">
        Engineered features: {dataset.engineered_columns.join(', ')}
      </p>
    </section>
  )
}
