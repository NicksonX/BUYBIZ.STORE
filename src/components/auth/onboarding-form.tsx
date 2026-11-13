"use client";

import { useActionState, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Database,
  FlaskConical,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { onboardingAction } from "@/server/actions/auth";
import { initialActionState } from "@/lib/validation/action-state";
import { PROXY_USE_CASES, type ProxyUseCase } from "@/lib/onboarding";
import { Alert } from "@/components/ui/alert";
import { Field, Input } from "@/components/ui/input";
import { TutorialVideo } from "@/components/tutorial/tutorial-video";
import { cn } from "@/lib/utils";

const icons: Record<ProxyUseCase, LucideIcon> = {
  social_media: Megaphone,
  scraping: Database,
  business: BriefcaseBusiness,
  automation: Workflow,
  research: FlaskConical,
  other: MoreHorizontal,
};

export function OnboardingForm({
  currentUsername,
  needsUsername,
  next,
  initialUseCase,
}: {
  currentUsername: string;
  needsUsername: boolean;
  next?: string;
  initialUseCase?: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    onboardingAction,
    initialActionState,
  );
  const [selected, setSelected] = useState<ProxyUseCase | "">(
    (initialUseCase as ProxyUseCase | undefined) ?? "",
  );

  return (
    <div>
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A0B0D]/35">
          Welcome to BUYBIZ
        </p>
        <h1 className="mt-2 text-[28px] font-semibold leading-[1.04] tracking-[-0.045em] text-[#0A0B0D] sm:text-[32px]">
          What will you use proxies for?
        </h1>
        <p className="mt-2 text-[12px] leading-5 text-[#0A0B0D]/50">
          Pick the closest fit. It helps us keep BUYBIZ focused on what you
          actually need.
        </p>
      </div>

      {state.message && state.status === "error" ? (
        <Alert tone="danger" className="mb-5">
          {state.message}
        </Alert>
      ) : null}

      <form action={formAction} className="space-y-5">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {!needsUsername ? (
          <input type="hidden" name="username" value={currentUsername} />
        ) : null}

        <fieldset>
          <legend className="sr-only">Intended proxy use case</legend>
          <div className="grid grid-cols-2 gap-2">
            {PROXY_USE_CASES.map((useCase) => {
              const Icon = icons[useCase.value];
              const active = selected === useCase.value;
              return (
                <label
                  key={useCase.value}
                  className={cn(
                    "relative cursor-pointer rounded-[11px] border p-3 transition-all",
                    active
                      ? "border-[#0A0B0D] bg-[#0A0B0D] text-white shadow-sm"
                      : "border-black/[0.09] bg-white text-[#0A0B0D] hover:border-black/25",
                  )}
                >
                  <input
                    type="radio"
                    name="useCase"
                    value={useCase.value}
                    checked={active}
                    onChange={() => setSelected(useCase.value)}
                    className="sr-only"
                    required
                  />
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-white/65" : "text-[#0A0B0D]/35",
                    )}
                  />
                  <span
                    className={cn(
                      "mt-3 block text-[11px] font-semibold leading-4",
                      active ? "text-white" : "text-[#0A0B0D]",
                    )}
                  >
                    {useCase.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[9px] leading-3.5",
                      active ? "text-white/40" : "text-[#0A0B0D]/40",
                    )}
                  >
                    {useCase.description}
                  </span>
                </label>
              );
            })}
          </div>
          {state.fieldErrors?.useCase ? (
            <p className="mt-2 text-[10px] text-danger">
              {state.fieldErrors.useCase}
            </p>
          ) : null}
        </fieldset>

        {needsUsername ? (
          <Field
            label="Choose a username"
            htmlFor="username"
            hint="3 to 24 letters, numbers or _"
            error={state.fieldErrors?.username}
          >
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="e.g. zainab_b"
              defaultValue={currentUsername.startsWith("user_") ? "" : currentUsername}
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9_]+"
              aria-invalid={Boolean(state.fieldErrors?.username)}
            />
          </Field>
        ) : null}

        <TutorialVideo />

        <button
          type="submit"
          disabled={pending || !selected}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0A0B0D] text-[12px] font-semibold text-white transition-colors hover:bg-[#1A1C1F] disabled:cursor-not-allowed disabled:opacity-45"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Preparing your dashboard
            </>
          ) : (
            <>
              Enter dashboard <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <p className="mt-5 text-[9.5px] leading-4 text-[#0A0B0D]/35">
        You can update your profile later. BUYBIZ uses this answer only to
        improve the product, not to limit your access.
      </p>
    </div>
  );
}
