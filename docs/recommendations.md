# HealthMate AI Recommendation System Documentation

This document explains how the recommendation system works in detail: data model, filtering, ranking formulas, diagnosis-aware retrieval, and Gemini-assisted response generation.

## 1) Scope and components

The recommendation engine is implemented in:

- `ml-service/services/recommendation.py`

Exposed through API routes in:

- `ml-service/app.py`

It supports:

1. Doctor catalog and filtering
2. Hospital ranking with location awareness
3. Doctor ranking by experience/rating/specialty
4. Condition-based specialty mapping
5. Diagnosis-aware content-based recommendation
6. Gemini-generated recommendation text with deterministic fallback

---

## 2) Data source and normalization

Primary dataset file:

- `ml-service/data.json`

Each row is normalized by `_normalize_entry(...)` into a standard schema including:

- identity: `id`, `name`, `nmc_no`
- provider data: `hospital`, `hospital_type`, `hospital_address`, `hospital_phone`
- location: `city`, `province`, `hospital_lat`, `hospital_lng`
- professional profile: `department[]`, `interests[]`, `degree`, `experience_years`, `languages[]`
- quality/access fields: `rating`, `availability`, `notes`

The engine also builds a **hospital catalog** by aggregating doctors with the same `(hospital, city, province)` key.

---

## 3) Core retrieval modes

## A) Catalog mode (`get_catalog`)

- Applies text and metadata filters: `query`, `city`, `province`, `department`
- Returns paginated doctor rows + discovered hospitals + available specialties
- Used as a baseline candidate source for AI recommendations

## B) Hospital ranking mode (`get_hospitals`)

Optional filters:

- `specialty`
- `city`
- `user_coords` (lat/lng)
- `needs_emergency` flag present in API signature (hospitals are modeled as emergency-available by default)

### Hospital relevance formula

For each hospital:

- `location_score` from geodesic distance (40 km normalization window)
- `rating_score = rating / 5`
- `specialty_score = 1.0` if no specialty filter else `0.6`

Final score:

`hospital_score = 0.45*location_score + 0.35*rating_score + 0.20*specialty_score`

Returned as:

- `relevance_score = hospital_score * 100`
- optional `distance_km` when coordinates are provided

## C) Doctor ranking mode (`get_doctors`)

Optional filters:

- `specialty`
- `hospital_id`
- `min_experience`
- `max_fee` argument exists in API layer; no fee field is used in stored schema by default

### Doctor relevance formula

For each doctor:

- `experience_score = min(experience_years / 25, 1.0)`
- `rating_score = min(rating / 5, 1.0)`
- `specialty_score = 1.0` if no specialty filter else `0.65`

Final score:

`doctor_score = 0.45*experience_score + 0.35*rating_score + 0.20*specialty_score`

Returned as percentage relevance.

---

## 4) Condition and message understanding

The engine maps conditions to specialty hints using `_condition_specialty_map(...)`:

Examples:

- `pneumonia` -> Pulmonology / General Medicine / Respiratory Medicine
- `lung_cancer` or `malignant` -> Oncology / Pulmonology
- `alzheimer`, `mild_demented`, `moderate_demented` -> Neurology / Psychiatry

For free-text user messages without diagnosis, `_infer_specialty_from_message(...)` uses keyword mapping (e.g., asthma, dementia, crohn, cancer) plus fuzzy matching against known specialty names.

---

## 5) Diagnosis-aware content-based recommendation

`get_content_based_recommendations(...)` combines diagnostic output from image model with provider metadata.

### Diagnostic profile construction

`_build_diagnostic_profile(...)` builds:

- inferred condition (`condition`/`prediction`)
- confidence
- model type
- top candidate labels/confidences
- specialty hints
- combined profile text

### Semantic similarity

- Doctor profile strings are vectorized with `TfidfVectorizer(stop_words='english')`
- Similarity to diagnostic profile text is computed via cosine similarity

### Content-based doctor score

For each doctor:

- `semantic_score` from TF-IDF cosine similarity
- `location_score` from geodesic distance
- `department_bonus = 0.25` if doctor departments overlap suggested specialties

Final score:

`final_score = 0.55*semantic_score + 0.30*location_score + department_bonus`

Returned fields include `content_score`, `location_score`, `final_score`, and optional `distance_km`.

Hospitals are retrieved in parallel via `get_hospitals(...)` using top inferred specialty.

---

## 6) AI recommendation generation (`get_ai_recommendations`)

The engine creates practical narrative recommendations using Gemini when available.

Inputs to prompt:

- user message
- diagnosis payload (optional)
- user location (optional)
- shortlisted doctors and hospitals (deterministic candidates)

System instruction constrains Gemini to use provided candidates and avoid certainty claims.

If Gemini fails/unavailable, deterministic fallback text is returned so endpoint remains operational.

Returned object includes:

- `response` (AI/fallback explanation)
- `doctors` candidates
- `hospitals` candidates
- `mode: gemini_only`

---

## 7) API endpoints using recommendation engine

From `ml-service/app.py`:

- `GET /api/recommendations/hospitals`
- `GET /api/recommendations/hospitals/<hospital_id>`
- `GET /api/recommendations/doctors`
- `GET /api/recommendations/specialties`
- `GET /api/recommendations/catalog`
- `POST /api/recommendations/condition`
- `POST /api/recommendations/content-based`
- `POST /api/recommendations/ai`

Plus admin CRUD/upload routes over recommendation dataset.

---

## 8) Admin and lifecycle operations

Engine supports:

- list/add/update/delete entries
- full dataset replacement by JSON upload
- automatic persistence back to `data.json`
- refresh of specialty list and hospital catalog after updates

---

## 9) Practical behavior and fallback strategy

- Missing/weak message specialty intent -> defaults to broader candidates (`General Medicine` path where needed)
- Missing coordinates -> neutral location score baseline in ranking
- Gemini unavailable -> deterministic recommendation text fallback
- Dataset absent -> auto-created empty `data.json`

---

## 10) Implementation references

- `ml-service/services/recommendation.py`
- `ml-service/app.py`
- `frontend/src/app/recommendations/page.tsx`
