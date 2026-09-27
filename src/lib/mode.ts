/**
 * Demo mode is the default: the app runs with no Supabase and no environment
 * variables, using built-in sample data stored in the browser.
 * Set ACCORD_MODE=live (with the Supabase variables) to use the real backend.
 */
export function isDemoMode(): boolean {
  return (process.env.ACCORD_MODE ?? "demo").trim().toLowerCase() !== "live";
}
