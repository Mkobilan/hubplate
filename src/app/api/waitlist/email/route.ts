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

        const body = await req.json();
        const { waitlistId } = body;

        if (!waitlistId) {
            return NextResponse.json({ error: "Waitlist ID required" }, { status: 400 });
        }

        // Fetch Waitlist Entry
        const { data: entryData, error: entryError } = await supabase
            .from("waitlist")
            .select("*, locations(name)")
            .eq("id", waitlistId)
            .single();

        const entry = entryData as any; // Cast to any to bypass inference issues

        if (entryError || !entry) {
            return NextResponse.json({ error: "Waitlist entry not found" }, { status: 404 });
        }

        if (!entry.customer_email) {
            return NextResponse.json({ error: "No email address for this customer" }, { status: 400 });
        }

        // Get Resend Client
        const resend = getResendClient();
        if (!resend) {
            return NextResponse.json({ error: "Email service not configured" }, { status: 503 });
        }

        const locationName = (entry.locations as any)?.name || "The Restaurant";
        const replyTo = user.email || "support@hubplate.app";
        const subject = `Your table is ready at ${locationName}!`;

        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${subject}</title>
</head>
<body style="font-family: sans-serif; background-color: #f3f4f6; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; text-align: center;">
        <h1 style="color: #ea580c; margin-bottom: 20px;">Your Table is Ready!</h1>
        <p style="color: #4b5563; font-size: 18px; line-height: 1.5; margin-bottom: 30px;">
            Hi <strong>${entry.customer_name}</strong>,<br><br>
            Good news! Your table at <strong>${locationName}</strong> is now ready.
        </p>
        <p style="color: #4b5563; margin-bottom: 20px;">
            Please head to the host stand to be seated. We can't wait to serve you!
        </p>
        <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; color: #9ca3af;">
            <p>${locationName} • Powered by HubPlate</p>
        </div>
    </div>
</body>
</html>
    `;

        const { data, error } = await resend.emails.send({
            from: `${locationName} <${RESEND_FROM_EMAIL}>`,
            to: entry.customer_email,
            replyTo: replyTo,
            subject: subject,
            html: htmlContent,
        });

        if (error) {
            console.error("Resend API Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data?.id });

    } catch (err: any) {
        console.error("Error sending email:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
