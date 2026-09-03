"""SmartCart clustering pipeline.

Mirrors the analysis in smartcart.ipynb: preprocessing, feature engineering,
one-hot encoding, scaling, PCA and KMeans segmentation.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import numpy as np
import pandas as pd
from kneed import KneeLocator
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATA_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATASET = os.path.join(DATA_DIR, "smartcart_customers (2).csv")

REFERENCE_YEAR = 2026
CATEGORICAL_COLS = ["Education", "Living_with"]
SPENDING_COLS = [
    "MntWines",
    "MntFruits",
    "MntMeatProducts",
    "MntFishProducts",
    "MntSweetProducts",
    "MntGoldProds",
]
DROPPED_COLS = ["ID", "Year_Birth", "Marital_Status", "Kidhome", "Teenhome", "Dt_Customer"]

EDUCATION_MAP = {
    "Basic": "Undergraduate",
    "2n Cycle": "Undergraduate",
    "Graduation": "Graduate",
    "Master": "Postgraduate",
    "PhD": "Postgraduate",
}
LIVING_MAP = {
    "Married": "Partner",
    "Together": "Partner",
    "Single": "Alone",
    "Divorced": "Alone",
    "Widow": "Alone",
    "Absurd": "Alone",
    "YOLO": "Alone",
}


def load_dataset(path: str | None = None) -> pd.DataFrame:
    return pd.read_csv(path or DEFAULT_DATASET)


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["Income"] = df["Income"].fillna(df["Income"].median())
    df["Age"] = REFERENCE_YEAR - df["Year_Birth"]
    df["Dt_Customer"] = pd.to_datetime(df["Dt_Customer"], dayfirst=True)
    df["Costumer_tenure_days"] = (df["Dt_Customer"].max() - df["Dt_Customer"]).dt.days
    df["Total_spending"] = df[SPENDING_COLS].sum(axis=1)
    df["Total_children"] = df["Kidhome"] + df["Teenhome"]
    df["Education"] = df["Education"].str.strip().replace(EDUCATION_MAP)
    df["Living_with"] = df["Marital_Status"].str.strip().replace(LIVING_MAP)
    return df


def remove_outliers(df: pd.DataFrame) -> pd.DataFrame:
    return df[(df["Age"] < 90) & (df["Income"] < 600_000)].copy()


def clean(df: pd.DataFrame) -> pd.DataFrame:
    """Feature engineering + column pruning + outlier removal."""
    enriched = engineer_features(df)
    cleaned = enriched.drop(columns=DROPPED_COLS + SPENDING_COLS)
    return remove_outliers(cleaned)


@dataclass
class SegmentationResult:
    cleaned: pd.DataFrame
    labels: np.ndarray
    coords: np.ndarray
    explained_variance: list[float]
    k: int
    silhouette: float


class SmartCartPipeline:
    """Fits the encoder / scaler / PCA once, then clusters for any k."""

    def __init__(self, df: pd.DataFrame):
        self.raw = df
        self.cleaned = clean(df)
        self.encoder = OneHotEncoder(handle_unknown="ignore")
        self.scaler = StandardScaler()
        self.pca = PCA(n_components=3)

        encoded = self._encode(self.cleaned)
        self.feature_names = list(encoded.columns)
        self.scaled = self.scaler.fit_transform(encoded)
        self.components = self.pca.fit_transform(self.scaled)
        self._models: dict[int, KMeans] = {}

    def _encode(self, cleaned: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        matrix = (
            self.encoder.fit_transform(cleaned[CATEGORICAL_COLS])
            if fit
            else self.encoder.transform(cleaned[CATEGORICAL_COLS])
        )
        encoded = pd.DataFrame(
            matrix.toarray(),
            columns=self.encoder.get_feature_names_out(CATEGORICAL_COLS),
            index=cleaned.index,
        )
        numeric = cleaned.drop(columns=CATEGORICAL_COLS)
        combined = pd.concat([numeric, encoded], axis=1)
        return combined if fit else combined[self.feature_names]

    def k_analysis(self, k_max: int = 10) -> dict:
        """Elbow (WCSS + KneeLocator) and silhouette scores across k."""
        ks = list(range(1, k_max + 1))
        wcss = [self._fit(k).inertia_ for k in ks]
        knee = KneeLocator(ks, wcss, curve="convex", direction="decreasing")

        silhouette_ks = list(range(2, k_max + 1))
        silhouettes = [
            float(silhouette_score(self.components, self._fit(k).labels_))
            for k in silhouette_ks
        ]
        return {
            "wcss": [{"k": k, "wcss": float(v)} for k, v in zip(ks, wcss)],
            "silhouette": [
                {"k": k, "score": s} for k, s in zip(silhouette_ks, silhouettes)
            ],
            "elbow_k": int(knee.elbow) if knee.elbow else None,
            "best_silhouette_k": silhouette_ks[int(np.argmax(silhouettes))],
        }

    def _fit(self, k: int) -> KMeans:
        if k not in self._models:
            self._models[k] = KMeans(n_clusters=k, random_state=42, n_init=10).fit(
                self.components
            )
        return self._models[k]

    def segment(self, k: int = 4) -> SegmentationResult:
        model = self._fit(k)
        return SegmentationResult(
            cleaned=self.cleaned,
            labels=model.labels_,
            coords=self.components,
            explained_variance=[float(v) for v in self.pca.explained_variance_ratio_],
            k=k,
            silhouette=float(silhouette_score(self.components, model.labels_))
            if k > 1
            else 0.0,
        )

    def input_schema(self) -> dict:
        """Fields the predict endpoint accepts, with dataset-derived defaults."""
        numeric = self.cleaned.drop(columns=CATEGORICAL_COLS)
        return {
            "numeric": [
                {
                    "name": col,
                    "default": float(numeric[col].median()),
                    "min": float(numeric[col].min()),
                    "max": float(numeric[col].max()),
                }
                for col in numeric.columns
            ],
            "categorical": [
                {"name": col, "options": sorted(self.cleaned[col].dropna().unique())}
                for col in CATEGORICAL_COLS
            ],
        }

    def _complete_customer(self, payload: dict) -> dict:
        numeric = self.cleaned.drop(columns=CATEGORICAL_COLS)
        row = {col: float(numeric[col].median()) for col in numeric.columns}
        for col in numeric.columns:
            if payload.get(col) is not None:
                row[col] = float(payload[col])
        for col in CATEGORICAL_COLS:
            row[col] = payload.get(col) or self.cleaned[col].mode().iat[0]
        return row

    def predict(self, customer: dict, k: int = 4) -> int:
        row = pd.DataFrame([self._complete_customer(customer)])
        encoded = self._encode(row, fit=False)
        scaled = self.scaler.transform(encoded)
        return int(self._fit(k).predict(self.pca.transform(scaled))[0])


def label_segment(profile: dict, medians: dict) -> str:
    """Plain-English name derived from a cluster's spending / income profile."""
    spend_high = profile["Total_spending"] >= medians["Total_spending"]
    income_high = profile["Income"] >= medians["Income"]
    kids = profile["Total_children"] >= 1

    if spend_high and income_high:
        return "Affluent big spenders"
    if income_high and not spend_high:
        return "High income, low engagement"
    if not income_high and spend_high:
        return "Budget-stretching enthusiasts"
    return "Price-sensitive families" if kids else "Occasional low-value shoppers"


PROFILE_COLS = [
    "Income",
    "Age",
    "Total_spending",
    "Total_children",
    "Recency",
    "Costumer_tenure_days",
    "NumWebPurchases",
    "NumStorePurchases",
    "NumCatalogPurchases",
    "NumDealsPurchases",
    "NumWebVisitsMonth",
    "Response",
]


def build_profiles(result: SegmentationResult) -> list[dict]:
    df = result.cleaned.copy()
    df["Cluster"] = result.labels
    medians = df[PROFILE_COLS].median().to_dict()

    profiles = []
    for cluster, group in df.groupby("Cluster"):
        means = {col: float(group[col].mean()) for col in PROFILE_COLS}
        profiles.append(
            {
                "cluster": int(cluster),
                "size": int(len(group)),
                "share": float(len(group) / len(df)),
                "name": label_segment(means, medians),
                "metrics": means,
                "education": group["Education"].value_counts().to_dict(),
                "living_with": group["Living_with"].value_counts().to_dict(),
            }
        )
    return profiles
