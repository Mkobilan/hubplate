"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function PaymentSuccessPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const orderId = params.orderId as string;
    const paymentIntent = searchParams.get("payment_intent");

    const [loading, setLoading] = useState(true);
    const [order, setOrder] = useState<any>(null);
    const [rating, setRating] = useState<number | null>(null);

    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmitFeedback = async () => {
        if (!rating) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    rating,
                    comment,
                    customerName: order?.customer_name
                })
            });
            if (res.ok) {
                setSubmitted(true);
            }
        } catch (err) {
            console.error('Failed to send feedback:', err);
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (res.ok) {
                    const data = await res.json();
                    setOrder(data);
                }
            } catch (error) {
                console.error("Error fetching order:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-slate-400">Confirming payment...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Success Icon */}
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto animate-in zoom-in-50 duration-500">
                    <CheckCircle className="h-14 w-14 text-green-400" />
                </div>

                {/* Thank You Message */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                    <h1 className="text-3xl font-bold text-slate-100 mb-2">Thank You!</h1>
                    <p className="text-slate-400">
                        Your payment of <span className="text-orange-400 font-bold">{formatCurrency(order?.total || 0)}</span> was successful.
                    </p>
                </div>

                {/* Rating */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                    {!submitted ? (
                        <>
                            <p className="text-sm text-slate-400 mb-4">How was your experience?</p>
                            <div className="flex justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setRating(star)}
                                        className="p-2 rounded-lg transition-all hover:scale-110"
                                    >
                                        <Star
                                            className={`h-8 w-8 transition-colors ${rating && star <= rating
                                                ? "text-yellow-400 fill-yellow-400"
                                                : "text-slate-600 hover:text-yellow-400/50"
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>

                            {rating && (
                                <div className="space-y-4 animate-in fade-in zoom-in-95">
                                    <textarea
                                        placeholder="Add a comment (optional)..."
                                        className="input min-h-[100px] text-sm"
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                    />
                                    <button
                                        onClick={handleSubmitFeedback}
                                        disabled={submitting}
                                        className="btn btn-primary w-full"
                                    >
                                        {submitting ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            "Submit Feedback"
                                        )}
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-4 animate-in zoom-in-95">
                            <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-2" />
                            <p className="text-green-400 font-medium">
                                Thank you for your feedback!
                            </p>
                        </div>
                    )}
                </div>

                {/* Receipt Info */}
                <p className="text-xs text-slate-500 animate-in fade-in duration-500 delay-500">
                    Order #{orderId?.slice(0, 8).toUpperCase()} • {new Date().toLocaleDateString()}
                </p>
            </div>
        </div>
    );
}
