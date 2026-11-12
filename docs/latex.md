# Model Architecture Diagrams (Overleaf)

This file contains simple LaTeX (TikZ) code blocks for your three models:
- Pneumonia: **Custom CNN**
- Lung Cancer: **ResNet50 (transfer learning)**
- Alzheimer: **EfficientNetB0 (transfer learning)**

Use these in Overleaf.

---

## 1) Overleaf setup (preamble)

In your main `.tex` file, add:

```latex
\usepackage{tikz}
\usetikzlibrary{positioning,arrows.meta}
```

You can paste each figure where you want it in your report.

---

## 2) Pneumonia model: Custom CNN (binary classification)

```latex
\begin{figure}[h!]
\centering
\begin{tikzpicture}[
  node distance=0.7cm,
  every node/.style={font=\small},
  block/.style={draw, rounded corners, align=center, minimum width=4.6cm, minimum height=0.9cm},
  arrow/.style={-{Latex[length=2.5mm]}, thick}
]

\node[block] (in) {Input Chest X-ray \\ $224\times224\times3$};
\node[block, below=of in] (c1) {Conv2D + ReLU \\ MaxPool};
\node[block, below=of c1] (c2) {Conv2D + ReLU \\ MaxPool};
\node[block, below=of c2] (c3) {Conv2D + ReLU \\ MaxPool};
\node[block, below=of c3] (flat) {Flatten};
\node[block, below=of flat] (fc1) {Dense + ReLU \\ Dropout};
\node[block, below=of fc1] (out) {Dense(1) + Sigmoid \\ Output: Normal / Pneumonia};

\draw[arrow] (in) -- (c1);
\draw[arrow] (c1) -- (c2);
\draw[arrow] (c2) -- (c3);
\draw[arrow] (c3) -- (flat);
\draw[arrow] (flat) -- (fc1);
\draw[arrow] (fc1) -- (out);

\end{tikzpicture}
\caption{Custom CNN architecture for Pneumonia detection.}
\label{fig:pneumonia_cnn}
\end{figure}
```

---

## 3) Lung cancer model: ResNet50 (transfer learning)

```latex
\begin{figure}[h!]
\centering
\begin{tikzpicture}[
  node distance=0.8cm,
  every node/.style={font=\small},
  block/.style={draw, rounded corners, align=center, minimum width=5.2cm, minimum height=0.95cm},
  arrow/.style={-{Latex[length=2.5mm]}, thick}
]

\node[block] (in) {Input CT Image \\ $224\times224\times3$};
\node[block, below=of in] (base) {ResNet50 Backbone \\ (ImageNet pretrained, include\_top=False)};
\node[block, below=of base] (gap) {GlobalAveragePooling2D};
\node[block, below=of gap] (head) {Dense Layers + BatchNorm + Dropout};
\node[block, below=of head] (out) {Dense(3) + Softmax \\ Output: Benign / Malignant / Normal};

\draw[arrow] (in) -- (base);
\draw[arrow] (base) -- (gap);
\draw[arrow] (gap) -- (head);
\draw[arrow] (head) -- (out);

\end{tikzpicture}
\caption{ResNet50-based transfer learning architecture for Lung Cancer classification.}
\label{fig:lung_resnet50}
\end{figure}
```

---

## 4) Alzheimer model: EfficientNetB0 (transfer learning)

```latex
\begin{figure}[h!]
\centering
\begin{tikzpicture}[
  node distance=0.8cm,
  every node/.style={font=\small},
  block/.style={draw, rounded corners, align=center, minimum width=5.2cm, minimum height=0.95cm},
  arrow/.style={-{Latex[length=2.5mm]}, thick}
]

\node[block] (in) {Input MRI Image \\ $176\times208\times3$};
\node[block, below=of in] (base) {EfficientNetB0 Backbone \\ (ImageNet pretrained, include\_top=False)};
\node[block, below=of base] (gap) {GlobalAveragePooling2D};
\node[block, below=of gap] (head) {Dense Layers + BatchNorm + Dropout};
\node[block, below=of head] (out) {Dense(4) + Softmax \\ Output: 4 Alzheimer stages};

\draw[arrow] (in) -- (base);
\draw[arrow] (base) -- (gap);
\draw[arrow] (gap) -- (head);
\draw[arrow] (head) -- (out);

\end{tikzpicture}
\caption{EfficientNetB0-based transfer learning architecture for Alzheimer stage classification.}
\label{fig:alz_effnetb0}
\end{figure}
```

---

## 5) Optional one-line explanation for report

You can write:

> We used a lightweight custom CNN for binary pneumonia detection, and transfer learning with ResNet50 and EfficientNetB0 for more complex multi-class lung cancer and Alzheimer classification tasks, respectively.
