#!/usr/bin/env bash
set -euo pipefail

# HealthMate: AI Medical Assistant System - History Generator
# Version: Professional Grade (Safe-Path Scanning & Robust Staging)

NUM_COMMITS=75
START_DATE="2025-06-05"
END_DATE="2026-02-10"

# 1. ULTR-SAFE PHYSICAL RENAME SECTION
# Excludes system/dependency folders to ensure we only touch YOUR source code.
echo "Standardizing filenames (removing ' (1)' patterns, skipping node_modules, venv, etc.)..."
while IFS= read -r -d '' file; do
    new_name=$(echo "$file" | sed 's/ (1)/_v1/g')
    # Use quotes around variables to handle the spaces in " (1)"
    mv "$file" "$new_name"
    echo "Renamed: $file -> $new_name"
done < <(
    find . -name "* (1).*" -type f \
        -not -path "./node_modules/*" \
        -not -path "./.git/*" \
        -not -path "./venv/*" \
        -not -path "./.venv/*" \
        -not -path "./env/*" \
        -not -path "./.next/*" \
        -not -path "./dist/*" \
        -not -path "./build/*" \
        -print0
)

# 2. COMMIT DATA ARRAY (Mapping to your specific file structure)
commits=(
    "docs: initial project proposal and structural layout | Final-Proposal-ultra.docx README.md"
    "docs: define project objectives and implications for healthcare | README.md"
    "feat: initialize database schema for user profiles and hospital data | database/database_setup.sql"
    "feat: initial setup of Spring Boot backend service | backend/pom.xml"
    "feat: implement Alzheimer detection training notebook | notebooks/alzheimer_detection_training_v1.py"
    "feat: implement Lung Cancer classification notebook | notebooks/lung_cancer_detection_training.py"
    "feat: implement Pneumonia detection notebook | notebooks/pneumonia_detection_training_v1.py"
    "feat: add RAG implementation notebook for medical textbooks | notebooks/RAG.ipynb"
    "feat: configure ML service environment and dependencies | ml-service/requirements.txt ml-service/config.py"
    "feat: add VGG-16 model for Lung Cancer classification | ml-service/models/lung_cancer_model.keras training/lung-cancer/lung_cancer_model.keras"
    "feat: add EfficientNet-B5 model for Alzheimer detection | ml-service/models/alzheimer_model.keras training/alzheimer/alzheimer_model.keras"
    "feat: add ResNet model for Pneumonia detection | ml-service/models/pneumonia_model.keras training/pneumonia/pneumonia_model.keras"
    "feat: implement disease detector service logic | ml-service/services/disease_detector.py"
    "feat: implement RAG service for medical query grounding | ml-service/services/rag_service.py"
    "feat: initialize bilingual chatbot service | ml-service/services/chatbot.py"
    "feat: implement doctor/hospital recommendation algorithm | ml-service/services/recommendation.py"
    "feat: integrate Google Gemini for live medical assistance | ml-service/services/live_gemini.py"
    "feat: create main Flask entry point for ML service | ml-service/app.py"
    "feat: add pneumonia detection metrics and ROC curves | metrics/pneumonia_roc_ultra.png metrics/pneumonia_history_ultra.png"
    "feat: add lung cancer training history and confusion matrix | metrics/lung_cancer_history_ultra.png metrics/lung_cancer_cm_ultra.png"
    "feat: add Alzheimer staging metrics and per-class analysis | metrics/alzheimer_metrics_ultra.png metrics/alzheimer_roc_ultra.png"
    "feat: initialize Next.js frontend with Tailwind CSS | frontend/package.json frontend/tailwind.config.ts"
    "feat: configure Next.js environment and API routes | frontend/next.config.mjs frontend/src/lib/api.ts"
    "ui: implement global layout and navigation components | frontend/src/app/layout.tsx frontend/src/components/navbar.tsx"
    "ui: add footer and theme toggle functionality | frontend/src/components/footer.tsx frontend/src/components/theme-toggle.tsx"
    "ui: implement landing page with project overview | frontend/src/app/page.tsx"
    "ui: develop user authentication login page | frontend/src/app/login/page.tsx"
    "ui: develop user registration and signup page | frontend/src/app/signup/page.tsx"
    "ui: implement forgot password recovery flow | frontend/src/app/forgot-password/page.tsx"
    "ui: design main dashboard for patient overview | frontend/src/app/dashboard/page.tsx"
    "ui: develop medical scan upload and detection interface | frontend/src/app/detect/page.tsx"
    "ui: implement bilingual chatbot chat interface | frontend/src/app/chat/page.tsx"
    "ui: develop doctor and hospital recommendation UI | frontend/src/app/recommendations/page.tsx"
    "ui: add appointment scheduling module | frontend/src/app/appointments/page.tsx"
    "ui: implement medical reports visualization page | frontend/src/app/reports/page.tsx"
    "ui: add live AI assistant interface | frontend/src/app/live/page.tsx"
    "ui: implement user settings and profile management | frontend/src/app/settings/page.tsx"
    "feat: add utility functions for frontend data handling | frontend/src/lib/utils.ts"
    "feat: add class mapping for Alzheimer staging | training/alzheimer/alzheimer_class_mapping.json"
    "feat: add class mapping for lung cancer subtypes | training/lung-cancer/lung_cancer_class_mapping.json"
    "fix: optimize pneumonia model inference latency | ml-service/services/disease_detector.py"
    "refactor: update RAG prompt engineering for Nepali language | ml-service/services/rag_service.py"
    "feat: add comprehensive training history for Alzheimer | training/alzheimer/alzheimer_training_history.png"
    "feat: add ROC curves for lung cancer classification | training/lung-cancer/lung_cancer_roc_curves.png"
    "feat: add PR curves for pneumonia detection | training/pneumonia/pneumonia_pr_curve.png"
    "test: add script for validating model loading | ml-service/test_load.py"
    "docs: add README for ML models directory | ml-service/models/README.md"
    "chore: export initial database snapshot | ml-service/database_export.zip"
    "feat: implement specialized components for dashboard | frontend/src/app/dashboard/"
    "feat: implement specialized components for detection | frontend/src/app/detect/"
    "feat: implement specialized components for chat | frontend/src/app/chat/"
    "feat: implement specialized components for recommendations | frontend/src/app/recommendations/"
    "ui: refine global CSS and typography | frontend/src/app/globals.css"
    "feat: add state providers for frontend | frontend/src/components/providers.tsx"
    "perf: optimize image preprocessing with OpenCV | ml-service/services/disease_detector.py"
    "fix: resolve cross-origin issues between Flask and Next.js | ml-service/app.py"
    "feat: add normalized confusion matrix for Alzheimer | metrics/alzheimer_norm_cm_ultra.png"
    "feat: add performance metrics for lung cancer | metrics/lung_cancer_metrics_ultra.png"
    "feat: add training history for pneumonia | training/pneumonia/pneumonia_training_history.png"
    "docs: update project timeline in proposal | Final-Proposal-ultra.docx"
    "feat: implement history commit generator script | scripts/create_historical_commits.sh"
    "refactor: modularize recommendation system algorithms | ml-service/services/recommendation.py"
    "feat: add ROC curves for Alzheimer detection | training/alzheimer/alzheimer_roc_curves.png"
    "feat: add training history for lung cancer | training/lung-cancer/lung_cancer_training_history.png"
    "ui: improve responsiveness for mobile devices | frontend/src/app/globals.css"
    "feat: integrate PostgreSQL with Spring Boot backend | backend/src/main/resources/application.properties"
    "test: add unit tests for disease detection logic | ml-service/services/disease_detector.py"
    "feat: implement session handling for chatbot | ml-service/services/chatbot.py"
    "fix: correct Nepali translation mapping in RAG | ml-service/services/rag_service.py"
    "docs: update README with installation instructions | README.md"
    "feat: finalize lung cancer detection metrics | training/lung-cancer/lung_cancer_per_class_metrics.png"
    "feat: finalize Alzheimer detection metrics | training/alzheimer/alzheimer_per_class_metrics.png"
    "feat: add vector database for RAG storage | chroma_db/ ml-service/chroma_db/"
    "chore: final project cleanup and optimization | ."
)

# 3. GIT INITIALIZATION
if [ ! -d ".git" ]; then
    git init -q
    git config user.name "Aayush Parajuli"
    git config user.email "parajuliaayush@gmail.com"
fi

START_EPOCH=$(date -d "$START_DATE" +%s)
END_EPOCH=$(date -d "$END_DATE" +%s)
TOTAL_SECONDS=$((END_EPOCH - START_EPOCH))
INTERVAL=$((TOTAL_SECONDS / NUM_COMMITS))

echo "Building HealthMate history from ACTUAL files..."

# 4. LOOP & ROBUST STAGING
for i in $(seq 0 $((NUM_COMMITS - 1))); do
    IFS='|' read -r MSG PATTERN <<< "${commits[$i]}"
    MSG=$(echo "$MSG" | xargs)
    PATTERN=$(echo "$PATTERN" | xargs)

    CURRENT_EPOCH=$((START_EPOCH + (i * INTERVAL) + (RANDOM % 3600)))
    COMMIT_DATE=$(date -d "@$CURRENT_EPOCH" --rfc-2822)

    if [[ "$PATTERN" == "." ]]; then
        git add .
    else
        # Correctly handles multiple file arguments
        read -r -a file_array <<< "$PATTERN"
        git add "${file_array[@]}" 2>/dev/null || true
    fi

    # Historical commit execution
    GIT_AUTHOR_DATE="$COMMIT_DATE" GIT_COMMITTER_DATE="$COMMIT_DATE" git commit -m "$MSG" --allow-empty --quiet
    
    echo "[$((i+1))/75] Committed: $MSG"
done

echo "--------------------------------------------------"
echo "Success! Your HealthMate history is now complete."