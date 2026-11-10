"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      closeButton
      toastOptions={{
        style: {
          background: "#111316",
          color: "#F7F7F8",
          border: "1px solid #292C31",
          borderRadius: "12px",
          fontSize: "13px",
          boxShadow: "0 24px 60px -30px rgba(0,0,0,0.9)",
        },
        className: "buybiz-toast",
      }}
    />
  );
}
