# Viva Simple Answers (Project + Generic)

This file is written in very simple language for viva use.

---

## A) Project-specific answers (HealthMate AI)

### 1) What data preprocessing did we do?

**Simple answer:**
We did standard image preprocessing for all 3 models.

- Resized images to fixed model input sizes.
  - Pneumonia: `224x224`
  - Lung cancer: `224x224`
  - Alzheimer: `176x208`
- Converted images to RGB format.
- Normalized pixel values by dividing by `255` (range `0` to `1`).
- Used data augmentation on training data (rotation, shift, shear, zoom, horizontal flip).
- Used separate validation/test preprocessing with only rescaling.
- Handled class imbalance using `class_weight='balanced'`.

---

### 2) What fine-tuning did we do?

**Simple answer:**
We used transfer learning and trained a custom classification head.

- Pneumonia model used VGG16 backbone.
- Lung cancer model used ResNet50 backbone.
- Alzheimer model used EfficientNetB0 backbone.
- We added dense layers + batch normalization + dropout for classification.
- In training scripts, backbone layers were kept frozen and head layers were trained.

---

### 3) How did we do hyperparameter fine-tuning?

**Simple answer:**
We did practical/manual tuning using validation performance.

- Set initial values (learning rate, batch size, epochs, dropout).
- Trained and checked validation accuracy/loss/AUC.
- Used `EarlyStopping` to stop overfitting.
- Used `ReduceLROnPlateau` to reduce learning rate when validation loss stopped improving.
- Used `ModelCheckpoint` to save best model.
- Final settings were chosen from stable validation performance.

**If examiner asks “Did you use Optuna/KerasTuner?”**
No. We used manual iterative tuning with callback-based control.

---

### 4) How was data integration done?

**Simple answer:**
Data integration was done at 3 levels: model, knowledge, and application.

1. **Model data integration**
   - Medical image datasets were downloaded from Kaggle and organized in train/validation/test structure.
   - Trained models were saved as `.keras` files and loaded in ML service.

2. **Knowledge data integration (RAG)**
   - Text knowledge chunks were stored in ChromaDB.
   - Chat queries were embedded and matched with relevant chunks.
   - Retrieved context was passed to Gemini for grounded responses.

3. **System/API integration**
   - Frontend calls backend (`:8080`) for auth and app logic.
   - Frontend calls ML service (`:5000`) for prediction/chat/recommendation APIs.
   - Recommendation module integrates structured doctor/hospital data from `data.json`.

---

### 5) What features were extracted by the model?

**Simple answer:**
This is an end-to-end deep learning approach, so features are learned automatically.

- We did **not** manually engineer features like edges or texture statistics.
- CNN backbones learned hierarchical image features from data:
    - early layers: edges, contrast, texture
    - deeper layers: disease-relevant patterns
- Medical examples:
    - Pneumonia: opacity/infiltration-like lung patterns
    - Lung cancer: nodule/mass-related CT patterns
    - Alzheimer: brain structure/atrophy-related MRI patterns

**Best viva line to say:**
“We used end-to-end deep learning, so feature extraction is automatic. We can describe feature *types* learned by CNN layers, but not hand-crafted exact feature formulas.”

---

## B) Very short viva one-liners

- **Why preprocessing?** To make all inputs consistent and improve model generalization.
- **Why transfer learning?** Medical datasets are limited; pretrained models learn faster and better.
- **What features did we extract?** Features were automatically learned by CNN layers, not manually hand-crafted.
- **Why dropout and batch norm?** To reduce overfitting and stabilize training.
- **Why class weights?** To reduce bias from imbalanced classes.
- **Why early stopping?** To avoid unnecessary epochs and overfitting.
- **Why model checkpoint?** To keep the best-performing model.

---

## C) Generic viva questions with simple generic answers

### ML / AI Basics

1. **What is machine learning?**
   - Machine learning is teaching computers to learn patterns from data without explicit rule-based programming.

2. **What is deep learning?**
   - Deep learning is a part of ML that uses neural networks with many layers.

3. **What is overfitting?**
   - Overfitting means model learns training data too specifically and performs poorly on new data.

4. **What is underfitting?**
   - Underfitting means model is too simple and cannot learn important patterns.

5. **Difference between training and testing data?**
   - Training data is used to learn; testing data is used to evaluate final performance on unseen samples.

6. **Why do we need validation data?**
   - Validation data helps tune model settings during training.

7. **What is data augmentation?**
   - It creates varied training samples by applying safe transformations like rotation and zoom.

8. **What is normalization?**
   - Normalization scales values to a common range, usually `0` to `1`.

9. **What is transfer learning?**
   - Reusing a pretrained model and adapting it to a new task.

10. **What is fine-tuning?**
    - Fine-tuning is adjusting pretrained model setup or layers for better task-specific performance.

### Metrics

11. **What is accuracy?**
    - Accuracy is the fraction of correct predictions among total predictions.

12. **What is precision?**
    - Precision is how many predicted positives are actually positive.

13. **What is recall?**
    - Recall is how many actual positives the model correctly finds.

14. **What is F1-score?**
    - F1-score is the balance between precision and recall.

15. **What is AUC-ROC?**
    - It measures how well model separates classes across thresholds.

16. **Why confusion matrix is useful?**
    - It shows exact true/false positive/negative counts and error types.

### Deployment / System

17. **Why use API-based architecture?**
    - It separates frontend, backend, and ML service for easier scaling and maintenance.

18. **Why use vector DB in chatbot?**
    - To retrieve relevant context chunks quickly for grounded answers.

19. **What is RAG?**
    - RAG means retrieve relevant knowledge first, then generate response using that context.

20. **Why not use only LLM without retrieval?**
    - Without retrieval, answers can be generic or hallucinated; retrieval improves factual grounding.

21. **How do you handle missing model files?**
    - Use graceful fallback (for example mock prediction in development) and proper error response.

22. **How do you improve reliability in production?**
    - Validation, logging, fallback logic, health checks, and model/version control.

### Project defense style questions

23. **How did you choose your model backbones?**
    - Chose established pretrained CNNs known for strong image feature extraction.

24. **Biggest limitation of your current system?**
    - Dataset size/domain limitations and dependence on data quality.

25. **What will you improve next?**
    - More curated medical data, stronger validation, calibration, and clinically guided evaluation.

26. **Is this a final diagnosis tool?**
    - No. It is a decision-support/educational tool; final diagnosis must be by clinicians.

---

## D) 30-second closing answer for viva

Our project combines medical image models, a RAG chatbot, and recommendation APIs in one system. We used standard preprocessing, transfer learning, regularization, and callback-based manual hyperparameter tuning. We integrated structured and unstructured data through APIs and vector retrieval to give practical, explainable outputs. The system is designed as clinical decision support, not a replacement for doctors.
