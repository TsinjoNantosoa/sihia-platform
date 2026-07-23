// Données mockées réalistes pour SIH IA.
import type {
  Alert,
  Appointment,
  Doctor,
  Patient,
  PredictionPoint,
  RbacUser,
} from "./types";

const FIRST_NAMES_M = ["Yassine", "Omar", "Karim", "Hicham", "Mehdi", "Adam", "Rayan", "Anas", "Sami", "Nabil"];
const FIRST_NAMES_F = ["Salma", "Imane", "Nora", "Lina", "Sara", "Hiba", "Yasmine", "Amina", "Aya", "Fatima"];
const LAST_NAMES = ["Bennani", "Kadri", "Touzani", "El Idrissi", "Mansouri", "Benali", "Cherkaoui", "Alaoui", "Berrada", "Saidi", "Ziani", "Lahlou"];
const SPECIALTIES = ["Cardiologie", "Pédiatrie", "Médecine générale", "Chirurgie", "Radiologie", "Gynécologie", "Neurologie", "Ophtalmologie", "Dermatologie", "Urgences"];
const REASONS = ["Consultation de routine", "Suivi post-opératoire", "Douleurs thoraciques", "Bilan annuel", "Vaccination", "Ordonnance", "Échographie", "Contrôle tension", "Consultation pédiatrique", "Examen pré-opératoire"];
const ADDRESSES = ["12 rue de la Liberté, Casablanca", "45 av. Hassan II, Rabat", "8 bd Mohammed V, Marrakech", "23 rue de France, Tanger", "67 av. Ibn Sina, Fès"];

const seed = (i: number) => ((i * 9301 + 49297) % 233280) / 233280;
const pick = <T,>(arr: T[], i: number) => arr[Math.floor(seed(i) * arr.length)];

const today = new Date();
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export const PATIENTS: Patient[] = Array.from({ length: 48 }, (_, i) => {
  const isMale = i % 2 === 0;
  const firstName = isMale ? pick(FIRST_NAMES_M, i + 1) : pick(FIRST_NAMES_F, i + 7);
  const lastName = pick(LAST_NAMES, i + 3);
  const ageYears = 5 + Math.floor(seed(i + 11) * 75);
  const dob = new Date(today.getFullYear() - ageYears, (i * 3) % 12, ((i * 7) % 27) + 1);
  const lastVisit = addDays(today, -Math.floor(seed(i + 17) * 60));
  return {
    id: `p-${1000 + i}`,
    recordNumber: `PT-${(847000 + i * 13).toString().padStart(6, "0")}`,
    firstName,
    lastName,
    dob: isoDate(dob),
    gender: isMale ? "M" : "F",
    phone: `+212 6${String(10000000 + i * 137).slice(0, 8)}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s/g, "")}@mail.com`,
    address: pick(ADDRESSES, i + 5),
    bloodType: (["A+", "O+", "B+", "AB+", "A-", "O-"] as const)[i % 6],
    allergies: i % 5 === 0 ? ["Pénicilline"] : i % 7 === 0 ? ["Arachides", "Lactose"] : [],
    insurance: i % 3 === 0 ? "CNSS" : i % 3 === 1 ? "CNOPS" : "Privée",
    status: i % 11 === 0 ? "admitted" : i % 9 === 0 ? "inactive" : "active",
    lastVisit: isoDate(lastVisit),
  };
});

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export const DOCTORS: Doctor[] = Array.from({ length: 14 }, (_, i) => {
  const firstName = i % 2 === 0 ? pick(FIRST_NAMES_M, i + 2) : pick(FIRST_NAMES_F, i + 4);
  const lastName = pick(LAST_NAMES, i + 1);
  return {
    id: `d-${100 + i}`,
    firstName,
    lastName,
    specialty: pick(SPECIALTIES, i),
    phone: `+212 5${String(20000000 + i * 211).slice(0, 8)}`,
    email: `dr.${lastName.toLowerCase().replace(/\s/g, "")}@sihia.health`,
    availability: i % 3 === 0 ? "busy" : i % 5 === 0 ? "off" : "available",
    patientsCount: 40 + Math.floor(seed(i + 3) * 180),
    weeklyAppointments: 8 + Math.floor(seed(i + 9) * 32),
    satisfaction: 4 + Math.round(seed(i + 13) * 10) / 10,
    schedule: DAYS.map((day, di) => ({
      day,
      slots: di < 5 ? ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"] : di === 5 ? ["09:00", "10:00", "11:00"] : [],
    })),
  };
});

export const APPOINTMENTS: Appointment[] = Array.from({ length: 36 }, (_, i) => {
  const patient = PATIENTS[i % PATIENTS.length];
  const doctor = DOCTORS[i % DOCTORS.length];
  const dayOffset = (i % 14) - 3; // -3 à +10
  const hour = 8 + (i % 9);
  const date = addDays(today, dayOffset);
  date.setHours(hour, (i % 4) * 15, 0, 0);
  const status: Appointment["status"] =
    dayOffset < 0
      ? i % 4 === 0
        ? "noshow"
        : "completed"
      : dayOffset === 0
        ? i % 3 === 0
          ? "confirmed"
          : "scheduled"
        : i % 5 === 0
          ? "cancelled"
          : "scheduled";
  return {
    id: `a-${5000 + i}`,
    patientId: patient.id,
    patientName: `${patient.firstName} ${patient.lastName}`,
    doctorId: doctor.id,
    doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
    date: date.toISOString(),
    durationMin: 30,
    reason: pick(REASONS, i),
    status,
  };
});

export const PREDICTION_7D: PredictionPoint[] = Array.from({ length: 14 }, (_, i) => {
  const date = addDays(today, i - 6);
  const base = 60 + Math.round(Math.sin(i / 2) * 12 + seed(i + 3) * 14);
  if (i <= 6) return { date: isoDate(date), actual: base };
  const forecast = base + Math.round(seed(i + 17) * 18 - 4);
  return {
    date: isoDate(date),
    forecast,
    upper: forecast + 8,
    lower: Math.max(0, forecast - 8),
  };
});

export const ALERTS: Alert[] = [
  {
    id: "al-1",
    level: "critical",
    title: "Surcharge prévue en Réanimation",
    description: "Capacité dépassera 105% dans 24h selon le modèle LSTM.",
    area: "Réanimation Nord",
    createdAt: new Date(today.getTime() - 4 * 60000).toISOString(),
  },
  {
    id: "al-2",
    level: "warning",
    title: "Stock Propofol faible",
    description: "Seuil critique atteint, réapprovisionnement sous 48h.",
    area: "Pharmacie centrale",
    createdAt: new Date(today.getTime() - 60 * 60000).toISOString(),
  },
  {
    id: "al-3",
    level: "warning",
    title: "Pic d'admissions Pédiatrie",
    description: "+38% d'admissions prévues vendredi.",
    area: "Pédiatrie",
    createdAt: new Date(today.getTime() - 2 * 60 * 60000).toISOString(),
  },
];

export const RBAC_USERS: RbacUser[] = [
  { id: "u-1", name: "Dr. A. Benali", email: "a.benali@sihia.health", role: "doctor", status: "active", lastLogin: new Date(today.getTime() - 12 * 60000).toISOString() },
  { id: "u-2", name: "K. Touzani", email: "k.touzani@sihia.health", role: "admin", status: "active", lastLogin: new Date(today.getTime() - 3 * 3600000).toISOString() },
  { id: "u-3", name: "S. Berrada", email: "s.berrada@sihia.health", role: "manager", status: "active", lastLogin: new Date(today.getTime() - 24 * 3600000).toISOString() },
  { id: "u-4", name: "I. Lahlou", email: "i.lahlou@sihia.health", role: "staff", status: "suspended", lastLogin: new Date(today.getTime() - 6 * 24 * 3600000).toISOString() },
  { id: "u-5", name: "Dr. F. Mansouri", email: "f.mansouri@sihia.health", role: "doctor", status: "active", lastLogin: new Date(today.getTime() - 45 * 60000).toISOString() },
];
