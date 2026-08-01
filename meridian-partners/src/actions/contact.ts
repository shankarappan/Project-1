"use server";

import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(6, "Please enter a phone number").max(40),
  message: z.string().trim().min(10, "Please share a little more detail").max(4000),
  topic: z.string().trim().max(80).optional(),
  website: z.string().max(0).optional(),
  formType: z.enum(["contact", "consultation"]),
});

export type FormState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function submitInquiry(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    message: String(formData.get("message") ?? ""),
    topic: String(formData.get("topic") ?? ""),
    website: String(formData.get("website") ?? ""),
    formType: String(formData.get("formType") ?? "contact"),
  };

  // Honeypot
  if (raw.website) {
    return { ok: true, message: "Thank you — we will be in touch shortly." };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  const subject =
    data.formType === "consultation"
      ? `Consultation request from ${data.name}`
      : `Website enquiry from ${data.name}`;

  const body = [
    `Type: ${data.formType}`,
    `Name: ${data.name}`,
    `Email: ${data.email}`,
    `Phone: ${data.phone}`,
    data.topic ? `Topic: ${data.topic}` : null,
    "",
    data.message,
  ]
    .filter(Boolean)
    .join("\n");

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL ?? "info@mplaw.nz";
  const from = process.env.CONTACT_FROM_EMAIL ?? "Meridian Partners Website <onboarding@resend.dev>";

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: data.email,
          subject,
          text: body,
        }),
      });
      if (!res.ok) {
        console.error("Resend error", await res.text());
        return {
          ok: false,
          message: "We could not send your message right now. Please email info@mplaw.nz.",
        };
      }
    } catch (error) {
      console.error(error);
      return {
        ok: false,
        message: "We could not send your message right now. Please email info@mplaw.nz.",
      };
    }
  } else {
    console.info("[inquiry:demo]", { subject, body });
  }

  return {
    ok: true,
    message:
      data.formType === "consultation"
        ? "Thank you — our team will contact you to arrange your free consultation."
        : "Thank you — we have received your message and will be in touch shortly.",
  };
}
