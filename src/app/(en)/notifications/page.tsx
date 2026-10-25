import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NotificationsView } from "@/components/notices/NotificationsView";
import { ownPageMetadata } from "@/seo/metadata";

// A reader's own page. It stays out of each search engine, at each index setting.
export const metadata: Metadata = ownPageMetadata("Notifications", "/notifications");

// Off until the notices can be sent.
export default function NotificationsPage() {
  if (process.env.NEXT_PUBLIC_NOTICES !== "on") notFound();
  return <NotificationsView />;
}
