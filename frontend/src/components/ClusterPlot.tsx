import { useEffect, useRef } from 'react'
import Plotly from 'plotly.js-dist-min'
import type { ClusterPoint, Profile } from '../types'
import { CLUSTER_COLORS } from '../colors'

interface Props {
  points: ClusterPoint[]
  profiles: Profile[]
  explainedVariance: number[]
  silhouette: number
}

export function ClusterPlot({ points, profiles, explainedVariance, silhouette }: Props) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = container.current
    if (!el) return

    const traces = profiles.map((profile) => {
      const members = points.filter((point) => point.cluster === profile.cluster)
      return {
        type: 'scatter3d',
        mode: 'markers',
        name: `${profile.cluster} · ${profile.name}`,
        x: members.map((p) => p.x),
        y: members.map((p) => p.y),
        z: members.map((p) => p.z),
        text: members.map(
          (p) => `Income ${Math.round(p.income).toLocaleString()}<br>Age ${p.age}<br>Spend ${Math.round(p.spending)}`,
        ),
        hovertemplate: '%{text}<extra></extra>',
        marker: { size: 3.5, color: CLUSTER_COLORS[profile.cluster % CLUSTER_COLORS.length], opacity: 0.85 },
      }
    })

    const axisStyle = (title: string) => ({
      title: { text: title, font: { color: '#8892a6', size: 11 } },
      gridcolor: '#232c44',
      zerolinecolor: '#2d3a5c',
      color: '#8892a6',
    })

    Plotly.react(
      el,
      traces,
      {
        margin: { l: 0, r: 0, t: 0, b: 0 },
        paper_bgcolor: 'rgba(0,0,0,0)',
        showlegend: true,
        legend: { font: { color: '#c6cee0', size: 11 }, orientation: 'h', y: -0.05 },
        scene: {
          bgcolor: 'rgba(0,0,0,0)',
          xaxis: axisStyle('PCA 1'),
          yaxis: axisStyle('PCA 2'),
          zaxis: axisStyle('PCA 3'),
        },
      },
      { responsive: true, displayModeBar: false },
    )

    return () => Plotly.purge(el)
  }, [points, profiles])

  const variance = explainedVariance.reduce((sum, value) => sum + value, 0)

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Customer segments in PCA space</h2>
          <p className="muted">
            {points.length.toLocaleString()} customers · silhouette {silhouette.toFixed(3)} ·{' '}
            {(variance * 100).toFixed(1)}% variance captured by 3 components
          </p>
        </div>
      </header>
      <div ref={container} className="plot" />
    </section>
  )
}
