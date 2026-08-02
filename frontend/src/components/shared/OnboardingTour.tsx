import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Compass, LayoutDashboard, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/store";
import { useT } from "@/lib/i18n/store";
import {
  completeOnboarding,
  loadOnboardingState,
  ONBOARDING_START_EVENT,
  resetOnboarding,
  saveOnboardingProgress,
} from "@/lib/onboarding/state";

type TargetRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const steps = [
  {
    target: '[data-onboarding="navigation"]',
    titleKey: "onboarding.navigation.title",
    descriptionKey: "onboarding.navigation.description",
    icon: Compass,
  },
  {
    target: '[data-onboarding="search"]',
    titleKey: "onboarding.search.title",
    descriptionKey: "onboarding.search.description",
    icon: Search,
  },
  {
    target: '[data-onboarding="notifications"]',
    titleKey: "onboarding.notifications.title",
    descriptionKey: "onboarding.notifications.description",
    icon: Bell,
  },
  {
    target: '[data-onboarding="workspace"]',
    titleKey: "onboarding.workspace.title",
    descriptionKey: "onboarding.workspace.description",
    icon: LayoutDashboard,
  },
] as const;

function visibleTarget(selector: string): HTMLElement | null {
  const candidates = [...document.querySelectorAll<HTMLElement>(selector)];
  return (
    candidates.find((element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }) ?? null
  );
}

export function OnboardingTour() {
  const t = useT();
  const user = useAuth((state) => state.user);
  const userKey = user?.id || user?.email || "anonymous";
  const cardRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const step = steps[stepIndex] ?? steps[0];
  const StepIcon = step.icon;

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    const state = loadOnboardingState(window.localStorage, userKey);
    if (!state.completed) {
      setStepIndex(Math.min(state.lastStep, steps.length - 1));
      setOpen(true);
    }

    const restart = () => {
      resetOnboarding(window.localStorage, userKey);
      setStepIndex(0);
      setOpen(true);
    };
    window.addEventListener(ONBOARDING_START_EVENT, restart);
    return () => window.removeEventListener(ONBOARDING_START_EVENT, restart);
  }, [user, userKey]);

  useEffect(() => {
    if (!open) return;
    const updateTarget = () => {
      const element = visibleTarget(step.target);
      if (!element) {
        setTargetRect(null);
        return;
      }
      element.scrollIntoView({ block: "nearest", inline: "nearest" });
      const rect = element.getBoundingClientRect();
      setTargetRect({
        top: Math.max(8, rect.top - 6),
        left: Math.max(8, rect.left - 6),
        width: rect.width + 12,
        height: rect.height + 12,
      });
    };
    const frame = window.requestAnimationFrame(updateTarget);
    window.addEventListener("resize", updateTarget);
    window.addEventListener("scroll", updateTarget, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateTarget);
      window.removeEventListener("scroll", updateTarget, true);
    };
  }, [open, step.target]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    cardRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (open) cardRef.current?.focus();
  }, [open, stepIndex]);

  const cardPosition = useMemo(() => {
    if (!targetRect || typeof window === "undefined") {
      return {
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
      };
    }
    const cardWidth = Math.min(360, window.innerWidth - 32);
    const left = Math.min(
      Math.max(16, targetRect.left),
      Math.max(16, window.innerWidth - cardWidth - 16),
    );
    const placeBelow = targetRect.top + targetRect.height + 260 < window.innerHeight;
    return {
      left,
      top: placeBelow
        ? targetRect.top + targetRect.height + 14
        : Math.max(16, targetRect.top - 230),
      transform: "none",
    };
  }, [targetRect]);

  if (!open || !user) return null;

  const finish = () => {
    completeOnboarding(window.localStorage, userKey);
    setOpen(false);
  };
  const previous = () => {
    const next = Math.max(0, stepIndex - 1);
    saveOnboardingProgress(window.localStorage, userKey, next);
    setStepIndex(next);
  };
  const next = () => {
    if (stepIndex === steps.length - 1) {
      finish();
      return;
    }
    const nextStep = stepIndex + 1;
    saveOnboardingProgress(window.localStorage, userKey, nextStep);
    setStepIndex(nextStep);
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none" aria-live="polite">
      {targetRect ? (
        <div
          aria-hidden
          className="fixed rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-background transition-all duration-200"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.62)",
          }}
        />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-black/60" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Tab") {
            const focusable = cardRef.current?.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            );
            if (!focusable?.length) {
              event.preventDefault();
              return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (
              event.shiftKey &&
              (document.activeElement === first || document.activeElement === cardRef.current)
            ) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
          if (event.key === "Escape") finish();
          if (event.key === "ArrowRight") next();
          if (event.key === "ArrowLeft") previous();
        }}
        className="pointer-events-auto fixed w-[calc(100%_-_2rem)] max-w-[360px] rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl outline-none"
        style={cardPosition}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <StepIcon className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary">
              {t("onboarding.step")
                .replace("{current}", String(stepIndex + 1))
                .replace("{total}", String(steps.length))}
            </p>
            <h2 id="onboarding-title" className="mt-1 text-lg font-semibold">
              {t(step.titleKey)}
            </h2>
          </div>
        </div>
        <p id="onboarding-description" className="text-sm leading-relaxed text-muted-foreground">
          {t(step.descriptionKey)}
        </p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {steps.map((item, index) => (
              <span
                key={item.titleKey}
                className={`h-1.5 rounded-full transition-all ${
                  index === stepIndex ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={finish}>
              {t("onboarding.skip")}
            </Button>
            {stepIndex > 0 ? (
              <Button variant="outline" size="sm" onClick={previous}>
                {t("common.previous")}
              </Button>
            ) : null}
            <Button size="sm" onClick={next}>
              {t(stepIndex === steps.length - 1 ? "onboarding.finish" : "common.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
