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

/**
 * Basis-URL für Bilder in E-Mails. Nicht `SITE_URL` aus Dev (localhost) verwenden –
 * Mail-Clients können localhost nicht erreichen.
 */
function publicAssetBaseUrlForEmail(): string {
  const explicit = (
    process.env.MAGIC_LINK_PUBLIC_BASE_URL ||
    process.env.EMAIL_PUBLIC_ASSET_BASE_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  if (explicit) return explicit;

  const site = (process.env.SITE_URL || "").trim().replace(/\/+$/, "");
  if (site.startsWith("https://") && !/localhost|127\.0\.0\.1/i.test(site)) {
    return site;
  }

  return "https://hello-uni.de";
}

function magicLinkEmailHtml(url: string, displayName?: string) {
  const safeUrl = escapeHtmlAttr(url);
  const logoUrl = escapeHtmlAttr(`${publicAssetBaseUrlForEmail()}/logo_background.png`);
  const greeting = displayName
    ? `Hallo ${escapeHtmlText(displayName)},`
    : "Hallo,";
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="x-ua-compatible" content="ie=edge">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>HelloUni – Anmeldung</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style type="text/css">
  :root { color-scheme: light dark; }
  @media (prefers-color-scheme: dark) {
    .email-body { background-color: #0f0d0a !important; }
    .email-outer { background-color: #0f0d0a !important; }
    .email-card {
      background-color: #1a1714 !important;
      border-color: #3d3428 !important;
      box-shadow: 0 4px 28px rgba(0,0,0,0.45) !important;
    }
    .email-header { background-color: #12100c !important; }
    .email-header .email-header-sub { color: #b5a892 !important; }
    .email-logo {
      background-color: #252019 !important;
      box-shadow: 0 0 0 1px #3d3428 !important;
    }
    .email-kicker { color: #9a8f7e !important; }
    .email-greeting { color: #f5ede0 !important; }
    .email-copy { color: #cfc3b2 !important; }
    .email-copy strong { color: #f5ede0 !important; }
    .email-divider { border-top-color: #3d3428 !important; }
    .email-fallback-label { color: #9a8f7e !important; }
    .email-fallback-url {
      color: #e8c98a !important;
      background-color: #12100c !important;
      border-left-color: #c9a96e !important;
    }
    .email-disclaimer { color: #8a8074 !important; }
    .email-foot-kicker { color: #9a8f7e !important; }
    .email-foot-copy { color: #6e665c !important; }
  }
</style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:#f7f3ee;">
<table role="presentation" class="email-outer" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f7f3ee;padding:40px 16px;font-family:'Poppins',Arial,sans-serif;">
  <tr>
    <td align="center">
      <table role="presentation" class="email-card" width="100%" cellspacing="0" cellpadding="0" style="max-width:500px;background-color:#fffdf9;border-radius:4px;overflow:hidden;box-shadow:0 2px 24px rgba(0,0,0,0.07);border:1px solid #e9e0d4;">
        <tr>
          <td class="email-header" style="background-color:#1a1409;padding:36px 40px 32px;text-align:center;">
            <div style="height:3px;background:linear-gradient(90deg,#c9a96e,#e8c98a,#c9a96e);border-radius:2px;margin-bottom:28px;"></div>
            <img class="email-logo" src="${logoUrl}" width="72" height="72" alt="HelloUni Logo" style="display:block;margin:0 auto;border-radius:50%;background-color:#fffdf9;padding:4px;" />
            <p style="margin:10px 0 4px;font-size:22px;font-weight:400;color:#f5ede0;font-family:'Poppins',Arial,sans-serif;letter-spacing:0.12em;text-transform:uppercase;">HelloUni</p>
            <p class="email-header-sub" style="margin:0;font-size:11px;color:#8a7a63;letter-spacing:0.22em;text-transform:uppercase;font-family:'Poppins',Arial,sans-serif;">Nürnberg</p>
            <div style="height:1px;background:linear-gradient(90deg,transparent,#3d3020,transparent);margin-top:24px;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 8px;">
            <p class="email-kicker" style="margin:0 0 28px;font-size:10px;color:#b8a898;letter-spacing:0.25em;text-transform:uppercase;font-family:'Poppins',Arial,sans-serif;text-align:center;">Sicherer Anmelde-Link</p>
            <p class="email-greeting" style="margin:0 0 6px;font-size:18px;line-height:1.4;color:#1a1409;font-family:'Poppins',Arial,sans-serif;">${greeting}</p>
            <div style="width:32px;height:2px;background-color:#c9a96e;margin-bottom:20px;"></div>
            <p class="email-copy" style="margin:0 0 32px;font-size:15px;line-height:1.75;color:#4a3f32;font-family:'Poppins',Arial,sans-serif;">
              Klicke auf den Button unten, um dich bei <strong style="color:#1a1409;">HelloUni</strong> anzumelden. Der Link ist <strong style="color:#1a1409;">eine Stunde</strong> gültig und kann nur einmal verwendet werden.
            </p>
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto 36px;">
              <tr>
                <td style="background-color:#1a1409;border-radius:2px;border:1px solid #c9a96e;">
                  <a href="${safeUrl}" style="display:inline-block;padding:15px 40px;font-size:13px;font-weight:400;color:#f5ede0;text-decoration:none;font-family:'Poppins',Arial,sans-serif;letter-spacing:0.18em;text-transform:uppercase;">&#8594;&nbsp;&nbsp;Jetzt anmelden</a>
                </td>
              </tr>
            </table>
            <div class="email-divider" style="border-top:1px solid #ede5d8;margin-bottom:24px;"></div>
            <p class="email-fallback-label" style="margin:0 0 8px;font-size:11px;line-height:1.5;color:#8a7a63;font-family:'Poppins',Arial,sans-serif;letter-spacing:0.04em;">Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:</p>
            <p class="email-fallback-url" style="margin:0 0 24px;font-size:11px;line-height:1.6;color:#c9a96e;word-break:break-all;font-family:'Courier New',Courier,monospace;background-color:#f7f3ee;padding:12px 14px;border-radius:2px;border-left:2px solid #c9a96e;">${safeUrl}</p>
            <p class="email-disclaimer" style="margin:0;font-size:11px;line-height:1.6;color:#b8a898;font-family:'Poppins',Arial,sans-serif;font-style:italic;">Du hast diese E-Mail nicht angefordert? Dann ignoriere sie einfach - es aendert sich nichts an deinem Konto.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 32px;">
            <div class="email-divider" style="border-top:1px solid #ede5d8;padding-top:24px;text-align:center;">
              <p class="email-foot-kicker" style="margin:0 0 4px;font-size:10px;color:#b8a898;letter-spacing:0.22em;text-transform:uppercase;font-family:'Poppins',Arial,sans-serif;">HelloUni · Nürnberg</p>
              <p class="email-foot-copy" style="margin:0;font-size:10px;color:#d0c4b4;font-family:'Poppins',Arial,sans-serif;">© 2025 HelloUni. Alle Rechte vorbehalten.</p>
            </div>
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
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
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
