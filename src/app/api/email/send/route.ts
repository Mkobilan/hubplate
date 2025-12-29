import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user is owner or manager (Employee Check)
        const { data: employeeData } = await supabase
            .from("employees")
            .select("role")
            .eq("user_id", user.id)
            .eq("is_active", true)
            .single();

        // Verify if user is Organization Owner (Org Check)
        const { data: orgData } = await supabase
            .from("organizations")
            .select("id")
            .eq("owner_id", user.id)
            .single();

        const isEmployeeAuthorized = employeeData && ['owner', 'manager'].includes((employeeData as any).role?.toLowerCase());
        const isOrgOwner = !!orgData;

        if (!isEmployeeAuthorized && !isOrgOwner) {
            return NextResponse.json({ error: "Permission denied" }, { status: 403 });
        }

        const body = await req.json();
        const { customerId, promoCode, type, recommendation } = body;

        if (!customerId) {
            return NextResponse.json({ error: "Customer ID required" }, { status: 400 });
        }

        // Fetch Customer Details
        const { data: customerData, error: custError } = await supabase
            .from("customers")
            .select("first_name, email, locations(name)")
            .eq("id", customerId)
            .single();

        const customer = customerData as any;

        if (custError || !customer || !customer.email) {
            return NextResponse.json({ error: "Customer not found or no email" }, { status: 404 });
        }

        // Get Resend Client
        const resend = getResendClient();
        if (!resend) {
            return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
        }

        // Fetch Organization/Location Email for Reply-To
        // Ideally we use the location's contact email, falling back to user email
        const replyTo = user.email || "support@hubplate.app";

        // Handle locations being returned as an array or object depending on relationship
        const locName = Array.isArray(customer.locations)
            ? customer.locations[0]?.name
            : (customer.locations as any)?.name;

        const restaurantName = locName || "HubPlate Restaurant";

        // Construct Email Content
        let subject = `A Special Offer from ${restaurantName}`;
        if (type === 'retention') subject = `We miss you at ${restaurantName}!`;
        else if (type === 'upsell') subject = `Something special for you at ${restaurantName}`;
        else if (type === 'vip') subject = `A VIP Gift from ${restaurantName}`;
        else if (type === 'ai-recommendation') subject = `Just for you: A special offer from ${restaurantName}`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .header { background-color: #1a1a1a; padding: 24px; text-align: center; }
    .header h1 { color: #f97316; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 32px 24px; color: #374151; line-height: 1.6; }
    .promo-box { background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
    .promo-code { font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; color: #ea580c; background: #ffffff; padding: 8px 16px; border-radius: 6px; display: inline-block; margin-top: 12px; }
    .footer { background-color: #f3f4f6; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
    .btn { display: inline-block; background-color: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px; }
  </style>
</head>
<body>
  <div style="padding: 40px 0;">
    <div class="container">
      <div class="header">
        <h1>${restaurantName}</h1>
      </div>
      <div class="content">
        <h2 style="margin-top: 0; color: #111827;">Hi ${customer.first_name || 'there'},</h2>
        <p style="font-size: 16px;">${recommendation?.reason || "We appreciate your loyal patronage and wanted to send you something special."}</p>
        
        <div class="promo-box">
          <p style="margin: 0 0 12px 0; font-weight: bold; font-size: 18px; color: #9a3412;">
            ${recommendation?.suggestion || "Enjoy this exclusive offer on your next visit:"}
          </p>
          <div class="promo-code">${promoCode}</div>
          <p style="font-size: 14px; margin-top: 16px; color: #ea580c;">Show this code to your server to redeem.</p>
        </div>

        <p>We look forward to seeing you again soon!</p>
        <p style="margin-bottom: 0;">Best regards,<br>The ${restaurantName} Team</p>
      </div>
      <div class="footer">
        <p>You received this email because you are a valued customer of ${restaurantName}.</p>
        <p>${locName || restaurantName} • Powered by HubPlate</p>
      </div>
    </div>
  </div>
</body>
</html>
    `;

        // Send Email
        // Note: We use the verified domain email, but set the Name to the restaurant
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: `${restaurantName} <${RESEND_FROM_EMAIL}>`,
            to: customer.email,
            replyTo: replyTo,
            subject: subject,
            html: htmlContent,
        });

        if (emailError) {
            console.error("Resend API Error:", emailError);
            return NextResponse.json({ error: emailError.message }, { status: 500 });
        }

        // Log the interaction (Optional: create a 'marketing_logs' table entry if needed)

        return NextResponse.json({ success: true, id: emailData?.id });

    } catch (err: any) {
        console.error("Error sending email:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
