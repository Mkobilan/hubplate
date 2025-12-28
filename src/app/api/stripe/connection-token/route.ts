
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Create a connection token
        const connectionToken = await stripe.terminal.connectionTokens.create();

        return NextResponse.json({ secret: connectionToken.secret });
    } catch (error) {
        console.error('Error creating connection token:', error);
        return NextResponse.json(
            { error: 'Failed to create connection token' },
            { status: 500 }
        );
    }
}
