import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getResendClient, RESEND_FROM_EMAIL } from "@/lib/resend";
import { formatCurrency } from "@/lib/utils";

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { cardId, email, locationId } = body;

        if (!cardId || !email) {
            return NextResponse.json({ error: "Card ID and Email are required" }, { status: 400 });
        }

        // 1. Fetch Gift Card Details
        const { data: card, error: cardError } = await (supabase.from("gift_cards") as any)
            .select(`
                *,
                location:locations(name, address)
            `)
            .eq("id", cardId)
            .single();

        if (cardError || !card) {
            return NextResponse.json({ error: "Gift card not found" }, { status: 404 });
        }

        // 2. Fetch Location details separately if needed (though already joined)
        const locationName = card.location?.name || "Our Restaurant";

        // 3. Get Resend Client
        const resend = getResendClient();
        if (!resend) {
            return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
        }

        const subject = `Your ${locationName} Gift Card`;
        const replyTo = user.email || "support@hubplate.app";

        // 4. Construct Email Content
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 20px; color: #1f2937; }
    .container { max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
    .header { background-color: #111827; padding: 40px 20px; text-align: center; border-bottom: 6px solid #f97316; }
    .logo { color: #ffffff; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
    .body { padding: 40px 30px; text-align: center; }
    .greeting { font-size: 22px; font-weight: bold; margin-bottom: 20px; }
    .card-box { 
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border-radius: 16px;
        padding: 40px 20px;
        color: #ffffff;
        margin-bottom: 30px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        position: relative;
        overflow: hidden;
    }
    .card-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; margin-bottom: 10px; }
    .card-number { font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 4px; margin-bottom: 20px; color: #f97316; }
    .card-balance { font-size: 48px; font-weight: 800; }
    .instructions { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 30px; }
    .footer { background-color: #f9fafb; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">${locationName}</div>
    </div>
    <div class="body">
      <h2 class="greeting">Your Gift Card is Ready!</h2>
      <p class="instructions">Share this code or show it to your server the next time you visit us.</p>
      
      <div class="card-box">
        <div class="card-label">Gift Card Number</div>
        <div class="card-number">${card.card_number}</div>
        <div class="card-label">Current Balance</div>
        <div class="card-balance">${formatCurrency(card.current_balance)}</div>
      </div>

      <p class="instructions">
        We look forward to seeing you soon at ${locationName}.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} ${locationName}<br>
      Powered by <a href="https://hubplate.app" style="color: #64748b;">HubPlate</a>
    </div>
  </div>
</body>
</html>
        `;

        // 5. Send Email
        const { data: emailData, error: emailError } = await resend.emails.send({
            from: `${locationName} <${RESEND_FROM_EMAIL}>`,
            to: email,
            replyTo: replyTo,
            subject: subject,
            html: htmlContent,
        });

        if (emailError) {
            console.error("Resend API Error:", emailError);
            return NextResponse.json({ error: emailError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: emailData?.id });

    } catch (err: any) {
        console.error("Error sending gift card email:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
