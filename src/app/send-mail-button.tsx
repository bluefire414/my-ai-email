"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { sendBriefAction } from "./actions";

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent"; to: string; saveError?: string }
  | { state: "error"; message: string };

export function SendMailButton() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function send() {
    setStatus({ state: "sending" });

    try {
      const result = await sendBriefAction();

      setStatus(
        result.ok
          ? { state: "sent", to: result.to, saveError: result.saveError }
          : { state: "error", message: result.error },
      );

      // The page reads from the archive, so pull in the mail we just stored.
      if (result.ok && result.saved) router.refresh();
    } catch (error) {
      setStatus({
        state: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={send}
        disabled={status.state === "sending"}
        className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
      >
        {status.state === "sending" ? "寄送中…" : "寄給我"}
      </button>

      {status.state === "sent" && (
        <span className="text-xs text-green-600 dark:text-green-400">
          已寄出至 {status.to}
          {status.saveError && (
            <span className="text-amber-600 dark:text-amber-400">（存檔失敗）</span>
          )}
        </span>
      )}
      {status.state === "error" && (
        <span className="max-w-60 text-right text-xs text-red-600 dark:text-red-400">
          寄送失敗：{status.message}
        </span>
      )}
    </div>
  );
}
