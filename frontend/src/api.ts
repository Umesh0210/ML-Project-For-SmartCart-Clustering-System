import type { ClusterResponse, DatasetSummary, KAnalysis, Profile, Schema } from './types'

async function get<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  )
  const response = await fetch(`/api/${path}?${query}`)
  if (!response.ok) throw new Error((await response.json()).error ?? response.statusText)
  return response.json()
}

export const fetchDataset = (datasetId: string) =>
  get<DatasetSummary>('dataset', { dataset_id: datasetId })

export const fetchKAnalysis = (datasetId: string) =>
  get<KAnalysis>('k-analysis', { dataset_id: datasetId })

export const fetchClusters = (datasetId: string, k: number) =>
  get<ClusterResponse>('clusters', { dataset_id: datasetId, k })

export const fetchSchema = (datasetId: string) => get<Schema>('schema', { dataset_id: datasetId })

export const downloadUrl = (datasetId: string, k: number) =>
  `/api/download?dataset_id=${datasetId}&k=${k}`

export async function uploadDataset(file: File) {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch('/api/upload', { method: 'POST', body })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'upload failed')
  return data as { dataset_id: string; rows: number }
}

export async function predictSegment(
  datasetId: string,
  payload: Record<string, string | number>,
) {
  const response = await fetch(`/api/predict?dataset_id=${datasetId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'prediction failed')
  return data as { cluster: number; profile: Profile }
}
