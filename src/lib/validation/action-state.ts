export type ActionState = {
  status?: "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  resetUrl?: string;
  redirectTo?: string;
  claimId?: string;
};

export const initialActionState: ActionState = {};

export function formError(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionState {
  return { status: "error", message, fieldErrors };
}

export function formSuccess(message: string, extra?: Partial<ActionState>): ActionState {
  return { status: "success", message, ...extra };
}
