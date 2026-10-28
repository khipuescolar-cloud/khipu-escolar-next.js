import {
  BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap, House, ListTodo, MailCheck, Megaphone,
  MessagesSquare, School, ScanLine, Settings, Sparkles, Users, type LucideIcon,
} from "lucide-react";
import type { IconoMosaico } from "@/lib/navegacion";

/** Íconos de navegación importados uno por uno (no `import *`) para no inflar el bundle del cliente. */
export const ICONOS_NAV: Record<IconoMosaico | "House", LucideIcon> = {
  BookOpen, CalendarDays, ClipboardCheck, FileText, GraduationCap, House, ListTodo, MailCheck, Megaphone,
  MessagesSquare, School, ScanLine, Settings, Sparkles, Users,
};
