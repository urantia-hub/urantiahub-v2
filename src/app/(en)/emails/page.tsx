import type { Metadata } from "next";
import { Suspense } from "react";
import { EmailOff } from "@/components/notices/EmailOff";
import { ownPageMetadata } from "@/seo/metadata";

export const metadata: Metadata = ownPageMetadata("Emails", "/emails");

// Where "Turn this email off" goes, and where the "unsubscribe" link of an email of the old Hub goes.
// Each statement here must be true of the live site: change it in the same change that changes an email.
export default function EmailsPage() {
  return (
    <div className="prose center">
      <h1>Emails</h1>
      {/* The page reads `?off=` in the browser, so the server sends the frame only. */}
      <Suspense fallback={null}>
        <EmailOff />
      </Suspense>
    </div>
  );
}
