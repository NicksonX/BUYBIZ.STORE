import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import type { Profile } from "@/lib/db/types";
import { safeNextPath } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth/session";

async function currentPathname() {
  const store = await headers();
  return store.get("x-buybiz-pathname") || "/dashboard";
}

function loginUrl(nextPath: string) {
  return `/login?next=${encodeURIComponent(safeNextPath(nextPath))}`;
}

export async function requireUserPage(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(await currentPathname()));
  if (!user.onboardingComplete) redirect("/onboarding");
  return user;
}

export async function requireVerifiedUserPage(): Promise<Profile> {
  const user = await requireUserPage();
  if (!user.emailVerified) {
    redirect(`/verify-email?next=${encodeURIComponent(await currentPathname())}`);
  }
  return user;
}

export async function requireAdminPage(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(await currentPathname()));
  if (user.role !== "admin" && user.role !== "super_admin") redirect("/dashboard");
  return user;
}

export async function requireStaffPage(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(await currentPathname()));
  if (!["support", "admin", "super_admin"].includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export async function requireVerifiedUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  if (user.status === "suspended") {
    throw new AppError(
      "ACCOUNT_SUSPENDED",
      "Your account is suspended. Contact support to restore access.",
    );
  }
  if (!user.emailVerified) {
    throw new AppError(
      "EMAIL_NOT_VERIFIED",
      "Verify your email address before making purchases or deposits.",
    );
  }
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  if (!["admin", "super_admin"].includes(user.role)) {
    throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  }
  if (user.status !== "active") {
    throw new AppError("ACCOUNT_SUSPENDED", "This admin account is not active.");
  }
  return user;
}

export async function requireSuperAdmin(): Promise<Profile> {
  const user = await requireAdmin();
  if (user.role !== "super_admin") {
    throw new AppError(
      "FORBIDDEN",
      "Only a super admin can perform this action.",
    );
  }
  return user;
}

export async function requireStaff(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in to continue.");
  if (!["support", "admin", "super_admin"].includes(user.role)) {
    throw new AppError("FORBIDDEN", "You do not have permission to do that.");
  }
  return user;
}

export async function requireSuperAdminPage(): Promise<Profile> {
  const user = await requireAdminPage();
  if (user.role !== "super_admin") redirect("/admin");
  return user;
}
