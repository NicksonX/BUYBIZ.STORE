import "server-only";
import type { Profile } from "@/lib/db/types";

export function homeForProfile(
  profile: Pick<Profile, "role" | "onboardingComplete">,
) {
  if (!profile.onboardingComplete) return "/onboarding";
  if (["support", "admin", "super_admin"].includes(profile.role)) return "/admin";
  return "/dashboard";
}
