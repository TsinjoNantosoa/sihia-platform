import {
  BarChart3,
  Briefcase,
  Building2,
  GraduationCap,
  HelpCircle,
  Phone,
  Rocket,
  Target,
  Trophy,
  TrendingUp,
  Users,
  Globe,
  Handshake,
  type LucideIcon,
} from "lucide-react";

export type SuggestionIconKey =
  | "briefcase"
  | "rocket"
  | "chart"
  | "building"
  | "bar-chart"
  | "target"
  | "users"
  | "graduation"
  | "trophy"
  | "globe"
  | "handshake"
  | "help"
  | "phone";

const ICONS: Record<SuggestionIconKey, LucideIcon> = {
  briefcase: Briefcase,
  rocket: Rocket,
  chart: TrendingUp,
  building: Building2,
  "bar-chart": BarChart3,
  target: Target,
  users: Users,
  graduation: GraduationCap,
  trophy: Trophy,
  globe: Globe,
  handshake: Handshake,
  help: HelpCircle,
  phone: Phone,
};

export function SuggestionIcon({
  name,
  className = "size-3.5",
}: {
  name: SuggestionIconKey;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} aria-hidden />;
}
