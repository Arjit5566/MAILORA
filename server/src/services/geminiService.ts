import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

export interface GenerateEmailParams {
  emailType: string; // Business, Marketing, Promotional, Professional, Welcome, Invitation, Follow-up, Job Application
  description: string;
  recipientName?: string;
  recipientEmail?: string;
  tone: string; // Professional, Friendly, Persuasive, Formal
  senderName?: string;
  senderCompany?: string;
}

export interface GeneratedEmailResponse {
  subject: string;
  preheader: string;
  htmlBody: string;
  suggestedSubjectVariants: string[];
}

// Fallback high quality generator if API key is temporarily unavailable or network times out
function generateSmartFallback(params: GenerateEmailParams): GeneratedEmailResponse {
  const name = params.recipientName?.trim() || "Valued Contact";
  const desc = params.description?.trim() || "We wanted to reach out regarding our latest updates and opportunities.";
  const type = params.emailType || "Business";
  const tone = params.tone || "Professional";

  let subject = "";
  let bodyHtml = "";
  let preheader = "";
  const variants: string[] = [];

  switch (type.toLowerCase()) {
    case "welcome":
      subject = `Welcome aboard, ${name}! Here's what's next`;
      preheader = `We're thrilled to have you with us.`;
      variants.push(
        `Glad you're here, ${name}`,
        `Your journey begins here: Welcome to the team`,
        `Welcome! Quick start guide inside`
      );
      bodyHtml = `<h2>Hi ${name},</h2>
<p>Welcome! We are thrilled to have you with us.</p>
<p>${desc}</p>
<p>Here are a few quick highlights to get you started:</p>
<ul>
  <li><strong>Explore your dashboard:</strong> Access all your tools and automation features anytime.</li>
  <li><strong>Personalized support:</strong> Reach out whenever you need assistance.</li>
  <li><strong>Stay updated:</strong> We regularly ship enhancements and tips.</li>
</ul>
<p>If you have any questions or feedback, simply hit reply to this email.</p>
<p>Warm regards,<br><strong>SendFlow Team</strong></p>`;
      break;

    case "promotional":
    case "marketing":
      subject = `Exclusive Offer inside for you, ${name}`;
      preheader = `Special access crafted specifically for you.`;
      variants.push(
        `Limited time: Unlock your exclusive access`,
        `Special update for ${name}: Don't miss out`,
        `Handcrafted just for you — explore today`
      );
      bodyHtml = `<h2>Hello ${name},</h2>
<p>We are excited to share a special opportunity with you!</p>
<p>${desc}</p>
<blockquote>Special perk: Take advantage of this exclusive offer today to accelerate your growth.</blockquote>
<p>Ready to get started? Click below to discover everything we've prepared for you.</p>
<p><a href="https://sendflow.app" style="display:inline-block; padding:10px 20px; background-color:#6366f1; color:#ffffff; text-decoration:none; border-radius:6px; font-weight:600;">Claim Offer Now</a></p>
<p>Best regards,<br><strong>SendFlow Team</strong></p>`;
      break;

    case "invitation":
      subject = `You're Invited: Exclusive Session for ${name}`;
      preheader = `Reserve your spot for an upcoming session.`;
      variants.push(
        `Invitation: Join us for this special event`,
        `${name}, you are cordially invited`,
        `Save the date: We'd love to see you there`
      );
      bodyHtml = `<h2>Dear ${name},</h2>
<p>You are cordially invited to connect with us for an upcoming session.</p>
<p>${desc}</p>
<p><strong>Event Details:</strong></p>
<ul>
  <li><strong>Topic:</strong> Strategic Collaboration & Insights</li>
  <li><strong>Format:</strong> Interactive Virtual Session</li>
</ul>
<p>Please confirm your attendance at your earliest convenience so we can reserve your spot.</p>
<p><a href="https://sendflow.app" style="color:#6366f1; font-weight:600; text-decoration:underline;">RSVP Here</a></p>
<p>Warmly,<br><strong>SendFlow Studio</strong></p>`;
      break;

    case "follow-up":
      subject = `Following up: Next steps on our conversation`;
      preheader = `Quick follow-up regarding our discussion.`;
      variants.push(
        `Checking in: Any thoughts on our discussion?`,
        `Quick follow-up for ${name}`,
        `Next steps moving forward`
      );
      bodyHtml = `<h2>Hi ${name},</h2>
<p>I hope you are having a productive week.</p>
<p>I am following up regarding our recent discussion. ${desc}</p>
<p>Do you have 10 minutes later this week to reconnect and review any questions?</p>
<p>Looking forward to hearing your thoughts.</p>
<p>Best regards,<br><strong>SendFlow Team</strong></p>`;
      break;

    case "job application":
      subject = `Application for Opportunity - ${params.recipientName ? `Reaching out to ${name}` : "Inquiry"}`;
      preheader = `Enthusiastic candidate application and background overview.`;
      variants.push(
        `Application: Excited to connect regarding the open role`,
        `Candidate Introduction: ${name}`,
        `Inquiry regarding potential collaboration`
      );
      bodyHtml = `<h2>Dear ${name},</h2>
<p>I am writing to express my strong enthusiasm and interest in collaborating with your team.</p>
<p>${desc}</p>
<p>I would welcome the opportunity to discuss how my background and dedication can add value to your current initiatives.</p>
<p>Thank you for your time and consideration.</p>
<p>Sincerely,<br><strong>SendFlow Studio</strong></p>`;
      break;

    default: // Business / Professional / Formal
      subject = `${type} Communication: Strategic Update for ${name}`;
      preheader = `Important business communication and updates.`;
      variants.push(
        `Important Update for ${name}`,
        `Strategic update and next steps`,
        `Collaboration overview for ${name}`
      );
      bodyHtml = `<h2>Dear ${name},</h2>
<p>I hope this message finds you well.</p>
<p>${desc}</p>
<p>Please review the details above and feel free to reach out if you need additional clarification or would like to schedule a brief call.</p>
<p>Thank you for your continued partnership.</p>
<p>Best regards,<br><strong>SendFlow Team</strong></p>`;
  }

  return { subject, preheader, htmlBody: bodyHtml, suggestedSubjectVariants: variants };
}

export async function generateEmailWithGemini(params: GenerateEmailParams): Promise<GeneratedEmailResponse> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    console.warn("[GeminiService] No GEMINI_API_KEY detected in env. Using smart fallback generator.");
    return generateSmartFallback(params);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = `You are an elite email copywriter and automation strategist.
Your task is to generate high-converting, polished, attractive email communications.
Always write clean, semantic HTML suitable for rich email clients and web-based rich text editors.
Use <h2> for headings, <p> for paragraphs, <ul> or <ol> with <li> for lists, <strong> for emphasis, and <blockquote> or styled buttons where appropriate.
Do NOT include <html>, <head>, or <body> wrapping tags. Output only the inner HTML body.
Tone and style must match the user's requested tone exactly.`;

    const userPrompt = `
Generate a complete email with the following specifications:
- Email Type: ${params.emailType}
- Tone: ${params.tone}
- Recipient Name: ${params.recipientName || "Friend / Partner"}
- Recipient Email: ${params.recipientEmail || "recipient@example.com"}
- Core Intent / Description: "${params.description}"

Requirements:
1. "subject": An irresistible, captivating subject line matching the ${params.tone} tone.
2. "preheader": A short, intriguing 1-sentence inbox preheader (preview text).
3. "htmlBody": A well-structured, modern, formatted HTML email body.
   - Address the recipient warmly (e.g. "Hi ${params.recipientName || "there"}," or "Dear ${params.recipientName || "Partner"},").
   - Clearly articulate the description into persuasive, well-paced paragraphs.
   - Add structured elements such as bullet points or a call to action if fitting.
   - Include a professional, courteous sign-off.
4. "suggestedSubjectVariants": An array of 3 alternative subject lines suitable for A/B testing.

Return your response strictly as valid JSON with keys: "subject", "preheader", "htmlBody", "suggestedSubjectVariants".
`;

    // Try gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            subject: { type: "STRING" },
            preheader: { type: "STRING" },
            htmlBody: { type: "STRING" },
            suggestedSubjectVariants: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["subject", "htmlBody", "suggestedSubjectVariants"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(text);
    return {
      subject: parsed.subject || "Important Update",
      preheader: parsed.preheader || "",
      htmlBody: parsed.htmlBody || `<p>${params.description}</p>`,
      suggestedSubjectVariants: Array.isArray(parsed.suggestedSubjectVariants)
        ? parsed.suggestedSubjectVariants
        : [parsed.subject || "Subject Variant 1"],
    };
  } catch (error: any) {
    console.error("[GeminiService] Gemini API call error:", error.message);
    // Fall back gracefully to smart generator so user flow is never disrupted
    return generateSmartFallback(params);
  }
}
