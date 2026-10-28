import {
  Activity, BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap, History, House, KeyRound, Layers, ListTodo,
  MailCheck, Megaphone, MessagesSquare, Receipt, School, ScanLine, Settings, Sparkles, UserSearch, Users, UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { IconoMosaico } from "@/lib/navegacion";

/** Íconos de la plataforma (super administrador) además de los del colegio. */
export type IconoPlataforma = "Layers" | "KeyRound" | "Receipt" | "UserSearch" | "Activity" | "UsersRound" | "History";

/** Íconos de navegación importados uno por uno (no `import *`) para no inflar el bundle del cliente. */
export const ICONOS_NAV: Record<IconoMosaico | IconoPlataforma | "House", LucideIcon> = {
  Activity, BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap, History, House, KeyRound, Layers, ListTodo,
  MailCheck, Megaphone, MessagesSquare, Receipt, School, ScanLine, Settings, Sparkles, UserSearch, Users, UsersRound,
};
