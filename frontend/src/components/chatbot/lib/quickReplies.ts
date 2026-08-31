import type { Reply } from "../components/QuickReplies";

/** Libellés UI + requêtes canoniques alignées sur `chatbot_knowledge.json`. */
export const QUICK_REPLIES_FR: Reply[] = [
  {
    icon: "handshake",
    label: "Prendre un rendez-vous",
    query: "Comment prendre un rendez-vous ?",
  },
  {
    icon: "building",
    label: "Services et spécialités",
    query: "Quels services et spécialités sont disponibles ?",
  },
  {
    icon: "globe",
    label: "Horaires d'accueil",
    query: "Quels sont les horaires d'accueil et des urgences ?",
  },
  {
    icon: "phone",
    label: "Contact",
    query: "Comment contacter l'hôpital ?",
  },
];

export const QUICK_REPLIES_EN: Reply[] = [
  {
    icon: "handshake",
    label: "Book an appointment",
    query: "How do I book an appointment?",
  },
  {
    icon: "building",
    label: "Departments & specialties",
    query: "Which departments and specialties are available?",
  },
  {
    icon: "globe",
    label: "Opening hours",
    query: "What are reception and emergency hours?",
  },
  {
    icon: "phone",
    label: "Contact",
    query: "How can I contact the hospital?",
  },
];

export function quickRepliesForLang(lang: "fr" | "en"): Reply[] {
  return lang === "fr" ? QUICK_REPLIES_FR : QUICK_REPLIES_EN;
}
