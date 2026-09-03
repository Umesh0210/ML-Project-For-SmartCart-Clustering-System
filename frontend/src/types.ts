export interface DatasetSummary {
  name: string
  rows: number
  rows_after_cleaning: number
  columns: number
  missing_income: number
  engineered_columns: string[]
  summary: { metric: string; mean: number; min: number; max: number }[]
  preview: Record<string, string | number>[]
}

export interface KAnalysis {
  wcss: { k: number; wcss: number }[]
  silhouette: { k: number; score: number }[]
  elbow_k: number | null
  best_silhouette_k: number
}

export interface Profile {
  cluster: number
  size: number
  share: number
  name: string
  metrics: Record<string, number>
  education: Record<string, number>
  living_with: Record<string, number>
}

export interface ClusterPoint {
  x: number
  y: number
  z: number
  cluster: number
  income: number
  age: number
  spending: number
}

export interface ClusterResponse {
  k: number
  silhouette: number
  explained_variance: number[]
  points: ClusterPoint[]
  profiles: Profile[]
}

export interface Schema {
  numeric: { name: string; default: number; min: number; max: number }[]
  categorical: { name: string; options: string[] }[]
}
