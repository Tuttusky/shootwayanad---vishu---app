"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RegistrationForm } from "@/components/RegistrationForm";

function FormWithParams() {
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  return <RegistrationForm initialAgeCategory={category} />;
}

export default function FormPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[max(884px,100dvh)] bg-background text-on-background">
          <div className="mx-auto max-w-md px-4 pt-24 text-center text-sm text-on-background/75">
            Loading form…
          </div>
        </div>
      }
    >
      <FormWithParams />
    </Suspense>
  );
}
