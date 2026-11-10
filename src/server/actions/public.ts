"use server";

import { getDb } from "@/lib/db";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { contactSchema, zodFieldErrors } from "@/lib/validation/schemas";
import {
  formError,
  formSuccess,
  type ActionState,
} from "@/lib/validation/action-state";

export async function contactAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ip = await getClientIp();
  const limit = await rateLimit({
    action: "contact:submit",
    identifier: ip,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.allowed) {
    return formError(
      "Too many contact messages from this connection. Please try again later.",
    );
  }

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return formError("Check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  try {
    const db = await getDb();
    await db.query(
      `insert into contact_messages (name, email, subject, message)
       values ($1,$2,$3,$4)`,
      [parsed.data.name, parsed.data.email, parsed.data.subject, parsed.data.message],
    );
    return formSuccess(
      "Message received. It is now in the BUYBIZ support inbox. We do not send an automated email confirmation.",
    );
  } catch (error) {
    console.error("[buybiz/contact] failed", error);
    return formError("We could not save your message. Please try again.");
  }
}
