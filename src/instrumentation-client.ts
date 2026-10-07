import { initAnalytics } from "@/analytics";
import { initMonitoring } from "@/monitoring";

// Next.js runs this file before the app hydrates. Both libraries load later, when the page is idle.
initMonitoring();
initAnalytics();
