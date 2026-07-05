"use client";

import { useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { toggleReportVisibilityAction } from "@/app/actions/my-reports-actions";

export function VisibilityToggle({
  id,
  isPublic,
}: {
  id: string;
  isPublic: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await toggleReportVisibilityAction({ id });
          if (res.ok) {
            toast.success(res.isPublic ? "Now public" : "Now private");
          } else {
            toast.error(res.error);
          }
        })
      }
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      title={isPublic ? "Make this report private (only you)" : "Make this report public (shareable link)"}
    >
      {isPublic ? (
        <Eye className="h-3 w-3" />
      ) : (
        <EyeOff className="h-3 w-3" />
      )}
      {isPublic ? "Public" : "Private"}
      {pending && <span className="ml-1 text-[10px]">…</span>}
    </button>
  );
}
