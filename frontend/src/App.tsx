import { useCallback, useEffect, useState } from 'react'
import {
  downloadUrl,
  fetchClusters,
  fetchDataset,
  fetchKAnalysis,
  fetchSchema,
} from './api'
import { ClusterPlot } from './components/ClusterPlot'
import { DatasetPanel } from './components/DatasetPanel'
import { KAnalysisPanel } from './components/KAnalysisPanel'
import { PredictForm } from './components/PredictForm'
import { SegmentCards } from './components/SegmentCards'
import type { ClusterResponse, DatasetSummary, KAnalysis, Schema } from './types'
import './App.css'

export default function App() {
  const [datasetId, setDatasetId] = useState('default')
  const [k, setK] = useState(4)
  const [dataset, setDataset] = useState<DatasetSummary>()
  const [analysis, setAnalysis] = useState<KAnalysis>()
  const [schema, setSchema] = useState<Schema>()
  const [clusters, setClusters] = useState<ClusterResponse>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(undefined)
    Promise.all([fetchDataset(datasetId), fetchKAnalysis(datasetId), fetchSchema(datasetId)])
      .then(([datasetSummary, kAnalysis, inputSchema]) => {
        if (cancelled) return
        setDataset(datasetSummary)
        setAnalysis(kAnalysis)
        setSchema(inputSchema)
        if (kAnalysis.elbow_k) setK(kAnalysis.elbow_k)
      })
      .catch((err) => !cancelled && setError((err as Error).message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [datasetId])

  useEffect(() => {
    let cancelled = false
    fetchClusters(datasetId, k)
      .then((response) => !cancelled && setClusters(response))
      .catch((err) => !cancelled && setError((err as Error).message))
    return () => {
      cancelled = true
    }
  }, [datasetId, k])

  const handleDatasetChange = useCallback((id: string) => {
    setClusters(undefined)
    setDatasetId(id)
  }, [])

  return (
    <div className="app">
      <header className="hero">
        <h1>SmartCart Clustering System</h1>
        <p>
          Customer segmentation over the SmartCart e-commerce dataset — preprocessing, PCA and
          KMeans from the original notebook, made interactive.
        </p>
      </header>

      {error && <p className="error banner">{error}</p>}
      {loading && <p className="muted banner">Running the pipeline…</p>}

      {dataset && <DatasetPanel dataset={dataset} onDatasetChange={handleDatasetChange} />}
      {analysis && <KAnalysisPanel analysis={analysis} k={k} onSelectK={setK} />}
      {clusters && (
        <>
          <ClusterPlot
            points={clusters.points}
            profiles={clusters.profiles}
            explainedVariance={clusters.explained_variance}
            silhouette={clusters.silhouette}
          />
          <SegmentCards
            profiles={clusters.profiles}
            downloadHref={downloadUrl(datasetId, k)}
          />
        </>
      )}
      {schema && <PredictForm datasetId={datasetId} schema={schema} k={k} />}

      <footer className="muted">
        Pipeline: median income fill → Age / tenure / total spend / children features → outlier
        removal → one-hot encoding → standard scaling → PCA(3) → KMeans(k)
      </footer>
    </div>
  )
}
