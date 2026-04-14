import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import {
  ALLOWED_EMAIL_ERROR,
  isAllowedUniversityEmail,
} from "../allowedEmail";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  { local: { schema }, verbose: false },
);

const magicLinkEmailHtml = (url: string) => `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:40px;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td align="center" style="padding-bottom:24px;">
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#000;">HelloUni</h1>
        </td></tr>
        <tr><td style="padding-bottom:16px;">
          <h2 style="margin:0;font-size:20px;font-weight:600;color:#111;">Dein Magic Link</h2>
        </td></tr>
        <tr><td style="padding-bottom:24px;color:#555;font-size:15px;line-height:1.6;">
          Klicke auf den Button, um dich bei HelloUni anzumelden.
          Der Link läuft in <strong>1 Stunde</strong> ab.
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px;">
          <a href="${url}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:600;">
            Jetzt anmelden
          </a>
        </td></tr>
        <tr><td style="color:#999;font-size:13px;border-top:1px solid #eee;padding-top:20px;">
          Falls du keine Anmeldung angefordert hast, kannst du diese E-Mail ignorieren.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: "HelloUni",
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    // Passwort-Login deaktiviert – nur Magic Link
    emailAndPassword: {
      enabled: false,
    },
    plugins: [
      convex({ authConfig }),
      magicLink({
        // Magic Link 1 Stunde gültig
        expiresIn: 3600,
        sendMagicLink: async ({ email, url }) => {
          if (!isAllowedUniversityEmail(email)) {
            throw new APIError("BAD_REQUEST", { message: ALLOWED_EMAIL_ERROR });
          }

          const apiKey = process.env.RESEND_API_KEY;
          if (!apiKey) throw new Error("RESEND_API_KEY ist nicht gesetzt");

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "HelloUni <noreply@hello-uni.de>",
              to: email,
              subject: "Dein Magic Link für HelloUni",
              html: magicLinkEmailHtml(url),
            }),
          });

          if (!res.ok) {
            const body = await res.text();
            throw new Error(`E-Mail konnte nicht gesendet werden: ${body}`);
          }
        },
      }),
    ],
  } satisfies BetterAuthOptions;
};

export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
