import {
  Activity, BarChart3, Bell, BookOpen, CalendarClock, CalendarDays, ClipboardCheck, FileText, FolderOpen, GraduationCap, History, House, Inbox, KeyRound, Layers, LifeBuoy, ListTodo,
  MailCheck, Megaphone, MessagesSquare, Receipt, School, ScanLine, Settings, Sparkles, TriangleAlert, UserSearch, Users, UsersRound,
  type LucideIcon,
} from "lucide-react";
import type { IconoMosaico } from "@/lib/navegacion";

/** Íconos de la plataforma (super administrador) además de los del colegio. */
export type IconoPlataforma = "LifeBuoy" | "Layers" | "KeyRound" | "Receipt" | "UserSearch" | "Activity" | "UsersRound" | "History" | "Inbox";

/** Íconos de navegación importados uno por uno (no `import *`) para no inflar el bundle del cliente. */
export const ICONOS_NAV: Record<IconoMosaico | IconoPlataforma | "House", LucideIcon> = {
  Activity, BarChart3, Bell, BookOpen, CalendarClock, CalendarDays, ClipboardCheck, FileText, FolderOpen, GraduationCap, History, House, Inbox, KeyRound, Layers, LifeBuoy, ListTodo,
  MailCheck, Megaphone, MessagesSquare, Receipt, School, ScanLine, Settings, Sparkles, TriangleAlert, UserSearch, Users, UsersRound,
};
