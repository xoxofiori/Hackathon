import { AlertCircle, CheckCircle2 } from "lucide-react";

export function FormMessage({ error, message }: { error?: string | null; message?: string | null }) {
  if (!error && !message) return null;
  return error ? (
    <p role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <AlertCircle className="mt-0.5 size-4 shrink-0" /> {error}
    </p>
  ) : (
    <p role="status" className="flex items-start gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
      <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {message}
    </p>
  );
}
