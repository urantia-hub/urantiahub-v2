import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EmailOff } from "@/components/notices/EmailOff";
import { spanishOn } from "@/i18n/lang";
import { messages } from "@/i18n/messages";
import { ownPageMetadata } from "@/seo/metadata";

export const metadata: Metadata = ownPageMetadata(messages("es").notices.emailsTitle, "/emails");

// Where "Desactivar este correo" of a Spanish email goes.
export default function SpanishEmailsPage() {
  if (!spanishOn()) notFound();
  return (
    <div className="prose center">
      <h1>{messages("es").notices.emailsTitle}</h1>
      {/* The page reads `?off=` in the browser, so the server sends the frame only. */}
      <Suspense fallback={null}>
        <EmailOff lang="es" />
      </Suspense>
    </div>
  );
}
