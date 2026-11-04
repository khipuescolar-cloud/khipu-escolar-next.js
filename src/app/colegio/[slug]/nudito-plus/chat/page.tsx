import { redirect } from "next/navigation";

/** Nudito+ (specs/29) pasó a ser el tutor Nudito de Khipu Pro (specs/41): `/nudito-plus/chat` → `/nudito`. */
export default function NuditoPlusChatPage() {
  redirect("/nudito");
}
