<div align="center">

# 🧠 CaptionAI

### Fuzzy Logic-Driven AI Caption Generation System


**CaptionAI** generates tailored, context-aware captions for images and videos by combining **Fuzzy Logic** with four custom Machine Learning algorithms — DBSCAN, KNN, and PCA + SVM — to interpret user preferences, detect image mood, and learn from usage history.

[Live Demo](#) · [Report Bug](../../issues) · [Request Feature](../../issues)

</div>

---

## ✨ What Makes CaptionAI Different

| Feature | ChatGPT / Generic AI | CaptionAI |
|---|---|---|
| Vague preference handling | ❌ Needs exact instructions | ✅ Fuzzy Logic maps sliders to precise behaviour |
| Mood-aware caption tone | ❌ Not available | ✅ PCA + SVM auto-sets Tone slider on upload |
| Platform-specific formatting | ❌ Must instruct every time | ✅ Rule base applies hashtags, char limits, emoji |
| Caption history clustering | ❌ No history analysis | ✅ DBSCAN groups captions by writing style |
| Preference learning | ❌ No personalisation | ✅ KNN recommends settings from your save history |
| Outlier detection | ❌ Not available | ✅ DBSCAN noise labelling for unique captions |

---

## 🏗️ System Architecture

```
Image Upload
     │
     ▼
┌─────────────────────────────┐
│   PCA + SVM Mood Detector   │  ← auto-sets Tone slider
│  12 colour features → PCA   │
│  → LinearSVM → Positive /   │
│  Energetic / Dark / Neutral  │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│    Fuzzy Logic Engine (FIS)  │  ← maps vague sliders → prompt
│  Fuzzification → Rule Base  │
│  → Mamdani Inference →      │
│  Defuzzification → Prompt   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│     Gemini 2.0 Flash API    │  ← generates caption
│  Multimodal Vision + NLG   │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│   DBSCAN Caption Clustering  │  ← groups history by style
│  TF-IDF → Cosine Distance   │
│  → Auto-discovers clusters  │
└────────────┬────────────────┘
             │
             ▼
┌─────────────────────────────┐
│     KNN Recommender         │  ← learns your preferences
│  13-dim feature vector →   │
│  Euclidean distance → K=3  │
│  nearest neighbours         │
└─────────────────────────────┘
```

---

## 🤖 ML Algorithms Implemented

### 1. 🎛️ Fuzzy Logic Engine (`src/lib/fuzzyEngine.js`)
Custom **Mamdani Fuzzy Inference System** built from scratch in JavaScript.
- **Fuzzification** — maps tone/length sliders (0–100) to linguistic variables with overlapping trapezoidal membership functions
- **Rule Base** — IF-THEN rules for style × platform combinations (poetic, journalistic, Instagram, Twitter, accessibility, etc.)
- **Defuzzification** — `buildPromptFromPreferences()` assembles all fuzzy outputs into one crisp LLM prompt string

### 2. 🌈 PCA + SVM Mood Detector (`src/lib/moodDetector.js`)
Trained on **FER-2013 + Face Emotion/Mood** Kaggle datasets (6,165 images, **97.3% accuracy**).
- **Feature extraction** — 12 perceptual colour features per image (HSV stats, warm/cool ratios, entropy, RGB means)
- **StandardScaler** — Z-score normalisation to equalise feature scales
- **PCA(3 components)** — reduces 12 dims → 3 principal axes (Luminance+Warmth, Vibrancy, Contrast/Tension)
- **LinearSVC (One-vs-Rest)** — classifies into Positive / Energetic / Dark/Moody / Neutral
- **Auto-sets Tone slider** instantly on image upload — before the user touches anything

### 3. 🔵 DBSCAN Clustering (`src/lib/dbscan.js`)
Custom unsupervised clustering on saved caption history — zero external dependencies.
- **TF-IDF vectorisation** — converts caption text to vocabulary-weighted numeric vectors
- **Cosine distance** — length-invariant stylistic similarity between captions
- **DBSCAN** (ε=0.55, minPts=2) — discovers clusters automatically, marks outliers as noise
- **Style labels** — Formal, Casual, Poetic, Journalistic, Technical, Noise/Outlier

### 4. 🟠 KNN Recommender (`src/lib/knnRecommender.js`)
Personalised preference recommendation from your caption save history.
- **13-dimensional feature vector** — tone (normalised), length (normalised), 5-dim one-hot style, 6-dim one-hot platform
- **Euclidean distance** — finds K=3 nearest neighbours in preference space
- **Majority vote** — recommends style and platform from neighbours
- **Inverse-distance weighted average** — recommends tone and length values

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [Gemini API key](https://aistudio.google.com/app/apikey) (free)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Aashna890/CaptionAI.git
cd CaptionAI

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env
```

Open `.env` and add your Gemini API key:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

```bash
# 4. Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Training the Mood Detector (Optional)

The app ships with pre-trained weights in `src/lib/moodModelWeights.json`. To retrain on your own datasets:

### 1. Download Kaggle datasets
- [FER-2013](https://www.kaggle.com/datasets/msambare/fer2013) — extract `train/` folder
- [Face Emotion/Mood](https://www.kaggle.com/datasets/tusharpaul2001/face-emotion-mood-image-dataset) — extract `images/` folder

### 2. Place datasets in the project
```
backend/
  images/
    train/         ← FER-2013 train/ folder
      angry/  happy/  sad/  neutral/  fear/  disgust/  surprise/
    images/
      train/       ← Face Mood dataset
        angry/  happy/  sad/  ...
```

### 3. Install Python dependencies & train
```bash
pip install scikit-learn numpy pillow tqdm
cd backend/train
python train_mood_model.py
```

The script auto-exports trained weights to `src/lib/moodModelWeights.json` and restarts are picked up by Vite automatically.

---

## 📁 Project Structure

```
CaptionAI/
├── src/
│   ├── api/
│   │   └── geminiclient.js          # Gemini API wrapper + localStorage CRUD
│   ├── components/
│   │   └── generate/
│   │       ├── MediaUploader.jsx     # Drag-drop image/video upload
│   │       ├── PreferencePanel.jsx   # Fuzzy sliders + style/platform selectors
│   │       ├── MoodDetectorBadge.jsx # PCA+SVM mood result badge
│   │       ├── KnnRecommendBanner.jsx# KNN recommendation banner
│   │       ├── CaptionResult.jsx     # Generated caption display
│   │       └── VideoAnalysisCard.jsx # Video scene analysis card
│   ├── lib/
│   │   ├── fuzzyEngine.js           # Mamdani FIS — Soft Computing core
│   │   ├── moodDetector.js          # PCA + Linear SVM inference
│   │   ├── moodModelWeights.json    # Trained model weights (JSON)
│   │   ├── dbscan.js                # DBSCAN on TF-IDF vectors
│   │   └── knnRecommender.js        # KNN preference recommender
│   └── pages/
│       ├── Generate.jsx             # Main caption generation page
│       └── History.jsx              # Caption history with cluster UI
├── backend/
│   ├── train/
│   │   └── train_mood_model.py      # Python training script (scikit-learn)
│   └── images/                      # Dataset folder (images not in repo)
│       ├── train/                   # Place FER-2013 train/ here
│       └── validation/              # Place validation images here
├── .env.example                     # Environment variable template
├── .gitignore
└── README.md
```

---

## 🛠️ Tech Stack

| Technology | Role |
|---|---|
| React 18 + Vite | Frontend SPA framework |
| TailwindCSS v3 | Utility-first styling |
| Framer Motion | Animations & transitions |
| Radix UI | Accessible component primitives |
| TanStack Query v5 | Caption history state management |
| Gemini 2.0 Flash | Multimodal vision + caption NLG |
| scikit-learn (Python) | PCA + SVM model training |
| localStorage | Client-side persistence (no backend) |

---

## 🎓 Academic Context

CaptionAI was built as an academic project for **Soft Computing & Machine Learning** subjects. All four ML algorithms are implemented from scratch with zero ML libraries at inference time:

- **Fuzzy Logic** (Soft Computing) — Mamdani FIS in pure JavaScript
- **PCA + SVM** (Machine Learning) — Python training → JSON export → JS inference  
- **DBSCAN** (Machine Learning) — TF-IDF + cosine distance in pure JavaScript
- **KNN** (Machine Learning) — 13-dim Euclidean distance in pure JavaScript

---
