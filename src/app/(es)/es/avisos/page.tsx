import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotificationsView } from "@/components/notices/NotificationsView";
import { spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { ownPageMetadata } from "@/seo/metadata";

export const metadata: Metadata = ownPageMetadata(messages("es").notices.title, "/notifications");

// The notices of the reader in Spanish. Off until the notices can be sent.
export default function SpanishNotificationsPage() {
  if (!spanishOn() || process.env.NEXT_PUBLIC_NOTICES !== "on") notFound();
  return <NotificationsView lang="es" />;
}
