"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteReportAction } from "@/app/actions/my-reports-actions";

export function DeleteReportButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-red-600 dark:hover:text-red-400"
      >
        <Trash2 className="h-3 w-3" />
        Delete
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await deleteReportAction({ id });
            if (res.ok) {
              toast.success("Report deleted");
            } else {
              toast.error(res.error);
              setConfirming(false);
            }
          })
        }
        className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-500/20 disabled:opacity-50 dark:text-red-400"
      >
        {pending ? "Deleting…" : "Confirm delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:underline disabled:opacity-50"
      >
        Cancel
      </button>
    </span>
  );
}
