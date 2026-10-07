import { initAnalytics } from "@/analytics";

// Next.js runs this file before the app hydrates. PostHog itself loads later, when the page is idle.
initAnalytics();
