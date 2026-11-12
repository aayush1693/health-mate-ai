"""
Generate realistic training/evaluation graphs for 3 medical imaging models.
Designed for Google Colab: saves all charts + reports and auto-downloads a ZIP.

Models covered:
- Pneumonia (binary)
- Lung Cancer (3-class)
- Alzheimer (4-class)

The script creates mathematically consistent metrics from synthetic predictions,
with final test accuracy constrained to ~89-91% and low train/val gap.
"""

from __future__ import annotations

import json
import os
import zipfile
from dataclasses import dataclass
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    auc,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_curve,
)
from sklearn.preprocessing import label_binarize

sns.set_theme(style="whitegrid")
plt.rcParams["figure.dpi"] = 120
plt.rcParams["savefig.dpi"] = 300


@dataclass
class ModelSpec:
    key: str
    display_name: str
    classes: List[str]
    n_samples: int
    class_probs: List[float]
    epochs: int


MODEL_SPECS: List[ModelSpec] = [
    ModelSpec(
        key="pneumonia",
        display_name="Pneumonia Detection",
        classes=["Normal", "Pneumonia"],
        n_samples=1200,
        class_probs=[0.54, 0.46],
        epochs=24,
    ),
    ModelSpec(
        key="lung_cancer",
        display_name="Lung Cancer Detection",
        classes=["Benign", "Malignant", "Normal"],
        n_samples=1500,
        class_probs=[0.33, 0.31, 0.36],
        epochs=26,
    ),
    ModelSpec(
        key="alzheimer",
        display_name="Alzheimer Detection",
        classes=["Mild Demented", "Moderate Demented", "Non Demented", "Very Mild Demented"],
        n_samples=1800,
        class_probs=[0.22, 0.16, 0.36, 0.26],
        epochs=28,
    ),
]


def is_colab() -> bool:
    try:
        import google.colab  # type: ignore  # noqa: F401

        return True
    except Exception:
        return False


def safe_mkdir(path: str) -> None:
    os.makedirs(path, exist_ok=True)


def sample_labels(n_samples: int, class_probs: List[float], rng: np.random.Generator) -> np.ndarray:
    probs = np.array(class_probs, dtype=float)
    probs = probs / probs.sum()
    return rng.choice(len(probs), size=n_samples, p=probs)


def build_confusion_template(num_classes: int, diag_prob: float, rng: np.random.Generator) -> np.ndarray:
    matrix = np.zeros((num_classes, num_classes), dtype=float)
    for i in range(num_classes):
        matrix[i, i] = diag_prob
        remainder = 1.0 - diag_prob
        noise = rng.uniform(0.05, 1.0, size=num_classes)
        noise[i] = 0.0
        noise = noise / noise.sum()
        matrix[i] += remainder * noise
    return matrix


def sample_predictions_from_template(
    y_true: np.ndarray,
    confusion_template: np.ndarray,
    rng: np.random.Generator,
) -> np.ndarray:
    y_pred = np.zeros_like(y_true)
    for idx, true_cls in enumerate(y_true):
        y_pred[idx] = rng.choice(confusion_template.shape[1], p=confusion_template[true_cls])
    return y_pred


def make_probability_vectors(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    num_classes: int,
    rng: np.random.Generator,
) -> np.ndarray:
    probs = np.zeros((len(y_true), num_classes), dtype=float)

    for i, (t, p) in enumerate(zip(y_true, y_pred)):
        row = np.zeros(num_classes, dtype=float)

        if p == t:
            pred_conf = rng.uniform(0.62, 0.94)
            row[p] = pred_conf
            leftover = 1.0 - pred_conf
            if num_classes > 1:
                alloc = rng.dirichlet(np.ones(num_classes - 1)) * leftover
                ptr = 0
                for c in range(num_classes):
                    if c == p:
                        continue
                    row[c] = alloc[ptr]
                    ptr += 1
        else:
            wrong_conf = rng.uniform(0.48, 0.79)
            true_prob = rng.uniform(0.06, min(0.34, wrong_conf - 0.03))
            row[p] = wrong_conf
            row[t] = true_prob
            leftover = 1.0 - wrong_conf - true_prob

            if num_classes > 2:
                remaining_classes = [c for c in range(num_classes) if c not in (p, t)]
                alloc = rng.dirichlet(np.ones(len(remaining_classes))) * max(leftover, 0.0)
                for cls_idx, cls in enumerate(remaining_classes):
                    row[cls] = alloc[cls_idx]

        row = np.clip(row, 1e-7, 1.0)
        row = row / row.sum()
        probs[i] = row

    return probs


def fit_predictions_in_target_band(
    y_true: np.ndarray,
    num_classes: int,
    rng: np.random.Generator,
    low: float = 0.89,
    high: float = 0.91,
) -> Tuple[np.ndarray, np.ndarray, float, float]:
    best = None

    for _ in range(500):
        diag_prob = rng.uniform(0.892, 0.908)
        template = build_confusion_template(num_classes, diag_prob, rng)
        y_pred = sample_predictions_from_template(y_true, template, rng)
        acc = accuracy_score(y_true, y_pred)

        if low <= acc <= high:
            probs = make_probability_vectors(y_true, y_pred, num_classes, rng)
            y_hat = np.argmax(probs, axis=1)
            acc_from_probs = accuracy_score(y_true, y_hat)
            if low <= acc_from_probs <= high:
                return y_hat, probs, acc_from_probs, diag_prob

        delta = abs(acc - 0.9)
        if best is None or delta < best[0]:
            best = (delta, y_pred, diag_prob)

    _, best_pred, best_diag = best
    probs = make_probability_vectors(y_true, best_pred, num_classes, rng)
    y_hat = np.argmax(probs, axis=1)
    return y_hat, probs, accuracy_score(y_true, y_hat), best_diag


def simulate_history(epochs: int, final_val_acc: float, rng: np.random.Generator) -> Dict[str, np.ndarray]:
    x = np.linspace(0, 1, epochs)

    final_train_acc = min(final_val_acc + rng.uniform(0.006, 0.014), 0.935)
    train_acc_base = 0.58 + (final_train_acc - 0.58) * (1 - np.exp(-4.2 * x)) / (1 - np.exp(-4.2))
    val_acc_base = 0.56 + (final_val_acc - 0.56) * (1 - np.exp(-3.7 * x)) / (1 - np.exp(-3.7))

    train_acc = np.clip(train_acc_base + rng.normal(0, 0.003, size=epochs), 0.5, 0.97)
    val_acc = np.clip(val_acc_base + rng.normal(0, 0.004, size=epochs), 0.5, 0.97)

    train_acc = np.maximum.accumulate(train_acc)
    val_acc = np.maximum.accumulate(val_acc)

    train_acc[-1] = final_train_acc
    val_acc[-1] = final_val_acc

    train_loss_base = 1.35 * np.exp(-3.8 * x) + 0.22
    val_loss_base = 1.45 * np.exp(-3.4 * x) + 0.27

    train_loss = np.clip(train_loss_base + rng.normal(0, 0.01, size=epochs), 0.15, 2.0)
    val_loss = np.clip(val_loss_base + rng.normal(0, 0.013, size=epochs), 0.18, 2.2)

    train_loss = np.minimum.accumulate(train_loss)
    val_loss = np.minimum.accumulate(val_loss)

    train_auc = np.clip(train_acc + 0.07 + rng.normal(0, 0.003, size=epochs), 0.60, 0.995)
    val_auc = np.clip(val_acc + 0.07 + rng.normal(0, 0.004, size=epochs), 0.58, 0.995)

    train_auc = np.maximum.accumulate(train_auc)
    val_auc = np.maximum.accumulate(val_auc)

    return {
        "train_loss": train_loss,
        "val_loss": val_loss,
        "train_acc": train_acc,
        "val_acc": val_acc,
        "train_auc": train_auc,
        "val_auc": val_auc,
    }


def plot_training_curves(history: Dict[str, np.ndarray], model_name: str, save_path: str) -> None:
    epochs = np.arange(1, len(history["train_loss"]) + 1)

    fig, axes = plt.subplots(1, 3, figsize=(16, 4.5))

    axes[0].plot(epochs, history["train_loss"], label="Train", linewidth=2)
    axes[0].plot(epochs, history["val_loss"], label="Validation", linewidth=2)
    axes[0].set_title("Loss")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Loss")
    axes[0].legend()

    axes[1].plot(epochs, history["train_acc"], label="Train", linewidth=2)
    axes[1].plot(epochs, history["val_acc"], label="Validation", linewidth=2)
    axes[1].set_title("Accuracy")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Accuracy")
    axes[1].set_ylim(0.5, 1.0)
    axes[1].legend()

    axes[2].plot(epochs, history["train_auc"], label="Train", linewidth=2)
    axes[2].plot(epochs, history["val_auc"], label="Validation", linewidth=2)
    axes[2].set_title("AUC")
    axes[2].set_xlabel("Epoch")
    axes[2].set_ylabel("AUC")
    axes[2].set_ylim(0.5, 1.0)
    axes[2].legend()

    fig.suptitle(f"{model_name} - Training Curves", fontsize=14, fontweight="bold")
    fig.tight_layout()
    fig.savefig(save_path, bbox_inches="tight")
    plt.close(fig)


def plot_confusion_matrices(y_true: np.ndarray, y_pred: np.ndarray, classes: List[str], out_dir: str) -> np.ndarray:
    cm = confusion_matrix(y_true, y_pred)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)

    fig1, ax1 = plt.subplots(figsize=(7, 5.8))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=classes, yticklabels=classes, ax=ax1)
    ax1.set_xlabel("Predicted")
    ax1.set_ylabel("True")
    ax1.set_title("Confusion Matrix (Counts)")
    fig1.tight_layout()
    fig1.savefig(os.path.join(out_dir, "confusion_matrix_counts.png"), bbox_inches="tight")
    plt.close(fig1)

    fig2, ax2 = plt.subplots(figsize=(7, 5.8))
    sns.heatmap(cm_norm, annot=True, fmt=".3f", cmap="Greens", xticklabels=classes, yticklabels=classes, ax=ax2)
    ax2.set_xlabel("Predicted")
    ax2.set_ylabel("True")
    ax2.set_title("Confusion Matrix (Row-Normalized)")
    fig2.tight_layout()
    fig2.savefig(os.path.join(out_dir, "confusion_matrix_normalized.png"), bbox_inches="tight")
    plt.close(fig2)

    return cm


def plot_roc_curves(y_true: np.ndarray, y_prob: np.ndarray, classes: List[str], out_dir: str) -> Dict[str, float]:
    num_classes = len(classes)
    roc_aucs: Dict[str, float] = {}

    fig, ax = plt.subplots(figsize=(7.5, 6))

    if num_classes == 2:
        fpr, tpr, _ = roc_curve(y_true, y_prob[:, 1])
        roc_auc = auc(fpr, tpr)
        roc_aucs[classes[1]] = float(roc_auc)

        ax.plot(fpr, tpr, linewidth=2.2, label=f"{classes[1]} (AUC = {roc_auc:.4f})")
    else:
        y_true_bin = label_binarize(y_true, classes=list(range(num_classes)))
        for idx, cls_name in enumerate(classes):
            fpr, tpr, _ = roc_curve(y_true_bin[:, idx], y_prob[:, idx])
            roc_auc = auc(fpr, tpr)
            roc_aucs[cls_name] = float(roc_auc)
            ax.plot(fpr, tpr, linewidth=2.0, label=f"{cls_name} (AUC = {roc_auc:.4f})")

    ax.plot([0, 1], [0, 1], linestyle="--", linewidth=1.5, color="gray")
    ax.set_title("ROC Curve(s)")
    ax.set_xlabel("False Positive Rate")
    ax.set_ylabel("True Positive Rate")
    ax.legend(loc="lower right", fontsize=9)

    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, "roc_curves.png"), bbox_inches="tight")
    plt.close(fig)

    return roc_aucs


def plot_precision_recall_curves(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    classes: List[str],
    out_dir: str,
) -> Dict[str, float]:
    num_classes = len(classes)
    pr_aucs: Dict[str, float] = {}

    fig, ax = plt.subplots(figsize=(7.5, 6))

    if num_classes == 2:
        prec, rec, _ = precision_recall_curve(y_true, y_prob[:, 1])
        pr_auc = auc(rec, prec)
        pr_aucs[classes[1]] = float(pr_auc)
        ax.plot(rec, prec, linewidth=2.2, label=f"{classes[1]} (AUC = {pr_auc:.4f})")
    else:
        y_true_bin = label_binarize(y_true, classes=list(range(num_classes)))
        for idx, cls_name in enumerate(classes):
            prec, rec, _ = precision_recall_curve(y_true_bin[:, idx], y_prob[:, idx])
            pr_auc = auc(rec, prec)
            pr_aucs[cls_name] = float(pr_auc)
            ax.plot(rec, prec, linewidth=2.0, label=f"{cls_name} (AUC = {pr_auc:.4f})")

    ax.set_title("Precision-Recall Curve(s)")
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.legend(loc="lower left", fontsize=9)

    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, "precision_recall_curves.png"), bbox_inches="tight")
    plt.close(fig)

    return pr_aucs


def plot_per_class_metrics(y_true: np.ndarray, y_pred: np.ndarray, classes: List[str], out_dir: str) -> pd.DataFrame:
    precision = precision_score(y_true, y_pred, average=None, zero_division=0)
    recall = recall_score(y_true, y_pred, average=None, zero_division=0)
    f1 = f1_score(y_true, y_pred, average=None, zero_division=0)
    support = np.bincount(y_true, minlength=len(classes))

    df = pd.DataFrame(
        {
            "class": classes,
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "support": support,
        }
    )

    x = np.arange(len(classes))
    width = 0.25

    fig, ax = plt.subplots(figsize=(10, 5.6))
    ax.bar(x - width, precision, width, label="Precision")
    ax.bar(x, recall, width, label="Recall")
    ax.bar(x + width, f1, width, label="F1-score")

    ax.set_xticks(x)
    ax.set_xticklabels(classes, rotation=15, ha="right")
    ax.set_ylim(0, 1.05)
    ax.set_ylabel("Score")
    ax.set_title("Per-Class Precision, Recall, F1")
    ax.legend()

    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, "per_class_metrics.png"), bbox_inches="tight")
    plt.close(fig)

    fig2, ax2 = plt.subplots(figsize=(8, 4.8))
    bars = ax2.bar(classes, support, color="#4c78a8")
    ax2.set_title("Test Support by Class")
    ax2.set_ylabel("Samples")
    ax2.tick_params(axis="x", rotation=15)
    for bar in bars:
        height = bar.get_height()
        ax2.text(bar.get_x() + bar.get_width() / 2, height + 2, str(int(height)), ha="center", va="bottom", fontsize=9)

    fig2.tight_layout()
    fig2.savefig(os.path.join(out_dir, "class_support.png"), bbox_inches="tight")
    plt.close(fig2)

    return df


def build_summary_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    roc_aucs: Dict[str, float],
    pr_aucs: Dict[str, float],
) -> Dict[str, float]:
    summary = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
        "precision_weighted": float(precision_score(y_true, y_pred, average="weighted", zero_division=0)),
        "recall_weighted": float(recall_score(y_true, y_pred, average="weighted", zero_division=0)),
        "f1_weighted": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "roc_auc_mean": float(np.mean(list(roc_aucs.values()))) if roc_aucs else float("nan"),
        "pr_auc_mean": float(np.mean(list(pr_aucs.values()))) if pr_aucs else float("nan"),
    }
    return summary


def run_one_model(spec: ModelSpec, base_output_dir: str, seed: int) -> Dict[str, float]:
    rng = np.random.default_rng(seed)
    model_dir = os.path.join(base_output_dir, spec.key)
    safe_mkdir(model_dir)

    y_true = sample_labels(spec.n_samples, spec.class_probs, rng)
    y_pred, y_prob, acc, diag_prob = fit_predictions_in_target_band(
        y_true=y_true,
        num_classes=len(spec.classes),
        rng=rng,
        low=0.89,
        high=0.91,
    )

    if len(spec.classes) == 2:
        # Ensure probabilities align with binary semantics [class0, class1]
        if y_prob.shape[1] != 2:
            y_prob = np.column_stack([1 - y_prob[:, 0], y_prob[:, 0]])

    history = simulate_history(spec.epochs, final_val_acc=acc, rng=rng)

    plot_training_curves(history, spec.display_name, os.path.join(model_dir, "training_curves.png"))
    plot_confusion_matrices(y_true, y_pred, spec.classes, model_dir)
    roc_aucs = plot_roc_curves(y_true, y_prob, spec.classes, model_dir)
    pr_aucs = plot_precision_recall_curves(y_true, y_prob, spec.classes, model_dir)
    per_class_df = plot_per_class_metrics(y_true, y_pred, spec.classes, model_dir)

    report_text = classification_report(y_true, y_pred, target_names=spec.classes, digits=4, zero_division=0)
    with open(os.path.join(model_dir, "classification_report.txt"), "w", encoding="utf-8") as f:
        f.write(report_text)

    per_class_df.to_csv(os.path.join(model_dir, "per_class_metrics.csv"), index=False)

    summary = build_summary_metrics(y_true, y_pred, roc_aucs, pr_aucs)
    summary["model"] = spec.key
    summary["display_name"] = spec.display_name
    summary["n_samples"] = int(spec.n_samples)
    summary["target_diag_prob_used"] = float(diag_prob)

    with open(os.path.join(model_dir, "summary_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary


def zip_folder(folder_path: str, zip_path: str) -> None:
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, _, files in os.walk(folder_path):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, folder_path)
                zf.write(full_path, arcname=rel_path)


def main() -> None:
    output_root = os.path.abspath("model_graph_outputs")
    safe_mkdir(output_root)

    all_summaries = []
    seeds = {
        "pneumonia": 71,
        "lung_cancer": 113,
        "alzheimer": 257,
    }

    for spec in MODEL_SPECS:
        summary = run_one_model(spec, output_root, seed=seeds[spec.key])
        all_summaries.append(summary)

    summary_df = pd.DataFrame(all_summaries)
    summary_csv = os.path.join(output_root, "all_models_summary.csv")
    summary_json = os.path.join(output_root, "all_models_summary.json")
    summary_df.to_csv(summary_csv, index=False)
    summary_df.to_json(summary_json, orient="records", indent=2)

    zip_path = os.path.abspath("healthmate_model_graphs.zip")
    zip_folder(output_root, zip_path)

    print("\nGenerated outputs at:", output_root)
    print("ZIP package:", zip_path)
    print("\nAccuracy check (should be ~0.89-0.91):")
    print(summary_df[["model", "accuracy", "f1_weighted", "roc_auc_mean"]].to_string(index=False))

    if is_colab():
        try:
            from google.colab import files  # type: ignore

            files.download(zip_path)
            files.download(summary_csv)
        except Exception as e:
            print(f"Colab auto-download failed: {e}")


if __name__ == "__main__":
    main()
