import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { components } from "../_generated/api";
import type { DataModel } from "../_generated/dataModel";
import authConfig from "../auth.config";
import schema from "./schema";

const ALLOWED_DOMAIN = "@th-nuernberg.de";

function escapeHtmlAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeHtmlText(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function displayNameFromMetadata(metadata: unknown): string | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const raw = (metadata as Record<string, unknown>).displayName;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Ohne „Name <email>“ zeigen viele Clients nur die Adresse (z. B. noreply@…). */
function resendFromWithDisplayName(rawFrom: string, displayName: string): string {
  const trimmed = rawFrom.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("<") && trimmed.includes(">")) {
    return trimmed;
  }
  return `${displayName} <${trimmed}>`;
}

function magicLinkEmailHtml(url: string, displayName?: string) {
  const safeUrl = escapeHtmlAttr(url);
  const greeting = displayName
    ? `Hallo ${escapeHtmlText(displayName)},`
    : "Hallo,";
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<title>HelloUni – Anmeldung</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e8e8ea;">
        <tr>
          <td style="padding:28px 28px 20px;background-color:#dcc6a1;text-align:center;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#141414;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;letter-spacing:-0.02em;">HelloUni</p>
            <p style="margin:10px 0 0;font-size:14px;line-height:1.45;color:#3d3d3d;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Dein persönlicher Anmelde-Link</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:#374151;">${greeting}</p>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151;">um dich bei <strong style="color:#111827;">HelloUni</strong> anzumelden, tippe auf den Button oder öffne den Link im Browser. Der Link ist <strong style="color:#111827;">eine Stunde</strong> gültig.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
              <tr>
                <td style="border-radius:9999px;background-color:#111827;">
                  <a href="${safeUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Jetzt anmelden</a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#6b7280;">Falls der Button nicht funktioniert, kopiere diese Adresse in den Browser:</p>
            <p style="margin:0 0 20px;font-size:12px;line-height:1.5;color:#111827;word-break:break-all;">${safeUrl}</p>
            <p style="margin:0;font-size:12px;line-height:1.5;color:#9ca3af;">Du hast diese E-Mail nicht angefordert? Dann kannst du sie ignorieren – es wird nichts geändert.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;border-top:1px solid #f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
            <p style="margin:0;font-size:11px;line-height:1.5;color:#9ca3af;text-align:center;">HelloUni · Nürnberg</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function magicLinkEmailText(url: string, displayName?: string) {
  const lines = ["HelloUni – Anmeldung", "", displayName ? `Hallo ${displayName},` : "Hallo,", "", "Um dich anzumelden, öffne diesen Link im Browser:", url, "", "Du hast diese E-Mail nicht angefordert? Dann kannst du sie ignorieren."];
  return lines.join("\n");
}

const DEFAULT_TRUSTED_ORIGINS = [
  "http://localhost:3000",
  "https://hello-uni.de",
  "https://www.hello-uni.de",
];

export const authComponent = createClient<DataModel, typeof schema>(
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const envTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    appName: "HelloUni",
    baseURL: process.env.SITE_URL,
    trustedOrigins: [...new Set([...DEFAULT_TRUSTED_ORIGINS, ...envTrustedOrigins])],
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    plugins: [
      magicLink({
        /** Gültigkeit des Tokens in Sekunden (Better Auth-Standard: 300). */
        expiresIn: 3600,
        sendMagicLink: async ({ email, url, metadata }) => {
          if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
            throw new Error(`Nur E-Mails mit ${ALLOWED_DOMAIN} sind erlaubt.`);
          }

          const resendApiKey = process.env.RESEND_API_KEY;
          const resendFrom = process.env.RESEND_FROM_EMAIL;
          if (!resendApiKey || !resendFrom) {
            throw new Error("Fehlende Resend-Konfiguration in Convex Umgebungsvariablen.");
          }

          const greetingName = displayNameFromMetadata(metadata);
          const resend = new Resend(resendApiKey);
          await resend.emails.send({
            from: resendFromWithDisplayName(resendFrom, "HelloUni"),
            to: email,
            subject: "Dein HelloUni Magic Link",
            html: magicLinkEmailHtml(url, greetingName),
            text: magicLinkEmailText(url, greetingName),
          });
        },
      }),
      convex({ authConfig }),
    ],
  } satisfies BetterAuthOptions;
};

export const options = createAuthOptions({} as GenericCtx<DataModel>);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
