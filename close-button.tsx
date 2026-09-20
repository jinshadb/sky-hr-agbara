"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeTicket } from "@/app/actions/tickets";

export default function CloseButton({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="btn-danger"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await closeTicket(ticketId);
          router.refresh();
        })
      }
    >
      {pending ? "Closing…" : "Close ticket"}
    </button>
  );
}
