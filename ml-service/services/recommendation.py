import math
from typing import List, Dict, Optional
from geopy.distance import geodesic
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RecommendationEngine:
    """Hybrid recommendation system for hospitals and doctors"""
    
    def __init__(self):
        self.hospitals = self._load_hospitals_data()
        self.doctors = self._load_doctors_data()
        self.specialties = self._get_specialties()
    
    def _load_hospitals_data(self) -> List[Dict]:
        """Load hospitals data - In production, this would come from a database"""
        return [
            {
                "id": "h1",
                "name": "City General Hospital",
                "address": "123 Main Street, Downtown",
                "city": "Kathmandu",
                "state": "Bagmati",
                "phone": "+977-1-4123456",
                "email": "info@citygeneralhospital.com",
                "website": "https://citygeneralhospital.com",
                "rating": 4.5,
                "reviews_count": 342,
                "specialties": ["Cardiology", "Neurology", "Oncology", "Pulmonology", "General Medicine"],
                "facilities": ["ICU", "Emergency", "Pharmacy", "Lab", "Radiology", "MRI", "CT Scan"],
                "coordinates": {"lat": 27.7172, "lng": 85.3240},
                "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400",
                "emergency_available": True,
                "insurance_accepted": ["Medicare", "BlueCross", "Aetna"],
                "opening_hours": "24/7"
            },
            {
                "id": "h2",
                "name": "Nepal Medical Center",
                "address": "456 Health Avenue, Lazimpat",
                "city": "Kathmandu",
                "state": "Bagmati",
                "phone": "+977-1-4456789",
                "email": "contact@nepalmedical.com",
                "website": "https://nepalmedical.com",
                "rating": 4.7,
                "reviews_count": 518,
                "specialties": ["Cardiology", "Orthopedics", "Pediatrics", "Dermatology", "Psychiatry"],
                "facilities": ["ICU", "NICU", "Emergency", "Pharmacy", "Lab", "Radiology"],
                "coordinates": {"lat": 27.7219, "lng": 85.3180},
                "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400",
                "emergency_available": True,
                "insurance_accepted": ["Medicare", "UnitedHealth", "Cigna"],
                "opening_hours": "24/7"
            },
            {
                "id": "h3",
                "name": "Sunrise Health Hospital",
                "address": "789 Sunrise Road, Balkhu",
                "city": "Kathmandu",
                "state": "Bagmati",
                "phone": "+977-1-4789012",
                "email": "info@sunrisehealth.com",
                "website": "https://sunrisehealth.com",
                "rating": 4.3,
                "reviews_count": 256,
                "specialties": ["Pulmonology", "General Medicine", "ENT", "Ophthalmology"],
                "facilities": ["ICU", "Emergency", "Pharmacy", "Lab", "X-Ray"],
                "coordinates": {"lat": 27.6935, "lng": 85.2920},
                "image": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400",
                "emergency_available": True,
                "insurance_accepted": ["Medicare", "BlueCross"],
                "opening_hours": "24/7"
            },
            {
                "id": "h4",
                "name": "Mountain View Clinic",
                "address": "321 Hill Street, Patan",
                "city": "Lalitpur",
                "state": "Bagmati",
                "phone": "+977-1-5123456",
                "email": "info@mountainviewclinic.com",
                "website": "https://mountainviewclinic.com",
                "rating": 4.6,
                "reviews_count": 189,
                "specialties": ["Family Medicine", "Pediatrics", "Women's Health", "Geriatrics"],
                "facilities": ["Pharmacy", "Lab", "Minor Surgery"],
                "coordinates": {"lat": 27.6683, "lng": 85.3189},
                "image": "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400",
                "emergency_available": False,
                "insurance_accepted": ["Medicare", "Aetna", "Cigna"],
                "opening_hours": "8:00 AM - 8:00 PM"
            },
            {
                "id": "h5",
                "name": "Valley Specialty Center",
                "address": "555 Valley Road, Bhaktapur",
                "city": "Bhaktapur",
                "state": "Bagmati",
                "phone": "+977-1-6123456",
                "email": "contact@valleyspecialty.com",
                "website": "https://valleyspecialty.com",
                "rating": 4.4,
                "reviews_count": 312,
                "specialties": ["Neurology", "Neurosurgery", "Oncology", "Radiology"],
                "facilities": ["ICU", "MRI", "CT Scan", "PET Scan", "Lab", "Pharmacy"],
                "coordinates": {"lat": 27.6710, "lng": 85.4298},
                "image": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=400",
                "emergency_available": True,
                "insurance_accepted": ["Medicare", "UnitedHealth", "BlueCross", "Aetna"],
                "opening_hours": "24/7"
            }
        ]
    
    def _load_doctors_data(self) -> List[Dict]:
        """Load doctors data - In production, this would come from a database"""
        return [
            {
                "id": "d1",
                "name": "Dr. Ramesh Sharma",
                "specialty": "Pulmonology",
                "qualification": "MD, FCCP",
                "experience_years": 15,
                "hospital_id": "h1",
                "hospital_name": "City General Hospital",
                "rating": 4.8,
                "reviews_count": 156,
                "consultation_fee": 1500,
                "available_days": ["Monday", "Wednesday", "Friday"],
                "available_time": "10:00 AM - 4:00 PM",
                "languages": ["English", "Nepali", "Hindi"],
                "image": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200",
                "bio": "Specialist in respiratory diseases with expertise in pneumonia, asthma, and COPD management."
            },
            {
                "id": "d2",
                "name": "Dr. Sita Devi",
                "specialty": "Neurology",
                "qualification": "MD, DM Neurology",
                "experience_years": 12,
                "hospital_id": "h5",
                "hospital_name": "Valley Specialty Center",
                "rating": 4.9,
                "reviews_count": 203,
                "consultation_fee": 2000,
                "available_days": ["Tuesday", "Thursday", "Saturday"],
                "available_time": "9:00 AM - 3:00 PM",
                "languages": ["English", "Nepali"],
                "image": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200",
                "bio": "Expert in neurodegenerative diseases including Alzheimer's and Parkinson's disease."
            },
            {
                "id": "d3",
                "name": "Dr. Bikash Thapa",
                "specialty": "Oncology",
                "qualification": "MD, DM Medical Oncology",
                "experience_years": 18,
                "hospital_id": "h1",
                "hospital_name": "City General Hospital",
                "rating": 4.7,
                "reviews_count": 178,
                "consultation_fee": 2500,
                "available_days": ["Monday", "Tuesday", "Thursday"],
                "available_time": "11:00 AM - 5:00 PM",
                "languages": ["English", "Nepali", "Hindi"],
                "image": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200",
                "bio": "Specialized in lung cancer treatment with extensive experience in chemotherapy and targeted therapy."
            },
            {
                "id": "d4",
                "name": "Dr. Anita Gurung",
                "specialty": "Cardiology",
                "qualification": "MD, DM Cardiology",
                "experience_years": 14,
                "hospital_id": "h2",
                "hospital_name": "Nepal Medical Center",
                "rating": 4.6,
                "reviews_count": 145,
                "consultation_fee": 1800,
                "available_days": ["Monday", "Wednesday", "Friday", "Saturday"],
                "available_time": "9:00 AM - 2:00 PM",
                "languages": ["English", "Nepali"],
                "image": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200",
                "bio": "Interventional cardiologist with expertise in heart disease prevention and treatment."
            },
            {
                "id": "d5",
                "name": "Dr. Krishna Bahadur",
                "specialty": "General Medicine",
                "qualification": "MBBS, MD",
                "experience_years": 20,
                "hospital_id": "h3",
                "hospital_name": "Sunrise Health Hospital",
                "rating": 4.5,
                "reviews_count": 234,
                "consultation_fee": 1000,
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "available_time": "8:00 AM - 6:00 PM",
                "languages": ["English", "Nepali", "Hindi", "Maithili"],
                "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200",
                "bio": "Experienced physician specializing in comprehensive primary care and chronic disease management."
            },
            {
                "id": "d6",
                "name": "Dr. Maya Shrestha",
                "specialty": "Pediatrics",
                "qualification": "MBBS, MD Pediatrics",
                "experience_years": 10,
                "hospital_id": "h4",
                "hospital_name": "Mountain View Clinic",
                "rating": 4.8,
                "reviews_count": 167,
                "consultation_fee": 1200,
                "available_days": ["Monday", "Wednesday", "Thursday", "Saturday"],
                "available_time": "10:00 AM - 5:00 PM",
                "languages": ["English", "Nepali", "Newari"],
                "image": "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=200",
                "bio": "Dedicated pediatrician providing comprehensive care for infants, children, and adolescents."
            },
            {
                "id": "d7",
                "name": "Dr. Sunil Pandey",
                "specialty": "Pulmonology",
                "qualification": "MD, FCCP, FAPSR",
                "experience_years": 16,
                "hospital_id": "h3",
                "hospital_name": "Sunrise Health Hospital",
                "rating": 4.7,
                "reviews_count": 189,
                "consultation_fee": 1600,
                "available_days": ["Tuesday", "Thursday", "Saturday"],
                "available_time": "9:00 AM - 3:00 PM",
                "languages": ["English", "Nepali"],
                "image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200",
                "bio": "Pulmonary specialist with focus on interstitial lung diseases and sleep disorders."
            },
            {
                "id": "d8",
                "name": "Dr. Priya Adhikari",
                "specialty": "Neurology",
                "qualification": "MD, DM, Fellowship in Movement Disorders",
                "experience_years": 11,
                "hospital_id": "h2",
                "hospital_name": "Nepal Medical Center",
                "rating": 4.6,
                "reviews_count": 134,
                "consultation_fee": 1900,
                "available_days": ["Monday", "Wednesday", "Friday"],
                "available_time": "2:00 PM - 7:00 PM",
                "languages": ["English", "Nepali", "Hindi"],
                "image": "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=200",
                "bio": "Neurologist specializing in dementia, epilepsy, and movement disorders."
            }
        ]
    
    def _get_specialties(self) -> List[str]:
        """Get all available specialties"""
        specialties = set()
        for hospital in self.hospitals:
            specialties.update(hospital.get('specialties', []))
        for doctor in self.doctors:
            specialties.add(doctor.get('specialty', ''))
        return sorted(list(specialties))
    
    def calculate_distance(self, user_coords: Dict, target_coords: Dict) -> float:
        """Calculate distance between two coordinates in kilometers"""
        try:
            user_loc = (user_coords['lat'], user_coords['lng'])
            target_loc = (target_coords['lat'], target_coords['lng'])
            return geodesic(user_loc, target_loc).kilometers
        except Exception:
            return float('inf')
    
    def _calculate_hospital_score(self, hospital: Dict, user_coords: Optional[Dict] = None, 
                                  specialty: Optional[str] = None, 
                                  needs_emergency: bool = False) -> float:
        """Calculate relevance score for a hospital"""
        score = 0.0
        
        # Rating score (0-25)
        score += (hospital.get('rating', 0) / 5.0) * 25
        
        # Reviews score (0-15) - normalized
        reviews = hospital.get('reviews_count', 0)
        score += min(reviews / 500, 1.0) * 15
        
        # Specialty match (0-30)
        if specialty:
            if specialty in hospital.get('specialties', []):
                score += 30
            elif any(specialty.lower() in s.lower() for s in hospital.get('specialties', [])):
                score += 15
        
        # Emergency availability (0-15)
        if needs_emergency:
            if hospital.get('emergency_available', False):
                score += 15
        
        # Distance score (0-15) - closer is better
        if user_coords and hospital.get('coordinates'):
            distance = self.calculate_distance(user_coords, hospital['coordinates'])
            if distance < float('inf'):
                # Max score for < 2km, decreasing for farther
                distance_score = max(0, 15 - (distance / 2) * 5)
                score += distance_score
        else:
            score += 7.5  # Default if no location
        
        return score
    
    def _calculate_doctor_score(self, doctor: Dict, specialty: Optional[str] = None,
                                min_experience: int = 0) -> float:
        """Calculate relevance score for a doctor"""
        score = 0.0
        
        # Rating score (0-30)
        score += (doctor.get('rating', 0) / 5.0) * 30
        
        # Reviews score (0-15)
        reviews = doctor.get('reviews_count', 0)
        score += min(reviews / 200, 1.0) * 15
        
        # Specialty match (0-35)
        if specialty:
            if specialty.lower() == doctor.get('specialty', '').lower():
                score += 35
            elif specialty.lower() in doctor.get('specialty', '').lower():
                score += 20
            elif specialty.lower() in doctor.get('bio', '').lower():
                score += 10
        
        # Experience score (0-20)
        experience = doctor.get('experience_years', 0)
        if experience >= min_experience:
            score += min(experience / 20, 1.0) * 20
        
        return score
    
    def get_hospitals(self, 
                     user_coords: Optional[Dict] = None,
                     specialty: Optional[str] = None,
                     needs_emergency: bool = False,
                     city: Optional[str] = None,
                     limit: int = 10) -> Dict:
        """Get recommended hospitals based on criteria"""
        
        filtered_hospitals = self.hospitals.copy()
        
        # Filter by city if provided
        if city:
            filtered_hospitals = [h for h in filtered_hospitals 
                                 if city.lower() in h.get('city', '').lower()]
        
        # Filter by emergency if required
        if needs_emergency:
            filtered_hospitals = [h for h in filtered_hospitals 
                                 if h.get('emergency_available', False)]
        
        # Filter by specialty if provided
        if specialty:
            filtered_hospitals = [h for h in filtered_hospitals 
                                 if specialty in h.get('specialties', []) or 
                                 any(specialty.lower() in s.lower() for s in h.get('specialties', []))]
        
        # Calculate scores and sort
        scored_hospitals = []
        for hospital in filtered_hospitals:
            score = self._calculate_hospital_score(hospital, user_coords, specialty, needs_emergency)
            hospital_copy = hospital.copy()
            hospital_copy['relevance_score'] = round(score, 2)
            
            # Add distance if coordinates provided
            if user_coords and hospital.get('coordinates'):
                distance = self.calculate_distance(user_coords, hospital['coordinates'])
                hospital_copy['distance_km'] = round(distance, 2)
            
            scored_hospitals.append(hospital_copy)
        
        # Sort by score descending
        scored_hospitals.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return {
            'success': True,
            'count': len(scored_hospitals[:limit]),
            'total': len(scored_hospitals),
            'hospitals': scored_hospitals[:limit]
        }
    
    def get_doctors(self,
                   specialty: Optional[str] = None,
                   hospital_id: Optional[str] = None,
                   min_experience: int = 0,
                   max_fee: Optional[int] = None,
                   limit: int = 10) -> Dict:
        """Get recommended doctors based on criteria"""
        
        filtered_doctors = self.doctors.copy()
        
        # Filter by hospital if provided
        if hospital_id:
            filtered_doctors = [d for d in filtered_doctors 
                               if d.get('hospital_id') == hospital_id]
        
        # Filter by specialty if provided
        if specialty:
            filtered_doctors = [d for d in filtered_doctors 
                               if specialty.lower() == d.get('specialty', '').lower() or
                               specialty.lower() in d.get('specialty', '').lower() or
                               specialty.lower() in d.get('bio', '').lower()]
        
        # Filter by experience
        if min_experience > 0:
            filtered_doctors = [d for d in filtered_doctors 
                               if d.get('experience_years', 0) >= min_experience]
        
        # Filter by fee
        if max_fee:
            filtered_doctors = [d for d in filtered_doctors 
                               if d.get('consultation_fee', 0) <= max_fee]
        
        # Calculate scores and sort
        scored_doctors = []
        for doctor in filtered_doctors:
            score = self._calculate_doctor_score(doctor, specialty, min_experience)
            doctor_copy = doctor.copy()
            doctor_copy['relevance_score'] = round(score, 2)
            scored_doctors.append(doctor_copy)
        
        # Sort by score descending
        scored_doctors.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return {
            'success': True,
            'count': len(scored_doctors[:limit]),
            'total': len(scored_doctors),
            'doctors': scored_doctors[:limit]
        }
    
    def get_recommendations_for_condition(self, condition: str, 
                                          user_coords: Optional[Dict] = None) -> Dict:
        """Get hospital and doctor recommendations based on detected condition"""
        
        # Map conditions to specialties
        condition_specialty_map = {
            'pneumonia': ['Pulmonology', 'General Medicine'],
            'lung_cancer': ['Oncology', 'Pulmonology'],
            'alzheimer': ['Neurology'],
            'mild_demented': ['Neurology', 'Psychiatry'],
            'moderate_demented': ['Neurology', 'Psychiatry'],
            'very_mild_demented': ['Neurology'],
            'non_demented': ['General Medicine'],
            'normal': ['General Medicine'],
            'benign': ['Oncology', 'Pulmonology'],
            'malignant': ['Oncology']
        }
        
        # Get relevant specialties
        condition_lower = condition.lower().replace(' ', '_')
        specialties = condition_specialty_map.get(condition_lower, ['General Medicine'])
        primary_specialty = specialties[0]
        
        # Get recommendations
        hospitals = self.get_hospitals(
            user_coords=user_coords,
            specialty=primary_specialty,
            limit=5
        )
        
        doctors = self.get_doctors(
            specialty=primary_specialty,
            limit=5
        )
        
        return {
            'success': True,
            'condition': condition,
            'recommended_specialty': primary_specialty,
            'all_relevant_specialties': specialties,
            'hospitals': hospitals['hospitals'],
            'doctors': doctors['doctors']
        }
    
    def get_all_specialties(self) -> Dict:
        """Get all available specialties"""
        return {
            'success': True,
            'specialties': self.specialties
        }
    
    def get_hospital_by_id(self, hospital_id: str) -> Dict:
        """Get hospital details by ID"""
        for hospital in self.hospitals:
            if hospital['id'] == hospital_id:
                return {
                    'success': True,
                    'hospital': hospital
                }
        return {
            'success': False,
            'error': 'Hospital not found'
        }
    
    def get_doctor_by_id(self, doctor_id: str) -> Dict:
        """Get doctor details by ID"""
        for doctor in self.doctors:
            if doctor['id'] == doctor_id:
                return {
                    'success': True,
                    'doctor': doctor
                }
        return {
            'success': False,
            'error': 'Doctor not found'
        }

# Create singleton instance
recommendation_engine = RecommendationEngine()
