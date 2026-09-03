import type { Profile } from '../types'
import { CLUSTER_COLORS } from '../colors'

interface Props {
  profiles: Profile[]
  downloadHref: string
}

const currency = (value: number) => `$${Math.round(value).toLocaleString()}`

export function SegmentCards({ profiles, downloadHref }: Props) {
  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Segment profiles</h2>
          <p className="muted">Averages per cluster, with a plain-English label</p>
        </div>
        <a className="button-link" href={downloadHref}>
          Download labelled CSV
        </a>
      </header>

      <div className="segment-grid">
        {profiles.map((profile) => (
          <article
            key={profile.cluster}
            className="segment"
            style={{ borderTopColor: CLUSTER_COLORS[profile.cluster % CLUSTER_COLORS.length] }}
          >
            <h3>{profile.name}</h3>
            <p className="muted">
              Cluster {profile.cluster} · {profile.size.toLocaleString()} customers (
              {(profile.share * 100).toFixed(1)}%)
            </p>
            <dl>
              <div>
                <dt>Avg income</dt>
                <dd>{currency(profile.metrics.Income)}</dd>
              </div>
              <div>
                <dt>Avg spend</dt>
                <dd>{currency(profile.metrics.Total_spending)}</dd>
              </div>
              <div>
                <dt>Avg age</dt>
                <dd>{profile.metrics.Age.toFixed(0)}</dd>
              </div>
              <div>
                <dt>Children</dt>
                <dd>{profile.metrics.Total_children.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Web / store buys</dt>
                <dd>
                  {profile.metrics.NumWebPurchases.toFixed(1)} /{' '}
                  {profile.metrics.NumStorePurchases.toFixed(1)}
                </dd>
              </div>
              <div>
                <dt>Campaign response</dt>
                <dd>{(profile.metrics.Response * 100).toFixed(0)}%</dd>
              </div>
            </dl>
            <p className="tags">
              {Object.entries(profile.education).map(([level, count]) => (
                <span key={level} className="tag">
                  {level} {count}
                </span>
              ))}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}
