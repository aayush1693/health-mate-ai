# 🏥 HealthMate AI - Medical Assistant System

A comprehensive AI-powered medical assistant system featuring disease detection, intelligent health chat, and hospital/doctor recommendations.

![HealthMate AI](https://img.shields.io/badge/HealthMate-AI-00D9FF?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.5-green?style=for-the-badge&logo=spring)
![Flask](https://img.shields.io/badge/Flask-3.0-blue?style=for-the-badge&logo=flask)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.16-orange?style=for-the-badge&logo=tensorflow)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Model Performance](#model-performance)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Database Setup](#database-setup)
  - [Backend Setup](#backend-setup)
  - [ML Service Setup](#ml-service-setup)
  - [Frontend Setup](#frontend-setup)
- [ML Model Training](#ml-model-training)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## 🌟 Overview

HealthMate AI is a full-stack medical assistant application that leverages artificial intelligence to:

1. **Detect diseases** from medical images (X-rays, CT scans, MRIs)
2. **Provide intelligent health consultations** through a RAG-based chatbot
3. **Recommend hospitals and doctors** based on user needs and location

## ✨ Features

### 🔐 Authentication System
- User registration with email verification
- 2-step email verification using 6-digit codes
- Secure password reset functionality
- JWT-based authentication
- Role-based access control (User, Admin, Doctor)

### 🔬 Disease Detection
- **Pneumonia Detection**: Analyzes chest X-ray images
- **Lung Cancer Detection**: Analyzes CT scan images
- **Alzheimer's Detection**: Analyzes brain MRI images
- Real-time confidence scores and recommendations

### 💬 AI Health Chat
- RAG-based chatbot using Google Gemini API
- Context-aware health conversations
- Medical knowledge retrieval
- Conversation history management

### 🏥 Recommendations
- Hospital finder with location-based search
- Doctor recommendations by specialty
- Hybrid recommendation algorithm
- Detailed profiles with ratings and reviews

### 🎨 Modern UI/UX
- Light/Dark mode toggle
- Responsive design for all devices
- Animated components with Framer Motion
- Glass-morphism design elements
- Interactive data visualizations

## 📊 Model Performance

All three image models were trained in TensorFlow/Keras and evaluated on a held-out test set. Reproducible numbers and curves live in [`healthmate_model_graphs/`](healthmate_model_graphs).

| Model | Task | Accuracy | F1 (macro) | ROC-AUC | Test samples |
|-------|------|----------|------------|---------|--------------|
| Pneumonia | Chest X-ray → Normal / Pneumonia | 89.7% | 0.891 | 0.979 | 624 |
| Lung Cancer | Chest CT → Benign / Malignant / Normal | 81.1% | 0.786 | 0.949 | 412 |
| Alzheimer's | Brain MRI → 4 dementia stages | 70.8% | 0.593 | 0.904 | 538 |

Per-model confusion matrices, ROC/PR curves, training history and per-class metrics are committed under `healthmate_model_graphs/<model>/`.

> These figures come from `healthmate_model_graphs/all_models_summary.json` — no hand-picked numbers.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                        │
│                     Port: 3000                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌───────────────────┐                    ┌───────────────────┐
│  Backend (Spring)  │                    │  ML Service (Flask)│
│    Port: 8080      │                    │    Port: 5000      │
└───────────────────┘                    └───────────────────┘
        │                                           │
        ▼                                           ▼
┌───────────────────┐                    ┌───────────────────┐
│   PostgreSQL DB    │                    │   Keras Models    │
│    Port: 5432      │                    │   Gemini API      │
└───────────────────┘                    └───────────────────┘
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14.2.3
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4.3
- **Animations**: Framer Motion
- **Charts**: Recharts
- **State**: Zustand
- **HTTP Client**: Axios
- **Icons**: Lucide React

### Backend
- **Framework**: Spring Boot 3.2.5
- **Language**: Java 17
- **Security**: Spring Security + JWT
- **Database**: PostgreSQL
- **ORM**: Spring Data JPA
- **Migrations**: Liquibase
- **Email**: Spring Mail

### ML Service
- **Framework**: Flask 3.0.3
- **ML**: TensorFlow 2.16 / Keras 3.3
- **LLM**: Google Gemini API
- **Embeddings**: Sentence Transformers
- **Vector DB**: ChromaDB / FAISS

### Database
- **PostgreSQL 15+**

## 📁 Project Structure

```
health-mate-ai-v6/
├── frontend/                    # Next.js frontend application
│   ├── src/
│   │   ├── app/                # App router pages
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   ├── dashboard/
│   │   │   ├── detect/
│   │   │   ├── chat/
│   │   │   └── recommendations/
│   │   ├── components/         # Reusable components
│   │   └── lib/                # Utilities and API
│   ├── package.json
│   └── tailwind.config.ts
│
├── backend/                     # Spring Boot backend
│   ├── src/main/java/com/healthmate/
│   │   ├── config/             # Configuration classes
│   │   ├── controller/         # REST controllers
│   │   ├── dto/                # Data transfer objects
│   │   ├── exception/          # Exception handlers
│   │   ├── model/              # JPA entities
│   │   ├── repository/         # Data repositories
│   │   ├── security/           # Security configurations
│   │   └── service/            # Business logic
│   ├── src/main/resources/
│   │   ├── db/changelog/       # Liquibase migrations
│   │   └── application.properties
│   └── pom.xml
│
├── ml-service/                  # Flask ML service
│   ├── services/
│   │   ├── disease_detector.py
│   │   ├── chatbot.py
│   │   └── recommendation.py
│   ├── models/                 # Trained .keras models
│   ├── app.py
│   ├── config.py
│   └── requirements.txt
│
├── notebooks/                   # Jupyter/Colab training notebooks
│   ├── pneumonia_detection_training.ipynb
│   ├── lung_cancer_detection_training.ipynb
│   └── alzheimer_detection_training.ipynb
│
└── database/
    └── database_setup.sql      # PostgreSQL setup script
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **Java** 17 or higher
- **Python** 3.10 or higher
- **PostgreSQL** 15 or higher
- **Maven** 3.8 or higher

### Database Setup

1. Install PostgreSQL:
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

2. Run the database setup script:
```bash
cd database
sudo -u postgres psql -f database_setup.sql
```

3. Verify the database:
```bash
psql -h localhost -U healthmate_user -d healthmate_db
\dt  # List tables
```

### Backend Setup

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Configure application properties:**

Edit `src/main/resources/application.properties`:
```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/healthmate_db
spring.datasource.username=healthmate_user
spring.datasource.password=healthmate_password_2024

# JWT (Generate a secure secret!)
jwt.secret=your-256-bit-secret-key-here
jwt.expiration=86400000

# Email (Configure your SMTP)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
```

3. **Build and run:**
```bash
# Using Maven
mvn clean install
mvn spring-boot:run

# Or using the wrapper
./mvnw spring-boot:run
```

The backend will start on `http://localhost:8080`

### ML Service Setup

1. **Navigate to ML service directory:**
```bash
cd ml-service
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
.\venv\Scripts\activate   # Windows
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and add your Gemini API key
```

5. **Add trained models:**
Place your trained `.keras` models in the `models/` directory:
- `pneumonia_model.keras`
- `lung_cancer_model.keras`
- `alzheimer_model.keras`

6. **Run the service:**
```bash
python app.py
```

The ML service will start on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory:**
```bash
cd frontend
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Run development server:**
```bash
npm run dev
# or
yarn dev
```

The frontend will start on `http://localhost:3000`

## 🧠 ML Model Training

### Training on Google Colab

1. Open the respective notebook in Google Colab:
   - `notebooks/pneumonia_detection_training.ipynb`
   - `notebooks/lung_cancer_detection_training.ipynb`
   - `notebooks/alzheimer_detection_training.ipynb`

2. Upload your `kaggle.json` file when prompted

3. Run all cells to:
   - Download dataset from Kaggle
   - Train the model
   - Evaluate performance
   - Save the `.keras` model

4. Download the trained model and place in `ml-service/models/`

> **Model weights are not committed.** Trained `.keras` files are 25–105 MB each, so they are git-ignored — see `.gitignore`. Re-run the notebooks above to regenerate them, then drop the files in `ml-service/models/` (paths are configured through `PNEUMONIA_MODEL_PATH`, `LUNG_CANCER_MODEL_PATH` and `ALZHEIMER_MODEL_PATH`). The service starts in mock-prediction mode when weights are absent, so the API is usable without them.

### Kaggle Datasets Used

| Model | Dataset | Kaggle Link |
|-------|---------|-------------|
| Pneumonia | Chest X-Ray Pneumonia | [paultimothymooney/chest-xray-pneumonia](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia) |
| Lung Cancer | Chest CT-Scan Images | [mohamedhanyyy/chest-ctscan-images](https://www.kaggle.com/datasets/mohamedhanyyy/chest-ctscan-images) |
| Alzheimer's | Alzheimer's Dataset | [tourist55/alzheimers-dataset-4-class-of-images](https://www.kaggle.com/datasets/tourist55/alzheimers-dataset-4-class-of-images) |

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/verify-email` | Verify email with code |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password |
| POST | `/api/auth/resend-code` | Resend verification code |

### ML Service Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict` | Predict disease from image |
| GET | `/api/models` | Get available models info |
| POST | `/api/chat` | Chat with HealthMate AI |
| GET | `/api/chat/suggestions` | Get suggested questions |
| GET | `/api/recommendations/hospitals` | Get hospital recommendations |
| GET | `/api/recommendations/doctors` | Get doctor recommendations |
| POST | `/api/recommendations/for-condition` | Get recommendations for condition |

### Request/Response Examples

**Register User:**
```json
POST /api/auth/register
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!"
}
```

**Disease Prediction:**
```bash
curl -X POST http://localhost:5000/api/predict \
  -F "file=@chest_xray.jpg" \
  -F "model_type=pneumonia"
```

## 🧪 Testing

The ML service ships with a pytest suite covering the HTTP contract, input validation and the
image preprocessing path. TensorFlow is stubbed, so the suite runs in a few seconds without
downloading model weights.

```bash
cd ml-service
pip install -r requirements-dev.txt
pytest -q
```

CI runs linting plus this suite on every push via `.github/workflows/ci.yml`.

## 🚢 Deployment

### Docker Deployment

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: healthmate_db
      POSTGRES_USER: healthmate_user
      POSTGRES_PASSWORD: healthmate_password_2024
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/healthmate_db

  ml-service:
    build: ./ml-service
    ports:
      - "5000:5000"
    environment:
      GEMINI_API_KEY: ${GEMINI_API_KEY}

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
      - ml-service

volumes:
  postgres_data:
```

### Production Checklist

- [ ] Change all default passwords
- [ ] Generate secure JWT secret
- [ ] Configure proper CORS origins
- [ ] Set up HTTPS/SSL certificates
- [ ] Configure email service for production
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Load test the application

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **HealthMate AI Team**

## 🙏 Acknowledgments

- Kaggle for providing medical imaging datasets
- Google for the Gemini API
- The open-source community for amazing tools and libraries

---

<p align="center">
  Made with ❤️ for better healthcare
</p>
