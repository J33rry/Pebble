import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const transport = env.SMTP_HOST
    ? nodemailer.createTransport({
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          secure: env.SMTP_PORT === 465,
          auth: env.SMTP_USER
              ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
              : undefined,
      })
    : null;

if (!transport && env.NODE_ENV === "production") {
    console.warn("[EMAIL] SMTP_HOST is not set; password reset emails are disabled");
}

export async function sendPasswordResetEmail(to, resetLink) {
    if (!transport) {
        // A reset link is a credential, so it may only be printed in local dev.
        if (env.NODE_ENV !== "production") {
            console.log(`[EMAIL DEV] Password reset link for ${to}: ${resetLink}`);
        }
        return;
    }

    await transport.sendMail({
        from: env.EMAIL_FROM || env.SMTP_USER,
        to,
        subject: "Reset your password",
        text: `Use this link to set a new password. It expires in 15 minutes.\n\n${resetLink}\n\nIf you didn't ask for this, you can ignore this email.`,
    });
}
