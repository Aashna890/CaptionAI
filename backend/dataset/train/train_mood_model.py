"""
train_mood_model.py — PCA + SVM Mood Detector Training
=======================================================
Supports TWO Kaggle datasets simultaneously:
  1. FER-2013     (msambare/fer2013)     — CSV with pixel values
  2. Face Emotion / Mood (tusharpaul2001/face-emotion-mood-image-dataset)
                                         — images/train/<emotion>/*.jpg

Pipeline: 12 color/perceptual features → StandardScaler → PCA(3) → LinearSVC

SETUP:
    pip install scikit-learn numpy pillow pandas tqdm

USAGE:
    python train_mood_model.py

    # With specific paths:
    python train_mood_model.py --fer2013 path/to/fer2013.csv --mood-dir path/to/images/train

OUTPUT:
    src/lib/moodModelWeights.json   (auto-copied to frontend)
"""

import os, sys, json, argparse
import numpy as np
from PIL import Image
from tqdm import tqdm
from sklearn.decomposition import PCA
from sklearn.svm import LinearSVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.calibration import CalibratedClassifierCV
import warnings
warnings.filterwarnings("ignore")

# ─── Mood Label Mapping ───────────────────────────────────────────────────────

# Both datasets → 4 mood classes
# FER-2013:  0=Angry, 1=Disgust, 2=Fear, 3=Happy, 4=Sad, 5=Surprise, 6=Neutral
FER_TO_MOOD = {
    0: "Energetic",    # Angry → high energy
    1: "Dark / Moody", # Disgust
    2: "Dark / Moody", # Fear
    3: "Positive",     # Happy
    4: "Dark / Moody", # Sad
    5: "Energetic",    # Surprise → energy burst
    6: "Neutral",      # Neutral
}

# Face Emotion/Mood folder names → mood
FOLDER_TO_MOOD = {
    "angry":    "Energetic",
    "disgust":  "Dark / Moody",
    "fear":     "Dark / Moody",
    "happy":    "Positive",
    "sad":      "Dark / Moody",
    "surprise": "Energetic",
    "neutral":  "Neutral",
    # alternate names in some versions
    "happiness":"Positive",
    "sadness":  "Dark / Moody",
    "anger":    "Energetic",
    "contempt": "Dark / Moody",
}

MOODS = ["Positive", "Energetic", "Dark / Moody", "Neutral"]

# ─── Feature Extraction ───────────────────────────────────────────────────────
# MUST match extractFeatures() in moodDetector.js exactly

def rgb_to_hsv(r, g, b):
    r, g, b = r/255, g/255, b/255
    mx = max(r, g, b)
    mn = min(r, g, b)
    d  = mx - mn
    s  = 0 if mx == 0 else d / mx
    v  = mx
    h  = 0.0
    if d != 0:
        if   mx == r: h = ((g - b) / d + (6 if g < b else 0)) / 6
        elif mx == g: h = ((b - r) / d + 2) / 6
        else:         h = ((r - g) / d + 4) / 6
    return h, s, v

def extract_features(img_array):
    """
    12-dimensional perceptual feature vector — mirrors moodDetector.js
    [0] meanV, [1] meanS, [2] stdV, [3] stdS, [4] stdH,
    [5] meanR, [6] meanG, [7] meanB,
    [8] warmRatio, [9] coolRatio, [10] entropy, [11] meanV*meanS
    """
    try:
        arr = img_array.astype(np.float32)
        R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        total = R.size

        # Vectorized HSV conversion
        Rf, Gf, Bf = R/255, G/255, B/255
        mx = np.maximum(np.maximum(Rf, Gf), Bf)
        mn = np.minimum(np.minimum(Rf, Gf), Bf)
        d  = mx - mn

        V = mx
        S = np.where(mx == 0, 0, d / mx)

        H = np.zeros_like(V)
        mask_r = (mx == Rf) & (d > 0)
        mask_g = (mx == Gf) & (d > 0)
        mask_b = (mx == Bf) & (d > 0)
        H[mask_r] = ((Gf[mask_r] - Bf[mask_r]) / d[mask_r]) % 6 / 6
        H[mask_g] = ((Bf[mask_g] - Rf[mask_g]) / d[mask_g] + 2) / 6
        H[mask_b] = ((Rf[mask_b] - Gf[mask_b]) / d[mask_b] + 4) / 6

        meanH = H.mean(); meanS = S.mean(); meanV = V.mean()
        stdH  = H.std();  stdS  = S.std();  stdV  = V.std()
        meanR = Rf.mean(); meanG = Gf.mean(); meanB = Bf.mean()

        # Warm pixels: red/orange hue, saturated
        sat_mask = S > 0.15
        warm = sat_mask & ((H < 0.1) | (H > 0.9) | ((H > 0.05) & (H < 0.18)))
        cool = sat_mask & (H > 0.45) & (H < 0.72)
        warmRatio = warm.sum() / total
        coolRatio = cool.sum() / total

        # Hue entropy (8 bins)
        bins, _ = np.histogram(H.ravel(), bins=8, range=(0, 1))
        p = bins / total
        entropy = float(-np.sum(p[p > 0] * np.log2(p[p > 0])) / 3)

        return [
            float(meanV), float(meanS), float(stdV), float(stdS), float(stdH),
            float(meanR), float(meanG), float(meanB),
            float(warmRatio), float(coolRatio),
            entropy,
            float(meanV * meanS),
        ]
    except Exception as e:
        return None

# ─── Dataset Loaders ─────────────────────────────────────────────────────────

def load_fer2013(csv_path, max_per_class=2000):
    """Load FER-2013 CSV (columns: emotion, pixels, Usage)"""
    import csv
    X, y = [], []
    counts = {m: 0 for m in MOODS}
    print(f"\nLoading FER-2013 from {csv_path}")

    with open(csv_path, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    np.random.shuffle(rows)
    for row in tqdm(rows, desc="FER-2013"):
        label = int(row['emotion'])
        mood  = FER_TO_MOOD.get(label, 'Neutral')
        if counts[mood] >= max_per_class:
            continue
        try:
            pixels = np.array(row['pixels'].split(), dtype=np.uint8).reshape(48, 48)
            # FER is grayscale — convert to RGB for consistent feature extraction
            rgb = np.stack([pixels, pixels, pixels], axis=-1)
            feat = extract_features(rgb)
            if feat:
                X.append(feat); y.append(mood); counts[mood] += 1
        except: pass

    print("FER-2013 loaded:", counts)
    return X, y

def load_image_dataset(root_dir, max_per_class=2000):
    """Load image folders: root/<emotion>/*.jpg"""
    X, y = [], []
    counts = {m: 0 for m in MOODS}
    print(f"\nLoading image dataset from {root_dir}")

    if not os.path.exists(root_dir):
        print(f"  ⚠ Directory not found: {root_dir}")
        return X, y

    folders = [d for d in os.listdir(root_dir)
               if os.path.isdir(os.path.join(root_dir, d))]

    for folder in folders:
        mood = FOLDER_TO_MOOD.get(folder.lower())
        if not mood:
            print(f"  Skipping unknown folder: {folder}")
            continue
        folder_path = os.path.join(root_dir, folder)
        files = [f for f in os.listdir(folder_path)
                 if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))]
        np.random.shuffle(files)

        for fname in tqdm(files[:max_per_class - counts[mood]],
                          desc=f"  {folder} → {mood}", leave=False):
            try:
                img  = Image.open(os.path.join(folder_path, fname)).convert("RGB")
                img  = img.resize((128, 128), Image.LANCZOS)
                feat = extract_features(np.array(img))
                if feat:
                    X.append(feat); y.append(mood); counts[mood] += 1
            except: pass

    print("Image dataset loaded:", counts)
    return X, y

# ─── Training ─────────────────────────────────────────────────────────────────

def train(X, y):
    print(f"\nTraining on {len(X)} samples across {len(set(y))} moods...")

    X  = np.array(X, dtype=np.float32)
    y  = np.array(y)

    X_tr, X_te, y_tr, y_te = train_test_split(
        X, y, test_size=0.2, stratify=y, random_state=42
    )

    # StandardScaler → PCA(3) → LinearSVC
    scaler = StandardScaler()
    X_tr_s = scaler.fit_transform(X_tr)
    X_te_s = scaler.transform(X_te)

    pca = PCA(n_components=3, random_state=42)
    X_tr_p = pca.fit_transform(X_tr_s)
    X_te_p = pca.transform(X_te_s)

    # CalibratedClassifierCV gives probability estimates from LinearSVC
    base_svm = LinearSVC(C=1.0, max_iter=5000, random_state=42, class_weight='balanced')
    svm = CalibratedClassifierCV(base_svm, cv=3)
    svm.fit(X_tr_p, y_tr)

    y_pred = svm.predict(X_te_p)
    acc    = (y_pred == y_te).mean()

    print("\n─── Classification Report ───")
    print(classification_report(y_te, y_pred, target_names=sorted(set(y)), zero_division=0))

    print("─── Confusion Matrix ───")
    labels = sorted(set(y))
    cm     = confusion_matrix(y_te, y_pred, labels=labels)
    print(f"{'':18}" + "".join(f"{l[:8]:>10}" for l in labels))
    for i, lab in enumerate(labels):
        print(f"{lab:18}" + "".join(f"{cm[i,j]:>10}" for j in range(len(labels))))
    print(f"\nAccuracy: {acc*100:.1f}%")

    return scaler, pca, svm, acc, sorted(set(y))

# ─── Export ───────────────────────────────────────────────────────────────────

def export(scaler, pca, svm, acc, classes, n_train, output_path):
    """
    Export weights as JSON that moodDetector.js can import directly.
    Uses CalibratedClassifierCV's base estimator for linear weights.
    """
    # Extract linear weights from calibrated SVM
    base_est = svm.calibrated_classifiers_[0].estimator

    classifiers = {}
    svm_classes  = list(svm.classes_)
    for i, cls in enumerate(svm_classes):
        classifiers[cls] = {
            "w": base_est.coef_[i].tolist(),
            "b": float(base_est.intercept_[i]),
        }

    model = {
        "featureStats": {
            "mean": scaler.mean_.tolist(),
            "std":  scaler.scale_.tolist(),
        },
        "pca": {
            "components": pca.components_.tolist(),
            "explained_variance_ratio": pca.explained_variance_ratio_.tolist(),
        },
        "svm": {
            "classifiers": classifiers,
            "classes": svm_classes,
        },
        "accuracy":   round(acc * 100, 1),
        "trained_on": n_train,
        "classes":    classes,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(model, f, indent=2)

    print(f"\n✅ Weights saved → {output_path}")
    print(f"   Accuracy: {acc*100:.1f}%")
    print(f"   PCA explained variance: {[round(v,3) for v in pca.explained_variance_ratio_.tolist()]}")
    print(f"   Classes: {classes}")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Train Mood Detector (PCA + SVM)")
    parser.add_argument("--fer2013",   default=None,
        help="Path to fer2013.csv (from msambare/fer2013 Kaggle dataset)")
    parser.add_argument("--mood-dir",  default=None,
        help="Path to images/train/ folder (from tusharpaul2001/face-emotion-mood-image-dataset)")
    parser.add_argument("--max-per-class", type=int, default=1500,
        help="Max samples per mood class (default: 1500)")
    parser.add_argument("--output", default=None,
        help="Output JSON path (default: auto-detected based on project location)")
    args = parser.parse_args()

    # ── Auto-detect paths ──
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Try to find datasets automatically
    def find_file(candidates):
        for c in candidates:
            if os.path.exists(c): return c
        return None

    fer_path = args.fer2013 or find_file([
        os.path.join(script_dir, "..", "dataset", "fer2013.csv"),
        os.path.join(script_dir, "fer2013.csv"),
        os.path.join(script_dir, "..", "fer2013.csv"),
        "fer2013.csv",
    ])

    mood_dir = args.mood_dir or find_file([
        os.path.join(script_dir, "..", "dataset", "images", "train"),
        os.path.join(script_dir, "images", "train"),
        os.path.join(script_dir, "..", "images", "train"),
        "images/train",
    ])

    output_path = args.output or os.path.join(
        script_dir, "..", "..", "src", "lib", "moodModelWeights.json"
    )

    print("="*60)
    print("  CaptionAI — Mood Model Training")
    print("  Pipeline: 12 features → PCA(3) → LinearSVM")
    print("="*60)
    print(f"  FER-2013 CSV : {fer_path or '(not found)'}")
    print(f"  Mood dir     : {mood_dir or '(not found)'}")
    print(f"  Max/class    : {args.max_per_class}")
    print(f"  Output       : {output_path}")
    print("="*60)

    X_all, y_all = [], []

    # Load FER-2013
    if fer_path and os.path.exists(fer_path):
        X, y = load_fer2013(fer_path, max_per_class=args.max_per_class)
        X_all.extend(X); y_all.extend(y)
    else:
        print("\n⚠ FER-2013 not found. Place fer2013.csv in backend/dataset/")

    # Load image dataset
    if mood_dir and os.path.exists(mood_dir):
        X, y = load_image_dataset(mood_dir, max_per_class=args.max_per_class)
        X_all.extend(X); y_all.extend(y)
    else:
        print("\n⚠ Mood image dir not found. Place in backend/dataset/images/train/")

    if len(X_all) < 20:
        print("\n❌ Not enough data. Need at least 20 samples total.")
        print("\nDataset folder structure:")
        print("  backend/")
        print("    dataset/")
        print("      fer2013.csv               ← from Kaggle msambare/fer2013")
        print("      images/")
        print("        train/")
        print("          angry/   happy/  sad/  neutral/  surprise/  fear/  disgust/")
        sys.exit(1)

    # Class distribution
    from collections import Counter
    print("\nClass distribution (combined):")
    for mood, count in sorted(Counter(y_all).items()):
        bar = "█" * (count // 50)
        print(f"  {mood:16}: {count:>5}  {bar}")

    # Train
    scaler, pca, svm_model, acc, classes = train(X_all, y_all)

    # Export
    export(scaler, pca, svm_model, acc, classes, len(X_all), output_path)

    print("\nNext step: run `npm run dev` — moodDetector.js will auto-load the new weights.")

if __name__ == "__main__":
    main()