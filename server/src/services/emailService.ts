import nodemailer from "nodemailer";
import { config } from "../config/env.js";
import { isMongoConnected } from "../config/db.js";
import { prisma, isPrismaConnected } from "../config/prismaClient.js";
import { Setting } from "../models/Setting.js";
import { memoryDb } from "../utils/memoryStore.js";

let etherealTransporter: nodemailer.Transporter | null = null;
let cachedBrevoAccount: any = null;
let lastBrevoCheck = 0;

export async function getBrevoAccount(apiKey: string) {
  if (cachedBrevoAccount && Date.now() - lastBrevoCheck < 300000) {
    return cachedBrevoAccount;
  }
  try {
    const resp = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": apiKey },
    });
    if (resp.ok) {
      cachedBrevoAccount = await resp.json();
      lastBrevoCheck = Date.now();
      return cachedBrevoAccount;
    }
  } catch {}
  return null;
}

async function getEtherealTransporter() {
  if (!etherealTransporter) {
    try {
      const testAccount = await nodemailer.createTestAccount();
      etherealTransporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[EmailService] Ethereal test inbox created: ${testAccount.user}`);
    } catch {
      // Fallback to JSON transport
      etherealTransporter = nodemailer.createTransport({
        jsonTransport: true,
      });
    }
  }
  return etherealTransporter;
}

export async function getActiveSettings() {
  try {
    let setting: any = null;
    if (isPrismaConnected) {
      const pSetting = await prisma.setting.findFirst({ orderBy: { updatedAt: "desc" } });
      if (pSetting) {
        setting = {
          provider: pSetting.provider,
          brevoApiKey: pSetting.brevoApiKey,
          smtp: {
            host: pSetting.smtpHost || "",
            port: pSetting.smtpPort || 587,
            user: pSetting.smtpUser || "",
            pass: pSetting.smtpPass || "",
            secure: pSetting.smtpSecure,
          },
          fromEmail: pSetting.fromEmail,
          fromName: pSetting.fromName,
          apiBaseUrl: pSetting.apiBaseUrl,
          appUrl: pSetting.appUrl,
        };
      }
    }
    if (!setting && isMongoConnected) {
      setting = await Setting.findOne();
    }
    if (!setting) {
      const mem = await memoryDb.settings.find();
      setting = mem[0];
    }

    const envProvider = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
    const envBrevoKey = (process.env.BREVO_API_KEY || config.brevoApiKey || "").trim();
    const envHasBrevo = Boolean(envBrevoKey && !envBrevoKey.includes("PASTE_YOUR"));
    const envHasSmtp = Boolean(config.smtp?.host && config.smtp?.user);

    // If .env explicitly configured smtp, give it top priority
    if (envProvider === "smtp" && envHasSmtp) {
      return {
        provider: "smtp",
        brevoApiKey: envBrevoKey,
        smtp: {
          ...config.smtp,
          pass: config.smtp.pass || setting?.smtp?.pass || "",
        },
        fromEmail: process.env.FROM_EMAIL || config.fromEmail,
        fromName: process.env.FROM_NAME || config.fromName,
        apiBaseUrl: config.apiBaseUrl,
        appUrl: config.appUrl,
      };
    }

    // If .env explicitly configured brevo with a key, use it
    if ((envProvider === "brevo" || envHasBrevo) && (!setting || !setting.brevoApiKey)) {
      return {
        provider: "brevo",
        brevoApiKey: envBrevoKey,
        smtp: config.smtp,
        fromEmail: process.env.FROM_EMAIL || config.fromEmail,
        fromName: process.env.FROM_NAME || config.fromName,
        apiBaseUrl: config.apiBaseUrl,
        appUrl: config.appUrl,
      };
    }

    // If .env explicitly configured smtp, use it
    if (envProvider === "smtp" && envHasSmtp && (!setting || !setting.smtp?.host)) {
      return {
        provider: "smtp",
        brevoApiKey: envBrevoKey,
        smtp: config.smtp,
        fromEmail: process.env.FROM_EMAIL || config.fromEmail,
        fromName: process.env.FROM_NAME || config.fromName,
        apiBaseUrl: config.apiBaseUrl,
        appUrl: config.appUrl,
      };
    }

    // If MongoDB has real configuration, respect it
    if (setting && (setting.brevoApiKey || setting.smtp?.host)) {
      return setting;
    }

    return {
      provider: envProvider || setting?.provider || "ethereal",
      brevoApiKey: envBrevoKey || setting?.brevoApiKey || "",
      smtp: setting?.smtp || config.smtp,
      fromEmail: process.env.FROM_EMAIL || setting?.fromEmail || config.fromEmail,
      fromName: process.env.FROM_NAME || setting?.fromName || config.fromName,
      apiBaseUrl: config.apiBaseUrl,
      appUrl: config.appUrl,
    };
  } catch {
    return {
      provider: process.env.EMAIL_PROVIDER || "ethereal",
      brevoApiKey: process.env.BREVO_API_KEY || config.brevoApiKey,
      smtp: config.smtp,
      fromEmail: process.env.FROM_EMAIL || config.fromEmail,
      fromName: process.env.FROM_NAME || config.fromName,
      apiBaseUrl: config.apiBaseUrl,
      appUrl: config.appUrl,
    };
  }
}

function wrapHtmlEmail(bodyHtml: string, subject: string): string {
  if (bodyHtml.toLowerCase().includes("<html")) {
    return bodyHtml;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 12px; font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #222222; line-height: 1.6; background-color: #ffffff;">
  <div dir="ltr" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    ${bodyHtml}
  </div>
</body>
</html>`;
}

export function compileTemplate(html: string, variables: Record<string, string>): string {
  let output = html;
  for (const [key, val] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    output = output.replace(regex, val || "");
  }
  return output;
}

export function injectTracking(
  html: string,
  logId?: string,
  apiBaseUrl: string = config.apiBaseUrl,
  contactId?: string
): string {
  if (!logId) return html;

  // DELIVERABILITY SAFEGUARD:
  // If apiBaseUrl points to localhost or 127.0.0.1, DO NOT rewrite links or insert tracking pixels!
  // Mail providers (especially Gmail, Yahoo, Outlook) flag emails containing "http://localhost:4000"
  // as phishing or spam because localhost points to the recipient's own computer.
  const isLocalhost = !apiBaseUrl || 
    apiBaseUrl.includes("localhost") || 
    apiBaseUrl.includes("127.0.0.1") || 
    apiBaseUrl.includes("::1");
  if (isLocalhost) {
    return html;
  }

  let trackedHtml = html;

  // 1. Rewrite <a href="..."> links to go through click tracking endpoint
  trackedHtml = trackedHtml.replace(
    /<a\s+(?:[^>]*?\s+)?href=(["'])(https?:\/\/[^"']+)\1([^>]*)>/gi,
    (match, quote, url, rest) => {
      // Don't rewrite unsubscribe links or internal tracking links
      if (url.includes("/api/track/")) return match;
      const trackUrl = `${apiBaseUrl}/api/track/click/${logId}?url=${encodeURIComponent(url)}`;
      return `<a href="${trackUrl}"${rest}>`;
    }
  );

  // 2. Append 1x1 tracking pixel before </body> or at the end
  const pixel = `<img src="${apiBaseUrl}/api/track/open/${logId}" alt="" width="1" height="1" style="display:none !important; width:1px !important; height:1px !important; border:0 !important; margin:0 !important; padding:0 !important;" />`;
  
  if (trackedHtml.includes("</body>")) {
    trackedHtml = trackedHtml.replace("</body>", `${pixel}</body>`);
  } else {
    trackedHtml += pixel;
  }

  // 3. Add unsubscribe footer if not present
  if (contactId && !trackedHtml.includes("/api/track/unsubscribe/")) {
    const unsubUrl = `${apiBaseUrl}/api/track/unsubscribe/${contactId}`;
    const footer = `
      <div style="margin-top:32px; padding-top:16px; border-top:1px solid #e5e7eb; font-size:12px; color:#6b7280; text-align:center; font-family:sans-serif;">
        <p>You received this email because you are subscribed to our updates.</p>
        <p><a href="${unsubUrl}" style="color:#6366f1; text-decoration:underline;">Unsubscribe</a></p>
      </div>
    `;
    if (trackedHtml.includes("</body>")) {
      trackedHtml = trackedHtml.replace("</body>", `${footer}</body>`);
    } else {
      trackedHtml += footer;
    }
  }

  return trackedHtml;
}

export interface SendMailParams {
  to: string | string[];
  recipientName?: string;
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html: string;
  logId?: string;
  contactId?: string;
  variables?: Record<string, string>;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  previewUrl?: string;
  error?: string;
}

function parseEmailList(input?: string | string[]): string[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((e) => e.trim()).filter((e) => e.length > 0 && e.includes("@"));
  }
  return input
    .split(",")
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes("@"));
}

export async function sendEmail({
  to,
  recipientName = "",
  cc,
  bcc,
  subject,
  html,
  logId,
  contactId,
  variables = {},
}: SendMailParams): Promise<SendMailResult> {
  const settings = await getActiveSettings();
  const apiBaseUrl = settings.apiBaseUrl || config.apiBaseUrl;

  const toList = parseEmailList(to);
  const ccList = parseEmailList(cc);
  const bccList = parseEmailList(bcc);

  if (toList.length === 0) {
    return { success: false, error: "No valid recipient email address provided." };
  }

  const primaryRecipient = toList[0]!;

  // Substitute variables
  const mergedVars = {
    name: recipientName || "there",
    email: primaryRecipient,
    company: variables.company || "SendFlow",
    ...variables,
  };

  const compiledHtml = compileTemplate(html, mergedVars);
  const formattedHtml = wrapHtmlEmail(compiledHtml, subject);
  const trackedHtml = injectTracking(formattedHtml, logId, apiBaseUrl, contactId);

  const fromEmail = settings.fromEmail || config.fromEmail;
  const fromName = settings.fromName || config.fromName;
  const fromString = `"${fromName}" <${fromEmail}>`;

  // Option A: Brevo API v3
  const brevoApiKey = (settings.brevoApiKey || config.brevoApiKey || "").trim();
  if (settings.provider === "brevo" || (brevoApiKey && !settings.smtp?.host && !settings.provider)) {
    if (!brevoApiKey || brevoApiKey.includes("PASTE_YOUR")) {
      return {
        success: false,
        error: "Brevo API key is not configured. Please paste your actual Brevo API key (starts with xkeysib-) in server/.env or in the Settings modal.",
      };
    }
    if (brevoApiKey.startsWith("xsmtpsib-")) {
      return {
        success: false,
        error: "Invalid key type: You copied a Brevo SMTP key ('xsmtpsib-...'). SendFlow requires a Brevo API key ('xkeysib-...'). In your Brevo account, go to 'SMTP & API' -> click the 'API Keys' tab -> click 'Generate a new API key'.",
      };
    }
    if (fromEmail.includes("your-verified-email")) {
      return {
        success: false,
        error: "Please set FROM_EMAIL in server/.env to the verified sender email address in your Brevo account.",
      };
    }
    try {
      const brevoTo = toList.map((email, idx) => ({
        email,
        name: idx === 0 && recipientName ? recipientName : undefined,
      }));
      const brevoCc = ccList.map((email) => ({ email }));
      const brevoBcc = bccList.map((email) => ({ email }));

      // DMARC & verified sender resolution for Brevo
      const brevoAccount = await getBrevoAccount(brevoApiKey);
      const brevoUserId = brevoAccount?.user_id;

      let effectiveSenderEmail = fromEmail;
      const isPublicDomain = /@(gmail\.com|yahoo\.com|outlook\.com|hotmail\.com|icloud\.com)$/i.test(fromEmail);
      if (isPublicDomain && brevoUserId) {
        // Brevo requires its dedicated sending subdomain for @gmail.com to prevent DMARC failure & sending platform disablement
        const prefix = fromEmail.split("@")[0];
        effectiveSenderEmail = `${prefix}@${brevoUserId}.brevosend.com`;
      }

      const payload: any = {
        sender: { name: fromName, email: effectiveSenderEmail },
        replyTo: { email: fromEmail, name: fromName },
        to: brevoTo,
        subject,
        htmlContent: trackedHtml,
        tags: ["mailora-campaign"],
      };

      if (brevoCc.length > 0) payload.cc = brevoCc;
      if (brevoBcc.length > 0) payload.bcc = brevoBcc;

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": brevoApiKey,
          accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as any;
      if (!response.ok) {
        let msg = data.message || `Brevo API error: ${response.statusText}`;
        if (msg.includes("unrecognised IP address") || msg.includes("authorised_ips")) {
          msg = `Brevo Security Alert: Unrecognised IP address. Brevo blocked this send because your current IP is not in your Brevo Authorised IPs list. Visit https://app.brevo.com/security/authorised_ips to add your IP or disable IP restrictions.`;
        }
        throw new Error(msg);
      }

      return {
        success: true,
        messageId: data.messageId || `brevo-${Date.now()}`,
      };
    } catch (err: any) {
      console.error("[EmailService] Brevo delivery error:", err.message);
      return { success: false, error: err.message };
    }
  }

  // Format string for Nodemailer
  const toHeader = toList.join(", ");
  const ccHeader = ccList.length > 0 ? ccList.join(", ") : undefined;
  const bccHeader = bccList.length > 0 ? bccList.join(", ") : undefined;

  // Option B: Custom SMTP
  const smtp = settings.smtp || config.smtp;
  if (smtp?.host && smtp?.user && (settings.provider === "smtp" || smtp.host.trim().length > 0)) {
    try {
      const cleanPass = String(smtp.pass || "").replace(/\s+/g, "");
      const isGmail = (smtp.host || "").toLowerCase().includes("gmail");

      const transportOpts: any = isGmail
        ? {
            service: "gmail",
            auth: {
              user: smtp.user,
              pass: cleanPass,
            },
          }
        : {
            host: smtp.host,
            port: smtp.port || 587,
            secure: smtp.secure || smtp.port === 465,
            auth: {
              user: smtp.user,
              pass: cleanPass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          };

      const transporter = nodemailer.createTransport(transportOpts);

      // Generate clean plain text fallback to maximize inbox deliverability
      const plainText = (html || "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<br\s*[\/]?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/\n\s*\n\s*\n/g, "\n\n")
        .replace(/[ \t]+/g, " ")
        .trim();

      const mailOptions: any = {
        from: fromString,
        to: toHeader,
        subject,
        text: plainText,
        html: trackedHtml,
      };
      if (ccHeader) mailOptions.cc = ccHeader;
      if (bccHeader) mailOptions.bcc = bccHeader;

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error("[EmailService] SMTP delivery error:", err.message);
      return { success: false, error: err.message };
    }
  }

  // Option C: Ethereal / Simulated Test Mailer (Zero configuration out of the box!)
  try {
    const transporter = await getEtherealTransporter();
    const mailOptions: any = {
      from: fromString,
      to: toHeader,
      subject,
      html: trackedHtml,
    };
    if (ccHeader) mailOptions.cc = ccHeader;
    if (bccHeader) mailOptions.bcc = bccHeader;

    const info = await transporter.sendMail(mailOptions);

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      console.log(`[EmailService] Test email preview: ${previewUrl}`);
    }

    return {
      success: true,
      messageId: info.messageId || `test-${Date.now()}`,
      previewUrl: previewUrl || undefined,
    };
  } catch (err: any) {
    console.error("[EmailService] Ethereal delivery error:", err.message);
    return { success: false, error: err.message };
  }
}

