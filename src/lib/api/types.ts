// Types domaines SIH IA — partagés entre services et UI.

export type Gender = "M" | "F";

export interface Patient {
  id: string;
  recordNumber: string;
  firstName: string;
  lastName: string;
  dob: string; // ISO date
  gender: Gender;
  phone: string;
  email?: string;
  address: string;
  bloodType: "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
  allergies: string[];
  insurance?: string;
  status: "active" | "inactive" | "admitted";
  lastVisit?: string;
}

export interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  phone: string;
  email: string;
  availability: "available" | "busy" | "off";
  patientsCount: number;
  weeklyAppointments: number;
  satisfaction: number;
  schedule: { day: string; slots: string[] }[];
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "noshow";

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: string; // ISO datetime
  durationMin: number;
  reason: string;
  status: AppointmentStatus;
}

export interface KpiPoint {
  label: string;
  value: number;
}

export interface PredictionPoint {
  date: string; // ISO date
  actual?: number;
  forecast?: number;
  upper?: number;
  lower?: number;
}

export interface Alert {
  id: string;
  level: "critical" | "warning" | "info";
  title: string;
  description: string;
  area: string;
  createdAt: string;
}

export interface RbacUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "doctor" | "staff" | "manager";
  status: "active" | "suspended";
  lastLogin: string;
}
