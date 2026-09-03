import { useEffect, useMemo, useState } from 'react'
import { predictSegment } from '../api'
import type { Profile, Schema } from '../types'
import { CLUSTER_COLORS } from '../colors'

interface Props {
  datasetId: string
  schema: Schema
  k: number
}

const HIGHLIGHTED = [
  'Income',
  'Age',
  'Total_spending',
  'Total_children',
  'Recency',
  'NumWebPurchases',
  'NumStorePurchases',
  'NumWebVisitsMonth',
]

export function PredictForm({ datasetId, schema, k }: Props) {
  const fields = useMemo(
    () => schema.numeric.filter((field) => HIGHLIGHTED.includes(field.name)),
    [schema],
  )
  const [values, setValues] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ cluster: number; profile: Profile }>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const defaults: Record<string, string> = {}
    fields.forEach((field) => {
      defaults[field.name] = String(Math.round(field.default))
    })
    schema.categorical.forEach((field) => {
      defaults[field.name] = field.options[0]
    })
    setValues(defaults)
    setResult(undefined)
  }, [fields, schema])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(undefined)
    try {
      const payload: Record<string, string | number> = { k }
      Object.entries(values).forEach(([key, value]) => {
        payload[key] = schema.categorical.some((field) => field.name === key)
          ? value
          : Number(value)
      })
      setResult(await predictSegment(datasetId, payload))
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
          <h2>Score a new customer</h2>
          <p className="muted">Unspecified fields fall back to the dataset median</p>
        </div>
      </header>

      <form onSubmit={submit} className="form-grid">
        {fields.map((field) => (
          <label key={field.name}>
            <span>{field.name.replace(/_/g, ' ')}</span>
            <input
              type="number"
              step="any"
              value={values[field.name] ?? ''}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
              }
            />
          </label>
        ))}
        {schema.categorical.map((field) => (
          <label key={field.name}>
            <span>{field.name.replace(/_/g, ' ')}</span>
            <select
              value={values[field.name] ?? ''}
              onChange={(event) =>
                setValues((prev) => ({ ...prev, [field.name]: event.target.value }))
              }
            >
              {field.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button type="submit" disabled={busy}>
          {busy ? 'Scoring…' : 'Predict segment'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div
          className="prediction"
          style={{ borderColor: CLUSTER_COLORS[result.cluster % CLUSTER_COLORS.length] }}
        >
          <span className="muted">Assigned to</span>
          <strong>
            Cluster {result.cluster} · {result.profile.name}
          </strong>
          <span className="muted">
            Segment averages ${Math.round(result.profile.metrics.Income).toLocaleString()} income
            and ${Math.round(result.profile.metrics.Total_spending).toLocaleString()} spend across{' '}
            {result.profile.size.toLocaleString()} customers
          </span>
        </div>
      )}
    </section>
  )
}
