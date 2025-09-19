"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Star,
  Phone,
  Clock,
  Filter,
  Building2,
  Stethoscope,
  Heart,
  ChevronDown,
  Navigation,
  Calendar,
  Award,
  Users,
  DollarSign,
  CheckCircle,
  X,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import toast from "react-hot-toast";

interface Hospital {
  id: string;
  name: string;
  type: string;
  address: string;
  distance: string;
  rating: number;
  reviews: number;
  specialties: string[];
  phone: string;
  hours: string;
  image: string;
  verified: boolean;
  beds: number;
  emergency: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  experience: string;
  rating: number;
  reviews: number;
  available: boolean;
  nextAvailable: string;
  consultationFee: number;
  image: string;
  languages: string[];
  education: string;
}

const specialties = [
  "All Specialties",
  "Cardiology",
  "Neurology",
  "Pulmonology",
  "Oncology",
  "Radiology",
  "General Medicine",
  "Pediatrics",
  "Orthopedics",
  "Dermatology",
];

export default function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState<"hospitals" | "doctors">("hospitals");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All Specialties");
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Hospital | Doctor | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    rating: 0,
    distance: 50,
    available: false,
  });

  useEffect(() => {
    fetchRecommendations();
  }, [activeTab, selectedSpecialty, filters]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const endpoint =
        activeTab === "hospitals"
          ? "http://localhost:5000/api/recommendations/hospitals"
          : "http://localhost:5000/api/recommendations/doctors";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          specialty: selectedSpecialty,
          query: searchQuery,
          filters: filters,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        if (activeTab === "hospitals") {
          setHospitals(data.hospitals || []);
        } else {
          setDoctors(data.doctors || []);
        }
      }
    } catch (error) {
      // Use mock data for demo
      if (activeTab === "hospitals") {
        setHospitals(mockHospitals);
      } else {
        setDoctors(mockDoctors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const mockHospitals: Hospital[] = [
    {
      id: "1",
      name: "City Medical Center",
      type: "Multi-Specialty Hospital",
      address: "123 Healthcare Ave, Medical District",
      distance: "2.5 km",
      rating: 4.8,
      reviews: 1250,
      specialties: ["Cardiology", "Neurology", "Oncology"],
      phone: "+1 (555) 123-4567",
      hours: "24/7",
      image: "🏥",
      verified: true,
      beds: 500,
      emergency: true,
    },
    {
      id: "2",
      name: "HealthFirst Hospital",
      type: "General Hospital",
      address: "456 Wellness Blvd, Health Park",
      distance: "4.2 km",
      rating: 4.6,
      reviews: 890,
      specialties: ["General Medicine", "Pediatrics", "Orthopedics"],
      phone: "+1 (555) 234-5678",
      hours: "24/7",
      image: "🏥",
      verified: true,
      beds: 350,
      emergency: true,
    },
    {
      id: "3",
      name: "Sunrise Medical Institute",
      type: "Research Hospital",
      address: "789 Research Dr, Innovation Hub",
      distance: "6.8 km",
      rating: 4.9,
      reviews: 2100,
      specialties: ["Oncology", "Neurology", "Radiology"],
      phone: "+1 (555) 345-6789",
      hours: "24/7",
      image: "🏥",
      verified: true,
      beds: 800,
      emergency: true,
    },
  ];

  const mockDoctors: Doctor[] = [
    {
      id: "1",
      name: "Dr. Sarah Johnson",
      specialty: "Cardiology",
      hospital: "City Medical Center",
      experience: "15 years",
      rating: 4.9,
      reviews: 420,
      available: true,
      nextAvailable: "Today, 3:00 PM",
      consultationFee: 150,
      image: "👩‍⚕️",
      languages: ["English", "Spanish"],
      education: "MD - Harvard Medical School",
    },
    {
      id: "2",
      name: "Dr. Michael Chen",
      specialty: "Neurology",
      hospital: "Sunrise Medical Institute",
      experience: "20 years",
      rating: 4.8,
      reviews: 380,
      available: true,
      nextAvailable: "Tomorrow, 10:00 AM",
      consultationFee: 200,
      image: "👨‍⚕️",
      languages: ["English", "Mandarin"],
      education: "MD - Johns Hopkins University",
    },
    {
      id: "3",
      name: "Dr. Emily Williams",
      specialty: "Pulmonology",
      hospital: "HealthFirst Hospital",
      experience: "12 years",
      rating: 4.7,
      reviews: 290,
      available: false,
      nextAvailable: "Jan 22, 2:00 PM",
      consultationFee: 175,
      image: "👩‍⚕️",
      languages: ["English", "French"],
      education: "MD - Stanford University",
    },
  ];

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.specialties.some((s) =>
        s.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  const filteredDoctors = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <span className="inline-block px-4 py-2 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 text-sm font-medium mb-4">
              Smart Healthcare Discovery
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-800 dark:text-white mb-4">
              Find the Best{" "}
              <span className="gradient-text">Healthcare</span> Near You
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Our AI-powered recommendation system helps you discover top-rated hospitals and doctors tailored to your needs.
            </p>
          </motion.div>

          {/* Search and Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 mb-8"
          >
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search ${activeTab}...`}
                  className="w-full pl-12 pr-4 py-4 bg-slate-100 dark:bg-slate-700 rounded-xl outline-none text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Specialty Select */}
              <div className="relative">
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="appearance-none w-full lg:w-48 px-4 py-4 bg-slate-100 dark:bg-slate-700 rounded-xl outline-none text-slate-800 dark:text-white focus:ring-2 focus:ring-primary-500 cursor-pointer"
                >
                  {specialties.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              </div>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-6 py-4 rounded-xl transition-all ${
                  showFilters
                    ? "bg-primary-500 text-white"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                <Filter size={20} />
                Filters
              </button>

              {/* Location Button */}
              <button className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:shadow-lg hover:shadow-primary-500/30 transition-all">
                <MapPin size={20} />
                Near Me
              </button>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700"
                >
                  <div className="grid md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Minimum Rating
                      </label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() =>
                              setFilters({ ...filters, rating: star })
                            }
                            className={`p-2 rounded-lg transition-colors ${
                              filters.rating >= star
                                ? "text-yellow-400"
                                : "text-slate-300"
                            }`}
                          >
                            <Star
                              size={24}
                              fill={filters.rating >= star ? "currentColor" : "none"}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Distance: {filters.distance} km
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="100"
                        value={filters.distance}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            distance: parseInt(e.target.value),
                          })
                        }
                        className="w-full accent-primary-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.available}
                          onChange={(e) =>
                            setFilters({
                              ...filters,
                              available: e.target.checked,
                            })
                          }
                          className="w-5 h-5 rounded accent-primary-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300">
                          Available Today
                        </span>
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setActiveTab("hospitals")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === "hospitals"
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Building2 size={20} />
              Hospitals
            </button>
            <button
              onClick={() => setActiveTab("doctors")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === "doctors"
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              <Stethoscope size={20} />
              Doctors
            </button>
          </div>

          {/* Results */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* List */}
            <div className="lg:col-span-2 space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeTab === "hospitals" ? (
                filteredHospitals.map((hospital, index) => (
                  <motion.div
                    key={hospital.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedItem(hospital)}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border cursor-pointer transition-all hover:shadow-xl ${
                      selectedItem?.id === hospital.id
                        ? "border-primary-500 ring-2 ring-primary-500/20"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 flex items-center justify-center text-4xl">
                        {hospital.image}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              {hospital.name}
                              {hospital.verified && (
                                <CheckCircle className="w-5 h-5 text-blue-500" />
                              )}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                              {hospital.type}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium text-yellow-700 dark:text-yellow-400">
                              {hospital.rating}
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {hospital.specialties.slice(0, 3).map((specialty) => (
                            <span
                              key={specialty}
                              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-sm text-slate-600 dark:text-slate-300"
                            >
                              {specialty}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {hospital.distance}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {hospital.hours}
                          </span>
                          {hospital.emergency && (
                            <span className="flex items-center gap-1 text-red-500">
                              <Heart size={14} />
                              Emergency
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                filteredDoctors.map((doctor, index) => (
                  <motion.div
                    key={doctor.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => setSelectedItem(doctor)}
                    className={`bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border cursor-pointer transition-all hover:shadow-xl ${
                      selectedItem?.id === doctor.id
                        ? "border-primary-500 ring-2 ring-primary-500/20"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-accent-100 to-primary-100 dark:from-accent-900/30 dark:to-primary-900/30 flex items-center justify-center text-4xl">
                        {doctor.image}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                              {doctor.name}
                            </h3>
                            <p className="text-primary-600 dark:text-primary-400 font-medium">
                              {doctor.specialty}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="font-medium text-yellow-700 dark:text-yellow-400">
                              {doctor.rating}
                            </span>
                          </div>
                        </div>
                        <p className="mt-1 text-slate-500 dark:text-slate-400">
                          {doctor.hospital}
                        </p>
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Award size={14} />
                            {doctor.experience}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${
                              doctor.available
                                ? "text-green-500"
                                : "text-slate-400"
                            }`}
                          >
                            <Clock size={14} />
                            {doctor.nextAvailable}
                          </span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <DollarSign size={14} />${doctor.consultationFee}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Details Panel */}
            <div className="hidden lg:block">
              <div className="sticky top-24">
                <AnimatePresence mode="wait">
                  {selectedItem ? (
                    <motion.div
                      key={selectedItem.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700"
                    >
                      {"type" in selectedItem ? (
                        // Hospital Details
                        <>
                          <div className="text-center mb-6">
                            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 dark:from-primary-900/30 dark:to-accent-900/30 flex items-center justify-center text-5xl">
                              {selectedItem.image}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                              {selectedItem.name}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400">
                              {selectedItem.type}
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                              <MapPin className="w-5 h-5 text-primary-500" />
                              <span className="text-slate-600 dark:text-slate-300">
                                {selectedItem.address}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                              <Phone className="w-5 h-5 text-primary-500" />
                              <span className="text-slate-600 dark:text-slate-300">
                                {selectedItem.phone}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                              <Users className="w-5 h-5 text-primary-500" />
                              <span className="text-slate-600 dark:text-slate-300">
                                {selectedItem.beds} Beds Available
                              </span>
                            </div>
                          </div>

                          <div className="mt-6">
                            <h4 className="font-medium text-slate-800 dark:text-white mb-3">
                              Specialties
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedItem.specialties.map((specialty) => (
                                <span
                                  key={specialty}
                                  className="px-3 py-1 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm"
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-6 flex gap-3">
                            <button className="flex-1 btn-primary flex items-center justify-center gap-2">
                              <Calendar size={18} />
                              Book Visit
                            </button>
                            <button className="p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary-500 transition-colors">
                              <Navigation size={20} />
                            </button>
                          </div>
                        </>
                      ) : (
                        // Doctor Details
                        <>
                          <div className="text-center mb-6">
                            <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-accent-100 to-primary-100 dark:from-accent-900/30 dark:to-primary-900/30 flex items-center justify-center text-5xl">
                              {selectedItem.image}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                              {selectedItem.name}
                            </h3>
                            <p className="text-primary-600 dark:text-primary-400 font-medium">
                              {selectedItem.specialty}
                            </p>
                          </div>

                          <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                              <Building2 className="w-5 h-5 text-primary-500" />
                              <span className="text-slate-600 dark:text-slate-300">
                                {selectedItem.hospital}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                              <Award className="w-5 h-5 text-primary-500" />
                              <span className="text-slate-600 dark:text-slate-300">
                                {selectedItem.education}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                              <Clock className="w-5 h-5 text-primary-500" />
                              <span className="text-slate-600 dark:text-slate-300">
                                {selectedItem.experience} experience
                              </span>
                            </div>
                          </div>

                          <div className="mt-6">
                            <h4 className="font-medium text-slate-800 dark:text-white mb-3">
                              Languages
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedItem.languages.map((lang) => (
                                <span
                                  key={lang}
                                  className="px-3 py-1 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-600 dark:text-accent-400 text-sm"
                                >
                                  {lang}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-slate-600 dark:text-slate-300">
                                Consultation Fee
                              </span>
                              <span className="text-2xl font-bold text-slate-800 dark:text-white">
                                ${selectedItem.consultationFee}
                              </span>
                            </div>
                            <p className="text-sm text-green-600 dark:text-green-400">
                              Next available: {selectedItem.nextAvailable}
                            </p>
                          </div>

                          <button className="w-full mt-6 btn-primary flex items-center justify-center gap-2">
                            <Calendar size={18} />
                            Book Appointment
                          </button>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 text-center"
                    >
                      <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Search className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">
                        Select a {activeTab === "hospitals" ? "hospital" : "doctor"} to view details
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
