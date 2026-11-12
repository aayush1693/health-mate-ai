import json
import logging
import math
import os
import re
import uuid
from typing import Dict, List, Optional, Tuple

from geopy.distance import geodesic
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from config import config

try:
    from google import genai
    from google.genai import types
except Exception:
    genai = None
    types = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RecommendationEngine:
    """Content-based recommendation system for doctors and hospitals."""

    def __init__(self):
        self.data_path = os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "data.json")
        )
        self.entries = self._load_entries()
        self.hospitals = self._build_hospital_catalog(self.entries)
        self.specialties = self._get_specialties()
        self.gemini_client = self._init_gemini_client()

    def _init_gemini_client(self):
        if not genai or not config.GEMINI_API_KEY:
            return None
        try:
            return genai.Client(api_key=config.GEMINI_API_KEY)
        except Exception as e:
            logger.warning(f"Gemini initialization failed for recommendation engine: {e}")
            return None

    def _ensure_data_file(self):
        if os.path.exists(self.data_path):
            return
        os.makedirs(os.path.dirname(self.data_path), exist_ok=True)
        with open(self.data_path, "w", encoding="utf-8") as file:
            json.dump([], file, ensure_ascii=False, indent=2)

    def _normalize_entry(self, row: Dict) -> Dict:
        entry_id = row.get("id") or str(uuid.uuid4())
        interests = row.get("interests", [])
        departments = row.get("department", [])

        if isinstance(interests, str):
            interests = [item.strip() for item in interests.split(",") if item.strip()]
        if isinstance(departments, str):
            departments = [item.strip() for item in departments.split(",") if item.strip()]

        return {
            "id": entry_id,
            "name": row.get("name", "").strip(),
            "hospital": row.get("hospital", "").strip(),
            "mobile_number": row.get("mobile_number", "").strip(),
            "city": row.get("city", "").strip(),
            "province": row.get("province", "").strip(),
            "clinic_part_time": row.get("clinic_part_time", "").strip(),
            "degree": row.get("degree", "").strip(),
            "nmc_no": row.get("nmc_no", "").strip(),
            "department": departments,
            "interests": interests,
            "experience_years": int(row.get("experience_years", 0) or 0),
            "languages": row.get("languages", ["Nepali", "English"]),
            "hospital_type": row.get("hospital_type", "Government").strip(),
            "hospital_address": row.get("hospital_address", "").strip(),
            "hospital_phone": row.get("hospital_phone", "").strip(),
            "hospital_lat": float(row.get("hospital_lat", 0) or 0),
            "hospital_lng": float(row.get("hospital_lng", 0) or 0),
            "rating": float(row.get("rating", 4.2) or 4.2),
            "availability": row.get("availability", "OPD hours").strip(),
            "notes": row.get("notes", "").strip(),
        }

    def _load_entries(self) -> List[Dict]:
        self._ensure_data_file()
        try:
            with open(self.data_path, "r", encoding="utf-8") as file:
                data = json.load(file)
            if not isinstance(data, list):
                logger.warning("Recommendation data.json is not a list. Resetting to empty list.")
                return []
            return [self._normalize_entry(item) for item in data]
        except Exception as e:
            logger.error(f"Failed to load recommendation data: {e}")
            return []

    def _save_entries(self):
        with open(self.data_path, "w", encoding="utf-8") as file:
            json.dump(self.entries, file, ensure_ascii=False, indent=2)

    def _refresh(self):
        self.hospitals = self._build_hospital_catalog(self.entries)
        self.specialties = self._get_specialties()

    def _build_hospital_catalog(self, entries: List[Dict]) -> List[Dict]:
        hospitals_map: Dict[Tuple[str, str, str], Dict] = {}

        for row in entries:
            key = (row.get("hospital", ""), row.get("city", ""), row.get("province", ""))
            if key not in hospitals_map:
                hospitals_map[key] = {
                    "id": str(uuid.uuid4()),
                    "name": row.get("hospital", ""),
                    "city": row.get("city", ""),
                    "state": row.get("province", ""),
                    "address": row.get("hospital_address", ""),
                    "phone": row.get("hospital_phone", ""),
                    "rating": row.get("rating", 4.0),
                    "reviews_count": max(40, row.get("experience_years", 1) * 8),
                    "specialties": set(row.get("department", [])),
                    "facilities": ["Emergency", "OPD", "Lab", "Radiology"],
                    "coordinates": {
                        "lat": row.get("hospital_lat", 0),
                        "lng": row.get("hospital_lng", 0),
                    },
                    "emergency_available": True,
                    "opening_hours": "24/7",
                    "hospital_type": row.get("hospital_type", "Government"),
                }
            else:
                hospitals_map[key]["specialties"].update(row.get("department", []))

        output = []
        for item in hospitals_map.values():
            item["specialties"] = sorted(list(item["specialties"]))
            output.append(item)
        return output

    def _get_specialties(self) -> List[str]:
        specialties = set()
        for row in self.entries:
            for department in row.get("department", []):
                specialties.add(department)
        return sorted(list(specialties))

    def _normalize_condition(self, condition: str) -> str:
        return (condition or "").strip().lower().replace(" ", "_")

    def _condition_specialty_map(self, condition: str) -> List[str]:
        mapping = {
            "pneumonia": ["Pulmonology", "General Medicine", "Respiratory Medicine"],
            "lung_cancer": ["Oncology", "Pulmonology", "Thoracic Surgery"],
            "malignant": ["Oncology", "Pulmonology"],
            "benign": ["Pulmonology", "General Medicine"],
            "alzheimer": ["Neurology", "Psychiatry", "Geriatric Medicine"],
            "mild_demented": ["Neurology", "Psychiatry"],
            "moderate_demented": ["Neurology", "Psychiatry"],
            "very_mild_demented": ["Neurology"],
            "non_demented": ["General Medicine"],
            "normal": ["General Medicine"],
        }
        return mapping.get(self._normalize_condition(condition), ["General Medicine"])

    def _infer_specialty_from_message(self, message: str) -> Optional[str]:
        text = (message or "").lower()
        if not text:
            return None

        keyword_map = {
            "crohn": ["Gastroenterology", "Internal Medicine", "General Medicine"],
            "crohns": ["Gastroenterology", "Internal Medicine", "General Medicine"],
            "ibd": ["Gastroenterology", "Internal Medicine"],
            "ulcerative colitis": ["Gastroenterology", "Internal Medicine"],
            "asthma": ["Pulmonology", "Respiratory Medicine"],
            "breathing": ["Pulmonology", "Respiratory Medicine"],
            "cancer": ["Oncology", "Medical Oncology"],
            "dementia": ["Neurology", "Psychiatry"],
            "alzheimer": ["Neurology", "Psychiatry"],
            "mental": ["Psychiatry", "Mental Health"],
            "depression": ["Psychiatry", "Mental Health"],
        }

        specialty_candidates = []
        for keyword, specialties in keyword_map.items():
            if keyword in text:
                specialty_candidates.extend(specialties)

        if not specialty_candidates:
            tokens = [token for token in re.findall(r"[a-zA-Z]+", text) if len(token) > 2]
            for specialty in self.specialties:
                specialty_lower = specialty.lower()
                if specialty_lower in text or any(token in specialty_lower for token in tokens):
                    specialty_candidates.append(specialty)

        seen = set()
        for candidate in specialty_candidates:
            candidate_lower = candidate.lower()
            if candidate_lower in seen:
                continue
            seen.add(candidate_lower)
            for specialty in self.specialties:
                if candidate_lower == specialty.lower():
                    return specialty

        return "General Medicine" if self.specialties else None

    def _build_diagnostic_profile(self, diagnostic_output: Dict) -> Dict:
        condition = (
            diagnostic_output.get("condition")
            or diagnostic_output.get("prediction")
            or "General Consultation"
        )
        confidence = float(diagnostic_output.get("confidence", 50.0) or 50.0)
        model_type = diagnostic_output.get("model_type", "")
        recommendation = diagnostic_output.get("recommendation", "")
        all_predictions = diagnostic_output.get("all_predictions", []) or []

        top_candidates = sorted(
            all_predictions,
            key=lambda item: float(item.get("confidence", 0)),
            reverse=True,
        )[:3]

        candidate_text = " ".join(
            f"{item.get('label', '')} {item.get('confidence', 0)}" for item in top_candidates
        )

        specialty_hints = self._condition_specialty_map(condition)
        profile_text = (
            f"condition {condition} confidence {confidence} model {model_type} "
            f"recommendation {recommendation} top_candidates {candidate_text} "
            f"specialties {' '.join(specialty_hints)}"
        )

        return {
            "condition": condition,
            "confidence": confidence,
            "specialties": specialty_hints,
            "profile_text": profile_text,
        }

    def _doctor_profile_text(self, doctor: Dict) -> str:
        return (
            f"{doctor.get('name', '')} {doctor.get('hospital', '')} {doctor.get('city', '')} "
            f"{doctor.get('province', '')} departments {' '.join(doctor.get('department', []))} "
            f"interests {' '.join(doctor.get('interests', []))} degree {doctor.get('degree', '')}"
        )

    def _hospital_profile_text(self, hospital: Dict) -> str:
        return (
            f"{hospital.get('name', '')} {hospital.get('city', '')} {hospital.get('state', '')} "
            f"specialties {' '.join(hospital.get('specialties', []))} hospital_type {hospital.get('hospital_type', '')}"
        )

    def _content_similarity_scores(self, query_text: str, item_texts: List[str]) -> List[float]:
        if not item_texts:
            return []

        corpus = [query_text] + item_texts
        vectorizer = TfidfVectorizer(stop_words="english")
        matrix = vectorizer.fit_transform(corpus)
        query_vec = matrix[0:1]
        item_vecs = matrix[1:]
        sims = cosine_similarity(query_vec, item_vecs)[0]
        return [float(score) for score in sims]

    def calculate_distance(self, user_coords: Dict, target_coords: Dict) -> Optional[float]:
        try:
            user_loc = (user_coords["lat"], user_coords["lng"])
            target_loc = (target_coords["lat"], target_coords["lng"])
            return geodesic(user_loc, target_loc).kilometers
        except Exception:
            return None

    def _location_score(self, user_coords: Optional[Dict], lat: float, lng: float) -> float:
        if not user_coords or not lat or not lng:
            return 0.35
        distance = self.calculate_distance(user_coords, {"lat": lat, "lng": lng})
        if distance is None:
            return 0.0
        return max(0.0, 1 - min(distance, 40) / 40)

    def _filter_entries(
        self,
        query: Optional[str] = None,
        city: Optional[str] = None,
        province: Optional[str] = None,
        department: Optional[str] = None,
    ) -> List[Dict]:
        rows = self.entries.copy()

        if city:
            rows = [item for item in rows if city.lower() in item.get("city", "").lower()]
        if province:
            rows = [
                item for item in rows if province.lower() in item.get("province", "").lower()
            ]
        if department:
            rows = [
                item
                for item in rows
                if any(
                    department.lower() in dep.lower()
                    for dep in item.get("department", [])
                )
            ]
        if query:
            q = query.lower().strip()
            rows = [
                item
                for item in rows
                if q in item.get("name", "").lower()
                or q in item.get("hospital", "").lower()
                or q in item.get("city", "").lower()
                or any(q in dep.lower() for dep in item.get("department", []))
                or any(q in interest.lower() for interest in item.get("interests", []))
            ]

        return rows

    def get_catalog(
        self,
        query: Optional[str] = None,
        city: Optional[str] = None,
        province: Optional[str] = None,
        department: Optional[str] = None,
        limit: int = 50,
    ) -> Dict:
        rows = self._filter_entries(query, city, province, department)

        hospital_names = sorted({
            f"{item.get('hospital', '')} - {item.get('city', '')}" for item in rows
        })

        return {
            "success": True,
            "count": min(limit, len(rows)),
            "total": len(rows),
            "doctors": rows[:limit],
            "hospital_names": hospital_names,
            "specialties": self.specialties,
        }

    def get_hospitals(
        self,
        user_coords: Optional[Dict] = None,
        specialty: Optional[str] = None,
        needs_emergency: bool = False,
        city: Optional[str] = None,
        limit: int = 10,
    ) -> Dict:
        hospital_pool = self.hospitals.copy()

        if city:
            hospital_pool = [
                h for h in hospital_pool if city.lower() in h.get("city", "").lower()
            ]

        if specialty:
            hospital_pool = [
                h
                for h in hospital_pool
                if any(specialty.lower() in dep.lower() for dep in h.get("specialties", []))
            ]

        scored = []
        for item in hospital_pool:
            location = self._location_score(
                user_coords,
                item.get("coordinates", {}).get("lat", 0),
                item.get("coordinates", {}).get("lng", 0),
            )
            specialty_score = 1.0 if not specialty else 0.6
            rating_score = float(item.get("rating", 4.0)) / 5
            score = (0.45 * location) + (0.35 * rating_score) + (0.20 * specialty_score)
            row = item.copy()
            row["relevance_score"] = round(score * 100, 2)

            if user_coords and item.get("coordinates"):
                distance = self.calculate_distance(user_coords, item["coordinates"])
                if distance is not None and math.isfinite(distance):
                    row["distance_km"] = round(distance, 2)
            scored.append(row)

        scored.sort(key=lambda item: item.get("relevance_score", 0), reverse=True)

        return {
            "success": True,
            "count": len(scored[:limit]),
            "total": len(scored),
            "hospitals": scored[:limit],
        }

    def get_doctors(
        self,
        specialty: Optional[str] = None,
        hospital_id: Optional[str] = None,
        min_experience: int = 0,
        max_fee: Optional[int] = None,
        limit: int = 10,
    ) -> Dict:
        doctors = self.entries.copy()

        if specialty:
            doctors = [
                d
                for d in doctors
                if any(specialty.lower() in dep.lower() for dep in d.get("department", []))
            ]

        if min_experience > 0:
            doctors = [
                d for d in doctors if int(d.get("experience_years", 0)) >= min_experience
            ]

        if hospital_id:
            hospital_match = next(
                (h for h in self.hospitals if h.get("id") == hospital_id),
                None,
            )
            if hospital_match:
                doctors = [
                    d
                    for d in doctors
                    if d.get("hospital") == hospital_match.get("name")
                    and d.get("city") == hospital_match.get("city")
                ]

        scored = []
        for doctor in doctors:
            experience = min(float(doctor.get("experience_years", 0)) / 25, 1.0)
            rating = min(float(doctor.get("rating", 4.0)) / 5, 1.0)
            specialty_score = 1.0 if not specialty else 0.65
            score = (0.45 * experience) + (0.35 * rating) + (0.20 * specialty_score)
            row = doctor.copy()
            row["relevance_score"] = round(score * 100, 2)
            scored.append(row)

        scored.sort(key=lambda d: d.get("relevance_score", 0), reverse=True)

        return {
            "success": True,
            "count": len(scored[:limit]),
            "total": len(scored),
            "doctors": scored[:limit],
        }

    def get_recommendations_for_condition(
        self,
        condition: str,
        user_coords: Optional[Dict] = None,
    ) -> Dict:
        specialties = self._condition_specialty_map(condition)
        hospitals = self.get_hospitals(
            user_coords=user_coords,
            specialty=specialties[0],
            limit=5,
        )
        doctors = self.get_doctors(
            specialty=specialties[0],
            limit=5,
        )

        return {
            "success": True,
            "condition": condition,
            "recommended_specialty": specialties[0],
            "all_relevant_specialties": specialties,
            "hospitals": hospitals.get("hospitals", []),
            "doctors": doctors.get("doctors", []),
        }

    def get_content_based_recommendations(
        self,
        diagnostic_output: Dict,
        user_coords: Optional[Dict] = None,
        city: Optional[str] = None,
        needs_emergency: bool = False,
        limit: int = 5,
    ) -> Dict:
        profile = self._build_diagnostic_profile(diagnostic_output)

        doctor_pool = self.entries.copy()
        if city:
            doctor_pool = [
                doctor for doctor in doctor_pool if city.lower() in doctor.get("city", "").lower()
            ]

        doctor_texts = [self._doctor_profile_text(item) for item in doctor_pool]
        doctor_similarity = self._content_similarity_scores(profile["profile_text"], doctor_texts)

        scored_doctors = []
        for idx, doctor in enumerate(doctor_pool):
            semantic_score = doctor_similarity[idx] if idx < len(doctor_similarity) else 0
            location = self._location_score(
                user_coords,
                doctor.get("hospital_lat", 0),
                doctor.get("hospital_lng", 0),
            )
            department_bonus = 0.0
            if any(
                hint.lower() in " ".join(doctor.get("department", [])).lower()
                for hint in profile["specialties"]
            ):
                department_bonus = 0.25

            final_score = (0.55 * semantic_score) + (0.30 * location) + department_bonus
            row = doctor.copy()
            row["content_score"] = round(semantic_score, 4)
            row["location_score"] = round(location, 4)
            row["final_score"] = round(final_score, 4)

            if user_coords and row.get("hospital_lat") and row.get("hospital_lng"):
                distance = self.calculate_distance(
                    user_coords,
                    {"lat": row.get("hospital_lat"), "lng": row.get("hospital_lng")},
                )
                if distance is not None and math.isfinite(distance):
                    row["distance_km"] = round(distance, 2)

            scored_doctors.append(row)

        scored_doctors.sort(key=lambda item: item.get("final_score", 0), reverse=True)

        matching_hospitals = self.get_hospitals(
            user_coords=user_coords,
            specialty=profile["specialties"][0] if profile["specialties"] else None,
            city=city,
            needs_emergency=needs_emergency,
            limit=limit,
        ).get("hospitals", [])

        return {
            "success": True,
            "mode": "content_based",
            "diagnostic_profile": {
                "condition": profile["condition"],
                "confidence": profile["confidence"],
                "suggested_specialties": profile["specialties"],
            },
            "hospitals": matching_hospitals,
            "doctors": scored_doctors[:limit],
        }

    def get_ai_recommendations(
        self,
        message: str,
        diagnosis: Optional[Dict] = None,
        user_location: Optional[Dict] = None,
        limit: int = 5,
    ) -> Dict:
        baseline = self.get_catalog(
            query=message,
            city=user_location.get("city") if user_location else None,
            limit=limit,
        )

        if diagnosis:
            content_based = self.get_content_based_recommendations(
                diagnostic_output=diagnosis,
                user_coords=user_location,
                city=user_location.get("city") if user_location else None,
                limit=limit,
            )
            baseline_doctors = content_based.get("doctors", [])
            baseline_hospitals = content_based.get("hospitals", [])
        else:
            baseline_doctors = baseline.get("doctors", [])[:limit]
            if not baseline_doctors:
                inferred_specialty = self._infer_specialty_from_message(message)
                if inferred_specialty:
                    baseline_doctors = self.get_doctors(
                        specialty=inferred_specialty,
                        limit=limit,
                    ).get("doctors", [])

            if not baseline_doctors:
                baseline_doctors = self.get_doctors(limit=limit).get("doctors", [])

            baseline_hospitals = self.get_hospitals(
                user_coords=user_location,
                city=user_location.get("city") if user_location else None,
                limit=limit,
            ).get("hospitals", [])

        prompt = (
            "You are a healthcare recommendation assistant for Nepal. "
            "Provide practical, concise recommendation guidance based on the user query, diagnosis (if provided), "
            "and available doctor/hospital options. Mention why each option fits. "
            "Do not claim certainty. End with safety advice to consult qualified professionals.\n\n"
            f"User message: {message}\n"
            f"Diagnosis: {json.dumps(diagnosis or {}, ensure_ascii=False)}\n"
            f"Location: {json.dumps(user_location or {}, ensure_ascii=False)}\n"
            f"Doctors candidates: {json.dumps(baseline_doctors, ensure_ascii=False)}\n"
            f"Hospitals candidates: {json.dumps(baseline_hospitals, ensure_ascii=False)}"
        )

        ai_text = ""
        if self.gemini_client and types:
            try:
                response = self.gemini_client.models.generate_content(
                    model=config.GEMINI_MODEL,
                    contents=[prompt],
                    config=types.GenerateContentConfig(
                        system_instruction=(
                            "You are HealthMate AI recommendation assistant. "
                            "Use only the provided candidate list and user context."
                        )
                    ),
                )
                ai_text = (response.text or "").strip()
            except Exception as e:
                logger.warning(f"Gemini recommendation fallback used: {e}")

        if not ai_text:
            ai_text = (
                "Based on your query, these options are matched using specialty, location, and diagnosis context. "
                "Please review doctor department, hospital accessibility, and availability before booking. "
                "For emergencies, contact your nearest hospital immediately."
            )

        return {
            "success": True,
            "response": ai_text,
            "doctors": baseline_doctors,
            "hospitals": baseline_hospitals,
            "mode": "gemini_only",
        }

    def get_all_specialties(self) -> Dict:
        return {"success": True, "specialties": self.specialties}

    def get_hospital_by_id(self, hospital_id: str) -> Dict:
        for hospital in self.hospitals:
            if hospital.get("id") == hospital_id:
                return {"success": True, "hospital": hospital}
        return {"success": False, "error": "Hospital not found"}

    def get_doctor_by_id(self, doctor_id: str) -> Dict:
        for doctor in self.entries:
            if doctor.get("id") == doctor_id:
                return {"success": True, "doctor": doctor}
        return {"success": False, "error": "Doctor not found"}

    def authenticate_admin(self, username: str, password: str) -> bool:
        return username == "admin" and password == "admin"

    def admin_list_entries(self) -> Dict:
        return {
            "success": True,
            "count": len(self.entries),
            "entries": self.entries,
        }

    def admin_add_entry(self, entry: Dict) -> Dict:
        normalized = self._normalize_entry(entry)
        self.entries.append(normalized)
        self._save_entries()
        self._refresh()
        return {"success": True, "entry": normalized}

    def admin_update_entry(self, entry_id: str, payload: Dict) -> Dict:
        for index, row in enumerate(self.entries):
            if row.get("id") == entry_id:
                updated = row.copy()
                updated.update(payload)
                normalized = self._normalize_entry(updated)
                self.entries[index] = normalized
                self._save_entries()
                self._refresh()
                return {"success": True, "entry": normalized}
        return {"success": False, "error": "Entry not found"}

    def admin_delete_entry(self, entry_id: str) -> Dict:
        before = len(self.entries)
        self.entries = [row for row in self.entries if row.get("id") != entry_id]
        if len(self.entries) == before:
            return {"success": False, "error": "Entry not found"}
        self._save_entries()
        self._refresh()
        return {"success": True}

    def admin_upload_entries(self, rows: List[Dict]) -> Dict:
        if not isinstance(rows, list):
            return {"success": False, "error": "Uploaded JSON must be an array."}

        normalized = [self._normalize_entry(row) for row in rows]
        self.entries = normalized
        self._save_entries()
        self._refresh()

        return {
            "success": True,
            "count": len(self.entries),
            "message": "Dataset replaced successfully",
        }


recommendation_engine = RecommendationEngine()
