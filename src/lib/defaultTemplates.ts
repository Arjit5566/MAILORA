import type { Template } from "./api";

export interface StarterTemplateDef {
  id?: string;
  _id?: string;
  name: string;
  category: string;
  subject: string;
  html: string;
  createdAt?: string;
}

export const DEFAULT_STARTER_TEMPLATES: Template[] = [
  {
    _id: "tpl-onboarding-welcome",
    id: "tpl-onboarding-welcome",
    name: "Welcome & Onboarding",
    category: "Onboarding",
    subject: "Welcome to {{company}}, {{name}}! 🚀",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 36px 24px; text-align: center;">
    <span style="background: rgba(255,255,255,0.2); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Welcome Aboard</span>
    <h1 style="color: #ffffff; margin: 16px 0 8px 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">Welcome to {{company}}</h1>
    <p style="color: #e0e7ff; margin: 0; font-size: 15px;">We're thrilled to have you join our community</p>
  </div>
  <div style="padding: 32px 28px;">
    <p style="font-size: 16px; margin-top: 0;">Hi <strong>{{name}}</strong>,</p>
    <p style="color: #475569; font-size: 15px;">Thank you for signing up! With {{company}}, creating high-converting email campaigns and automated drip journeys is now completely effortless.</p>
    
    <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
      <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">3 Quick Steps to Get Started:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li style="margin-bottom: 6px;">Connect your sender domain or SMTP in Settings</li>
        <li style="margin-bottom: 6px;">Import your subscriber list via CSV or Excel</li>
        <li>Launch your first visual workflow in the Automation Builder</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="http://localhost:8080" style="background: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);">Go to Your Dashboard &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">Sent with ❤️ by {{company}} · <a href="{{unsubscribe_link}}" style="color: #64748b; text-decoration: underline;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-product-launch",
    id: "tpl-product-launch",
    name: "Product Launch & Major Announcement",
    category: "Product",
    subject: "Introducing the all-new {{company}} 2.0 ✨",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #0f172a; padding: 40px 24px; text-align: center;">
    <div style="display: inline-block; background: #1e293b; border: 1px solid #334155; color: #38bdf8; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-bottom: 12px;">NEW RELEASE</div>
    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: 800;">Meet {{company}} 2.0</h1>
    <p style="color: #94a3b8; margin: 0; font-size: 16px;">Re-engineered from the ground up for 10x faster email delivery.</p>
  </div>
  <div style="padding: 32px 28px;">
    <p style="font-size: 16px; margin-top: 0;">Hey {{name}},</p>
    <p style="color: #475569; font-size: 15px;">After months of feedback and testing, we are excited to unveil our biggest update yet. Here is what's new in this release:</p>
    
    <div style="margin: 24px 0;">
      <div style="display: flex; margin-bottom: 16px; padding: 14px; background: #f8fafc; border-radius: 10px;">
        <div>
          <h4 style="margin: 0 0 4px 0; font-size: 15px; color: #0f172a;">⚡ Real-time Smart Scheduling</h4>
          <p style="margin: 0; font-size: 13px; color: #64748b;">Schedule same-day emails with intelligent time conversion and quick-preset triggers.</p>
        </div>
      </div>
      <div style="display: flex; margin-bottom: 16px; padding: 14px; background: #f8fafc; border-radius: 10px;">
        <div>
          <h4 style="margin: 0 0 4px 0; font-size: 15px; color: #0f172a;">🎯 Drag-and-Drop Workflow Canvas</h4>
          <p style="margin: 0; font-size: 13px; color: #64748b;">Visual branching, delay wait timers, open tracking, and auto-tagging.</p>
        </div>
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0 10px 0;">
      <a href="http://localhost:8080" style="background: #0f172a; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Try the New Features &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">{{company}} Inc. · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-monthly-newsletter",
    id: "tpl-monthly-newsletter",
    name: "Monthly Insights & Growth Digest",
    category: "Newsletter",
    subject: "{{company}} Monthly Insights & Growth Digest 📈",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); padding: 32px 24px; text-align: center;">
    <p style="color: #ddd6fe; margin: 0 0 6px 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">ISSUE #42 · MONTHLY DIGEST</p>
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">The Growth & Deliverability Report</h1>
  </div>
  <div style="padding: 28px;">
    <p style="font-size: 15px; color: #475569;">Welcome to this month's edition, {{name}}! Here are our top curated insights on email marketing, sender reputation, and automation strategy.</p>
    
    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 18px;">
      <span style="font-size: 11px; font-weight: 700; color: #8b5cf6; text-transform: uppercase;">Guide of the Month</span>
      <h3 style="margin: 6px 0; font-size: 17px; color: #0f172a;"><a href="http://localhost:8080" style="color: #0f172a; text-decoration: none;">How to maintain a 99.2% inbox placement rate in 2026</a></h3>
      <p style="margin: 0; font-size: 14px; color: #64748b;">Understanding SPF, DKIM, and DMARC alignment to ensure your cold and transactional emails skip the spam tab.</p>
    </div>

    <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 18px;">
      <span style="font-size: 11px; font-weight: 700; color: #8b5cf6; text-transform: uppercase;">Benchmark Report</span>
      <h3 style="margin: 6px 0; font-size: 17px; color: #0f172a;"><a href="http://localhost:8080" style="color: #0f172a; text-decoration: none;">Average open rates across 14 B2B and B2C industries</a></h3>
      <p style="margin: 0; font-size: 14px; color: #64748b;">See how your recent campaigns compare against industry leaders.</p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="http://localhost:8080" style="background: #6d28d9; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Read Full Archive &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">You received this because you are subscribed to {{company}} updates · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-flash-sale",
    id: "tpl-flash-sale",
    name: "Special Promotional Offer & Flash Sale",
    category: "Promotional",
    subject: "⚡ Exclusive 30% Off Your Next Upgrade, {{name}}",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 36px 24px; text-align: center;">
    <span style="background: #ffffff; color: #d97706; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">LIMITED TIME OFFER</span>
    <h1 style="color: #ffffff; margin: 16px 0 6px 0; font-size: 32px; font-weight: 800;">Get 30% OFF Today</h1>
    <p style="color: #fef3c7; margin: 0; font-size: 15px;">Unlock unlimited automations, contacts, and dedicated SMTP relay.</p>
  </div>
  <div style="padding: 32px 28px; text-align: center;">
    <p style="font-size: 16px; margin-top: 0; color: #475569;">Hi {{name}}, as a valued member of {{company}}, we're giving you an exclusive discount to supercharge your email volume.</p>
    
    <div style="background: #fffbeb; border: 2px dashed #f59e0b; padding: 16px; border-radius: 12px; max-width: 280px; margin: 24px auto;">
      <div style="font-size: 11px; text-transform: uppercase; color: #b45309; font-weight: 700; letter-spacing: 1px;">Use Promo Code</div>
      <div style="font-size: 24px; font-weight: 800; color: #78350f; font-family: monospace; margin: 4px 0;">GROWTH30</div>
      <div style="font-size: 11px; color: #92400e;">Valid for the next 48 hours only</div>
    </div>

    <div style="margin: 28px 0 12px 0;">
      <a href="http://localhost:8080" style="background: #d97706; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.35);">Claim Your 30% Discount &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">{{company}} Promotions · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-cold-outreach",
    id: "tpl-cold-outreach",
    name: "Cold B2B Outreach & Partnership",
    category: "Sales",
    subject: "Quick question regarding {{company}} outreach strategy",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; padding: 32px 28px; border: 1px solid #e2e8f0; border-radius: 12px;">
  <p style="font-size: 15px; margin-top: 0;">Hi {{name}},</p>
  
  <p style="color: #334155; font-size: 15px;">I noticed your recent work and wanted to reach out directly. We've been helping fast-growing teams scale their automated email workflows with zero deliverability headaches.</p>
  
  <p style="color: #334155; font-size: 15px;">Most founders we speak with struggle with two main friction points:</p>
  
  <ol style="color: #475569; font-size: 14px; padding-left: 20px;">
    <li style="margin-bottom: 8px;">Deliverability drops caused by rigid third-party rate limits</li>
    <li style="margin-bottom: 8px;">Inability to build complex visual branching without writing code</li>
  </ol>
  
  <p style="color: #334155; font-size: 15px;">Do you have 10 minutes this Thursday or Friday for a quick intro chat? Would love to share what is working best for companies in your space.</p>
  
  <p style="color: #334155; font-size: 15px; margin-bottom: 24px;">Best regards,<br><strong>Arjit Tripathi</strong><br><span style="color: #64748b; font-size: 13px;">Founder, {{company}}</span></p>
  
  <div style="border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 11px; color: #94a3b8;">
    If you'd prefer not to hear from me, simply <a href="{{unsubscribe_link}}" style="color: #64748b;">click here to opt out</a>.
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-live-webinar",
    id: "tpl-live-webinar",
    name: "Live Masterclass & Webinar Invitation",
    category: "Events",
    subject: "Exclusive Live Session: Scaling Email Deliverability in 2026 🎙️",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 36px 24px; text-align: center;">
    <span style="background: rgba(255,255,255,0.25); color: #ffffff; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Live Masterclass</span>
    <h1 style="color: #ffffff; margin: 16px 0 8px 0; font-size: 25px; font-weight: 800;">Mastering Automated Email Journeys</h1>
    <p style="color: #e0f2fe; margin: 0; font-size: 15px;">Featuring top deliverability and growth engineering experts</p>
  </div>
  <div style="padding: 30px 28px;">
    <p style="font-size: 15px; margin-top: 0;">Hi {{name}},</p>
    <p style="color: #475569; font-size: 15px;">You're invited to an exclusive 45-minute live masterclass. We'll walk through step-by-step frameworks for building high-converting drip workflows that generate 3x higher replies.</p>
    
    <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 14px; font-weight: 700; color: #0369a1; margin-bottom: 6px;">📅 Date & Time</div>
      <div style="font-size: 15px; font-weight: 600; color: #0f172a;">Thursday, Nov 12 · 6:00 PM IST / 8:30 AM EST</div>
      <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Live Q&A + Interactive teardown session included</div>
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="http://localhost:8080" style="background: #0284c7; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Reserve Your Free Seat &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">Hosted by {{company}} · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-customer-feedback",
    id: "tpl-customer-feedback",
    name: "Customer Feedback & NPS Survey",
    category: "Engagement",
    subject: "How has your experience with {{company}} been? 💬",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; padding: 32px 28px; border: 1px solid #e2e8f0; border-radius: 16px; text-align: center;">
  <span style="font-size: 36px;">⭐️</span>
  <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">We'd love your quick feedback</h2>
  <p style="color: #475569; font-size: 15px; margin-top: 0;">Hi {{name}}, how satisfied are you with {{company}} so far?</p>
  
  <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">On a scale of 1 to 5, how likely are you to recommend us to a friend or colleague?</p>
  
  <div style="margin: 24px 0;">
    <a href="http://localhost:8080?score=1" style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: #fee2e2; color: #991b1b; font-weight: 700; margin: 0 4px; text-decoration: none; font-size: 16px;">1</a>
    <a href="http://localhost:8080?score=2" style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: #ffedd5; color: #9a3412; font-weight: 700; margin: 0 4px; text-decoration: none; font-size: 16px;">2</a>
    <a href="http://localhost:8080?score=3" style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: #fef9c3; color: #854d0e; font-weight: 700; margin: 0 4px; text-decoration: none; font-size: 16px;">3</a>
    <a href="http://localhost:8080?score=4" style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: #dcfce7; color: #166534; font-weight: 700; margin: 0 4px; text-decoration: none; font-size: 16px;">4</a>
    <a href="http://localhost:8080?score=5" style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 10px; background: #bbf7d0; color: #14532d; font-weight: 700; margin: 0 4px; text-decoration: none; font-size: 16px;">5</a>
  </div>
  
  <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0 0;">Takes less than 30 seconds · Your feedback directly shapes our roadmap</p>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-cart-abandonment",
    id: "tpl-cart-abandonment",
    name: "E-Commerce Cart Abandonment Recovery",
    category: "E-Commerce",
    subject: "Did you forget something, {{name}}? Your cart is saved! 🛒",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #e11d48; padding: 28px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Your Cart is Waiting for You!</h1>
    <p style="color: #ffe4e6; margin: 6px 0 0 0; font-size: 14px;">We reserved your items for the next 24 hours</p>
  </div>
  <div style="padding: 30px 28px;">
    <p style="font-size: 15px; margin-top: 0;">Hi {{name}},</p>
    <p style="color: #475569; font-size: 15px;">It looks like you left something behind in your shopping cart. Don't worry, we've saved everything so you can pick up right where you left off.</p>
    
    <div style="background: #fff1f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 18px; margin: 24px 0;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h4 style="margin: 0; font-size: 15px; color: #881337;">Premium Subscription / Plan</h4>
          <span style="font-size: 12px; color: #9f1239;">Qty: 1 · Instant Access</span>
        </div>
        <div style="font-size: 18px; font-weight: 800; color: #e11d48;">Special Price</div>
      </div>
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="http://localhost:8080" style="background: #e11d48; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.3);">Complete Your Order Now &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">{{company}} Orders · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-trial-ending",
    id: "tpl-trial-ending",
    name: "SaaS Trial Ending & Upgrade Reminder",
    category: "Billing",
    subject: "Your {{company}} free trial expires in 3 days ⏰",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #0f172a; padding: 32px 24px; text-align: center;">
    <div style="display: inline-block; background: #334155; color: #fbbf24; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 8px;">TRIAL EXPIRING</div>
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">Keep Your Automations Running</h1>
  </div>
  <div style="padding: 28px;">
    <p style="font-size: 15px; margin-top: 0;">Hi {{name}},</p>
    <p style="color: #475569; font-size: 15px;">Your 14-day free trial of {{company}} will expire in <strong>3 days</strong>. To ensure your scheduled campaigns, webhooks, and active drip workflows continue without interruption, please select an active plan.</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h4 style="margin: 0 0 10px 0; font-size: 15px; color: #0f172a;">What you keep with Pro:</h4>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px;">
        <li style="margin-bottom: 6px;">Unlimited monthly email sending</li>
        <li style="margin-bottom: 6px;">Multi-step visual workflow journeys with condition branching</li>
        <li style="margin-bottom: 6px;">Dedicated high-reputation SMTP delivery with Gmail & Brevo</li>
        <li>Priority live support & 99.9% uptime SLA</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 26px 0 10px 0;">
      <a href="http://localhost:8080" style="background: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Upgrade My Account &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">{{company}} Billing Team · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-case-study",
    id: "tpl-case-study",
    name: "Customer Case Study & Success Story",
    category: "Case Study",
    subject: "How Acme Corp increased open rates by 340% with {{company}} 📊",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #0d9488 0%, #115e59 100%); padding: 36px 24px; text-align: center;">
    <span style="background: rgba(255,255,255,0.25); color: #ffffff; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; text-transform: uppercase;">Customer Spotlight</span>
    <h1 style="color: #ffffff; margin: 16px 0 8px 0; font-size: 26px; font-weight: 800;">340% Lift in Email Conversions</h1>
    <p style="color: #ccfbf1; margin: 0; font-size: 15px;">See how Acme Corp transformed their customer onboarding</p>
  </div>
  <div style="padding: 30px 28px;">
    <p style="font-size: 15px; margin-top: 0;">Hi {{name}},</p>
    <p style="color: #475569; font-size: 15px;">When Acme Corp first switched to {{company}}, their emails were frequently landing in the promotions folder with open rates under 14%.</p>
    
    <div style="background: #f0fdfa; border-left: 4px solid #0d9488; padding: 18px 20px; border-radius: 0 10px 10px 0; margin: 22px 0;">
      <p style="margin: 0; font-style: italic; color: #134e4a; font-size: 15px;">"Within 2 weeks of migrating to SendFlow Studio and implementing their 3-day delay condition workflows, our open rates surged from 14% to 48%."</p>
      <div style="margin-top: 10px; font-size: 13px; font-weight: 700; color: #115e59;">— Sarah Jenkins, VP of Growth at Acme Corp</div>
    </div>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="http://localhost:8080" style="background: #0d9488; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Read the Full Case Study &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">{{company}} Stories · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-referral-vip",
    id: "tpl-referral-vip",
    name: "Referral Program & VIP Rewards",
    category: "Referral",
    subject: "Give $50, Get $50 - Share {{company}} with colleagues 🎁",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #c026d3 0%, #a21caf 100%); padding: 36px 24px; text-align: center;">
    <span style="font-size: 32px;">🎁</span>
    <h1 style="color: #ffffff; margin: 12px 0 6px 0; font-size: 26px; font-weight: 800;">Give $50, Get $50</h1>
    <p style="color: #fae8ff; margin: 0; font-size: 15px;">Earn credits every time a friend signs up for {{company}}</p>
  </div>
  <div style="padding: 30px 28px; text-align: center;">
    <p style="font-size: 15px; margin-top: 0; color: #475569;">Hi {{name}}, sharing great software with your team should be rewarding. When you invite friends to {{company}}, they get a $50 credit and you receive $50 towards your subscription.</p>
    
    <div style="background: #fdf4ff; border: 1px solid #f5d0fe; padding: 14px; border-radius: 10px; margin: 20px auto; max-width: 360px;">
      <div style="font-size: 11px; text-transform: uppercase; color: #a21caf; font-weight: 700; margin-bottom: 4px;">Your Personal Referral Link</div>
      <div style="font-family: monospace; font-size: 14px; color: #701a75; font-weight: 600;">http://localhost:8080/ref/{{name}}</div>
    </div>

    <div style="margin: 24px 0 10px 0;">
      <a href="http://localhost:8080" style="background: #c026d3; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Share Referral Link &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">{{company}} Rewards · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-winback-engagement",
    id: "tpl-winback-engagement",
    name: "Re-engagement & Win-back Campaign",
    category: "Engagement",
    subject: "We miss you, {{name}}! Here is what you've missed 👋",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; text-align: center; padding: 36px 28px;">
  <span style="font-size: 40px;">👋</span>
  <h1 style="color: #0f172a; margin: 16px 0 8px 0; font-size: 24px; font-weight: 800;">It's been a while, {{name}}</h1>
  <p style="color: #475569; font-size: 15px; margin-top: 0;">We noticed you haven't checked in recently. We've added brand-new features to {{company}} that we think you'll love.</p>
  
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: left;">
    <h4 style="margin: 0 0 8px 0; font-size: 14px; color: #0f172a; text-transform: uppercase;">Recent Additions:</h4>
    <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">✅ <strong>Same-day smart scheduler</strong> — pick any time today and auto-dispatch</p>
    <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">✅ <strong>AI-powered subject lines</strong> — boost open rates with one click</p>
    <p style="margin: 0 0 6px 0; font-size: 13px; color: #64748b;">✅ <strong>Direct Excel/CSV imports</strong> with automatic deduplication</p>
  </div>

  <div style="margin: 26px 0 10px 0;">
    <a href="http://localhost:8080" style="background: #0284c7; color: #ffffff; padding: 14px 34px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Jump Back In &rarr;</a>
  </div>
  
  <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">No longer interested? <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-security-alert",
    id: "tpl-security-alert",
    name: "Security Alert & New Login Notification",
    category: "Security",
    subject: "🛡️ New login detected for your {{company}} account",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: #0f172a; padding: 32px 24px; text-align: center;">
    <span style="font-size: 36px;">🛡️</span>
    <h1 style="color: #ffffff; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">Security Notification</h1>
    <p style="color: #94a3b8; margin: 0; font-size: 14px;">We noticed a recent sign-in to your account</p>
  </div>
  <div style="padding: 28px;">
    <p style="font-size: 15px; margin-top: 0;">Hi {{name}},</p>
    <p style="color: #475569; font-size: 14px;">Your {{company}} account was recently signed into from a new browser or device. Here are the session details:</p>
    
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 13px;">
      <p style="margin: 0 0 6px 0; color: #334155;"><strong>Time:</strong> Just now</p>
      <p style="margin: 0 0 6px 0; color: #334155;"><strong>Device:</strong> Desktop / Web Browser</p>
      <p style="margin: 0; color: #334155;"><strong>Status:</strong> Successfully authenticated</p>
    </div>

    <p style="color: #475569; font-size: 14px;">If this was you, you can safely ignore this email. If you did not perform this login, please secure your account immediately.</p>

    <div style="text-align: center; margin: 24px 0 10px 0;">
      <a href="http://localhost:8080/reset-password" style="background: #ef4444; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">Secure Account & Reset Password &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">{{company}} Security Team · Automated Security Alert</p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
  {
    _id: "tpl-year-in-review",
    id: "tpl-year-in-review",
    name: "Year-End Milestones & Growth Celebration",
    category: "Newsletter",
    subject: "🏆 Your 2026 Year in Review with {{company}}",
    html: `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
  <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 36px 24px; text-align: center;">
    <span style="font-size: 36px;">🎉</span>
    <h1 style="color: #ffffff; margin: 12px 0 6px 0; font-size: 26px; font-weight: 800;">Your Year in Review</h1>
    <p style="color: #e0e7ff; margin: 0; font-size: 15px;">Celebrating your email growth and engagement milestones</p>
  </div>
  <div style="padding: 30px 28px;">
    <p style="font-size: 15px; margin-top: 0;">Hi {{name}},</p>
    <p style="color: #475569; font-size: 15px;">What an incredible year! Together with {{company}}, you reached new heights with your audience. Here is a quick snapshot of what you accomplished:</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 24px 0;">
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; text-align: center;">
        <div style="font-size: 24px; font-weight: 800; color: #4f46e5;">99.4%</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Average Deliverability</div>
      </div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 10px; text-align: center;">
        <div style="font-size: 24px; font-weight: 800; color: #7c3aed;">3.2x</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Click-Through Growth</div>
      </div>
    </div>

    <p style="color: #475569; font-size: 14px;">Thank you for building with {{company}}. We have major new releases coming your way in the new year!</p>

    <div style="text-align: center; margin: 28px 0 10px 0;">
      <a href="http://localhost:8080/analytics" style="background: #4f46e5; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 15px; display: inline-block;">Explore Full Year Analytics &rarr;</a>
    </div>
  </div>
  <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
    <p style="margin: 0;">{{company}} Year-End Recap · <a href="{{unsubscribe_link}}" style="color: #64748b;">Unsubscribe</a></p>
  </div>
</div>`,
    createdAt: new Date().toISOString(),
  },
];

