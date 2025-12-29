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
      .select("first_name, email, locations(name, google_review_link)")
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

    const googleReviewLink = Array.isArray(customer.locations)
      ? customer.locations[0]?.google_review_link
      : (customer.locations as any)?.google_review_link;

    const restaurantName = locName || "HubPlate Restaurant";

    // Construct Email Content
    let subject = `A Special Offer from ${restaurantName}`;
    if (type === 'retention') subject = `We miss you at ${restaurantName}!`;
    else if (type === 'upsell') subject = `Something special for you at ${restaurantName}`;
    else if (type === 'vip') subject = `A VIP Gift from ${restaurantName}`;
    else if (type === 'ai-recommendation') subject = `Just for you: A special offer from ${restaurantName}`;
    else if (type === 'review') subject = `How was your visit to ${restaurantName}?`;

    const isReviewRequest = type === 'review';
    const primaryButtonLink = isReviewRequest && googleReviewLink ? googleReviewLink : null;

    const htmlContent = `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <style>
    /* Reset & Basics */
    body, h1, h2, h3, p, div { margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; -webkit-font-smoothing: antialiased; }
    img { border: 0; line-height: 100%; outline: none; text-decoration: none; display: block; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; width: 100%; }
    
    /* Layout */
    .wrapper { background-color: #f3f4f6; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
    
    /* Design Elements */
    .header { background-color: #111827; padding: 32px 20px; text-align: center; border-bottom: 4px solid #f97316; }
    .logo-text { color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-transform: uppercase; }
    .accent { color: #f97316; }
    
    .body-content { padding: 40px 30px; text-align: center; }
    .greeting { font-size: 20px; font-weight: bold; color: #111827; margin-bottom: 16px; }
    .message { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 32px; }
    
    /* Promo Box */
    .promo-container { background-color: #fff7ed; border: 2px dashed #f97316; border-radius: 12px; padding: 30px; margin: 0 0 32px 0; }
    .promo-label { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #9a3412; letter-spacing: 1px; margin-bottom: 12px; display: block; }
    .promo-code { font-family: 'Courier New', monospace; font-size: 36px; font-weight: 800; color: #ea580c; background-color: #ffffff; padding: 12px 24px; border-radius: 8px; display: inline-block; letter-spacing: 2px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .promo-sub { font-size: 13px; color: #c2410c; margin-top: 12px; display: block; }
    
    /* Footer */
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer-text { font-size: 12px; color: #9ca3af; line-height: 1.5; }
    .unsubscribe { color: #9ca3af; text-decoration: underline; }
    
    /* Button */
    .btn { display: inline-block; background-color: #f97316; color: #ffffff; font-size: 16px; font-weight: bold; padding: 14px 28px; text-decoration: none; border-radius: 8px; margin-top: 20px; transition: background-color 0.2s; }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="container" role="presentation">
      
      <!-- Header -->
      <tr>
        <td class="header">
          <div class="logo-text">${restaurantName}<span class="accent">.</span></div>
        </td>
      </tr>
      
      <!-- Content -->
      <tr>
        <td class="body-content">
          <h2 class="greeting">Hi ${customer.first_name || 'Valued Guest'},</h2>
          <p class="message">
            ${isReviewRequest
        ? `Thank you for dining with us at ${restaurantName}. We strive to provide the best experience possible and would love to hear about your visit.`
        : (recommendation?.reason || "We appreciate your loyal patronage at " + restaurantName + ". As a token of our gratitude, we've prepared something special just for you.")
      }
          </p>
          
          ${isReviewRequest && primaryButtonLink ? `
            <div style="margin-bottom: 32px;">
                <a href="${primaryButtonLink}" class="btn">Leave a 5-Star Review</a>
                <p class="promo-sub">It only takes a moment and helps us a lot!</p>
            </div>
          ` : `
          <div class="promo-container">
            <span class="promo-label">${recommendation?.suggestion || "Your Exclusive Offer"}</span>
            <div class="promo-code">${promoCode}</div>
            <span class="promo-sub">Show this code to your server to redeem</span>
          </div>
          `}
          
          <p class="message" style="margin-bottom: 0;">
            ${isReviewRequest ? "Thank you for your support!" : "We look forward to serving you again soon!"}
          </p>
        </td>
      </tr>
      
      <!-- Footer -->
      <tr>
        <td class="footer">
          <p class="footer-text">
            You received this email because you've visited <strong>${restaurantName}</strong>.<br>
            ${locName || restaurantName} • Powered by <a href="https://hubplate.app" style="color: #6b7280; text-decoration: none;">HubPlate</a>
          </p>
        </td>
      </tr>
      
    </table>
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
