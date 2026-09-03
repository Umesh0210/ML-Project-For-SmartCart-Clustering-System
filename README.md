# 📊 ML Project: [SmartCart Clustering System]

## 🔹 Problem Statement
This project aims to solve [problems related to e-commerce platform serving customers and predict the best output , this helps us to grow the production and enhance it. e.g., predicting house prices, classifying emails as spam, etc.].

## 🔹 Dataset
- Dataset used: [Kaggle / custom dataset]

## 🔹 Technologies Used
- Python, NumPy, Pandas, Scikit-learn, Matplotlib, Seaborn (analysis)
- Flask (REST API)
- React + TypeScript + Vite, Recharts, Plotly (dashboard)

## 🔹 Machine Learning Algorithm
- [elbow_method / Silhouette Score / Decision Tree / etc.]

## 🔹 Model Performance
- k= 4 , which is best for this dataset

## 🔹 Web Dashboard
An interactive UI wraps the notebook pipeline: dataset overview, elbow / silhouette charts for
picking `k`, a 3D PCA cluster plot, per-segment profile cards, single-customer scoring and a
labelled CSV export. Custom CSVs with the same schema can be uploaded and clustered.

### Run the API
```bash
cd backend
pip install -r requirements.txt
python app.py            # http://localhost:8000
```

### Run the dashboard
```bash
cd frontend
npm install
npm run dev              # http://localhost:5173 (proxies /api to the Flask server)
```

| Endpoint | Purpose |
| --- | --- |
| `GET /api/dataset` | row counts, missing values, feature summary, preview |
| `GET /api/k-analysis` | WCSS + silhouette curves, elbow and best-silhouette k |
| `GET /api/clusters?k=4` | PCA coordinates, labels and segment profiles |
| `POST /api/predict` | assign a new customer to a segment |
| `POST /api/upload` | cluster a user-provided CSV |
| `GET /api/download?k=4` | labelled dataset as CSV |

## 🔹 How to Run (notebook)
1. Install dependencies:
