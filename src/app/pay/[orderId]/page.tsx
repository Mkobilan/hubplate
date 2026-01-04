"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CheckCircle, AlertCircle, CreditCard, DollarSign, QrCode, Gift } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface OrderDetails {
    id: string;
    location_id: string;
    table_number: string;
    order_type: string;
    subtotal: number;
    tax: number;
    total: number;
    payment_status: string;
    server_id?: string;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
    }>;
    delivery_fee?: number;
}

export default function PaymentPage() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [tip, setTip] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loyaltyPhone, setLoyaltyPhone] = useState("");
    const [checkingLoyalty, setCheckingLoyalty] = useState(false);
    const [loyaltyCustomer, setLoyaltyCustomer] = useState<any>(null);
    const [availableRewards, setAvailableRewards] = useState<any[]>([]);
    const [appliedReward, setAppliedReward] = useState<any>(null);
    const [showLoyaltyField, setShowLoyaltyField] = useState(true);

    useEffect(() => {
        const fetchOrderAndCreatePayment = async () => {
            try {
                // Fetch order details
                const orderRes = await fetch(`/api/orders/${orderId}`);
                if (!orderRes.ok) throw new Error("Order not found");
                const orderData = await orderRes.json();

                if (orderData.payment_status === "paid") {
                    setOrder(orderData);
                    setLoading(false);
                    return;
                }

                setOrder(orderData);
                setTip(Number(orderData.tip) || 0);

                // Create payment intent
                const paymentRes = await fetch("/api/stripe/payment-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId,
                        amount: (Number(orderData.subtotal) || 0) + (Number(orderData.tax) || 0) + (Number(orderData.delivery_fee) || 0),
                        tip: Number(orderData.tip) || 0
                    })
                });

                if (!paymentRes.ok) throw new Error("Failed to create payment");
                const { clientSecret } = await paymentRes.json();
                setClientSecret(clientSecret);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchOrderAndCreatePayment();
    }, [orderId]);

    const calculateDiscount = (reward: any) => {
        if (!reward || !order) return 0;
        if (reward.reward_type === "percentage_off") {
            const base = order.subtotal || order.total || 0;
            return (base * reward.reward_value) / 100;
        }
        return reward.reward_value;
    };

    const currentDiscount = calculateDiscount(appliedReward);

    // Update payment intent when tip or discount changes
    useEffect(() => {
        if (!order || !clientSecret) return;

        const updateIntent = async () => {
            try {
                const res = await fetch("/api/stripe/payment-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        orderId,
                        amount: (Number(order.subtotal) || 0) + (Number(order.tax) || 0) + (Number(order.delivery_fee) || 0),
                        tip,
                        discountAmount: currentDiscount,
                        pointsRedeemed: appliedReward?.points_required || 0
                    })
                });
                if (!res.ok) throw new Error("Failed to update payment amount");
            } catch (err) {
                console.error("Update intent error:", err);
            }
        };

        const timer = setTimeout(updateIntent, 500);
        return () => clearTimeout(timer);
    }, [tip, appliedReward, order, currentDiscount]);

    const handleLoyaltyCheckIn = async () => {
        if (!loyaltyPhone || !order) return;
        setCheckingLoyalty(true);
        try {
            const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(loyaltyPhone)}&locationId=${order.location_id}`);
            const data = await res.json();
            if (data.found) {
                setLoyaltyCustomer(data.customer);
                setAvailableRewards(data.availableRewards || []);
                setShowLoyaltyField(false);
            } else {
                // Instead of an error, we just show the name/email fields below 
                // by staying in the loyalty flow but acknowledging it's a new sign-up
                setShowLoyaltyField(false);
                setLoyaltyCustomer(null);
            }
        } catch (err) {
            setError("Failed to look up loyalty account.");
        } finally {
            setCheckingLoyalty(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-slate-400">Loading your bill...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-slate-100 mb-2">Oops!</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <a href="/" className="btn btn-primary">Go Home</a>
                </div>
            </div>
        );
    }

    if (order?.payment_status === "paid") {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <CheckCircle className="h-20 w-20 text-green-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-slate-100 mb-2">Thank You!</h1>
                    <p className="text-slate-400 mb-2">Your payment has been received.</p>
                    <p className="text-2xl font-bold text-orange-400">{formatCurrency(order.total)}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 px-4">
            <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-orange-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <QrCode className="h-8 w-8 text-orange-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-100 mb-1">Your Bill</h1>
                    <p className="text-slate-400">
                        {order?.order_type === "dine_in" ? `Table ${order.table_number}` : order?.order_type?.toUpperCase()}
                    </p>
                </div>

                {/* Loyalty & Rewards */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Gift className="h-5 w-5 text-orange-400" />
                        <h3 className="font-bold text-slate-100">Loyalty Rewards</h3>
                    </div>

                    {showLoyaltyField ? (
                        <div className="space-y-3">
                            <p className="text-xs text-slate-400">Enter your phone number to earn or redeem points.</p>
                            <div className="flex gap-2">
                                <input
                                    type="tel"
                                    placeholder="Phone Number"
                                    className="input text-sm flex-1"
                                    value={loyaltyPhone}
                                    onChange={(e) => setLoyaltyPhone(e.target.value)}
                                />
                                <button
                                    onClick={handleLoyaltyCheckIn}
                                    disabled={checkingLoyalty || !loyaltyPhone}
                                    className="btn btn-secondary py-2 px-4 text-sm"
                                >
                                    {checkingLoyalty ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check In"}
                                </button>
                            </div>
                        </div>
                    ) : loyaltyCustomer ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                <div>
                                    <p className="text-xs text-orange-400 font-bold uppercase">Member Check-In</p>
                                    <p className="text-sm font-medium text-slate-200">
                                        Hi, {loyaltyCustomer.first_name || "Member"}!
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-orange-400">{loyaltyCustomer.loyalty_points || 0}</p>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Available Points</p>
                                </div>
                            </div>

                            {availableRewards.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-400 font-medium">Available Rewards:</p>
                                    <div className="space-y-2">
                                        {availableRewards.map((reward) => {
                                            const canAfford = (loyaltyCustomer.loyalty_points || 0) >= reward.points_required;
                                            const isApplied = appliedReward?.id === reward.id;
                                            return (
                                                <button
                                                    key={reward.id}
                                                    disabled={!canAfford && !isApplied}
                                                    onClick={() => setAppliedReward(isApplied ? null : reward)}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${isApplied
                                                        ? "bg-orange-500 border-orange-500 text-white"
                                                        : canAfford
                                                            ? "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600"
                                                            : "bg-slate-900/20 border-slate-800 text-slate-600 grayscale opacity-50"
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Gift className="h-4 w-4" />
                                                        <div>
                                                            <p className="text-sm font-bold">{reward.name}</p>
                                                            <p className="text-[10px] opacity-70">{reward.points_required} Points Required</p>
                                                        </div>
                                                    </div>
                                                    {isApplied ? (
                                                        <CheckCircle className="h-4 w-4" />
                                                    ) : !canAfford && (
                                                        <span className="text-[10px] font-bold">LOCKED</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setLoyaltyCustomer(null);
                                    setAppliedReward(null);
                                    setShowLoyaltyField(true);
                                }}
                                className="text-[10px] text-slate-500 hover:text-slate-300 underline"
                            >
                                Not you? Sign out
                            </button>
                        </div>
                    ) : null}
                </div>

                {/* Order Items */}
                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 mb-6">
                    <div className="space-y-3 mb-4">
                        {order?.items?.map((item, i) => (
                            <div key={i} className="flex justify-between">
                                <span className="text-slate-300">
                                    {item.quantity}x {item.name}
                                </span>
                                <span className="text-slate-400">
                                    {formatCurrency(item.price * item.quantity)}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-700 pt-3 space-y-2">
                        <div className="flex justify-between text-slate-400">
                            <span>Subtotal</span>
                            <span>{formatCurrency(order?.subtotal || 0)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                            <span>Tax</span>
                            <span>{formatCurrency(order?.tax || 0)}</span>
                        </div>
                        {tip > 0 && (
                            <div className="flex justify-between text-slate-400">
                                <span>Tip</span>
                                <span>{formatCurrency(tip)}</span>
                            </div>
                        )}
                        {(order?.delivery_fee || 0) > 0 && (
                            <div className="flex justify-between text-slate-400">
                                <span>Delivery Fee</span>
                                <span>{formatCurrency(Number(order?.delivery_fee) || 0)}</span>
                            </div>
                        )}
                        {appliedReward && (
                            <div className="flex justify-between text-green-400">
                                <span>Reward: {appliedReward.name}</span>
                                <span>-{formatCurrency(currentDiscount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold text-slate-100 pt-2 border-t border-slate-700">
                            <span>Total</span>
                            <span className="text-orange-400">
                                {formatCurrency(Math.max(0, (order?.total || 0) + (Number(order?.delivery_fee) || 0) + tip - currentDiscount))}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tip Selection */}
                <div className="mb-6">
                    <p className="text-sm text-slate-400 mb-3">Add a tip?</p>
                    <div className="grid grid-cols-4 gap-2">
                        {[0, 15, 18, 20].map(percent => {
                            const tipAmount = percent === 0 ? 0 : Math.round((order?.subtotal || 0) * percent) / 100;
                            const isSelected = tip === tipAmount;
                            return (
                                <button
                                    key={percent}
                                    onClick={() => setTip(tipAmount)}
                                    className={`py-2 px-3 rounded-lg border text-sm font-medium transition-all ${isSelected
                                        ? "bg-orange-500 border-orange-500 text-white"
                                        : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                                        }`}
                                >
                                    {percent === 0 ? "No Tip" : `${percent}%`}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Payment Form */}
                {clientSecret && (
                    <Elements
                        stripe={stripePromise}
                        options={{
                            clientSecret,
                            appearance: {
                                theme: "night",
                                variables: {
                                    colorPrimary: "#f97316",
                                    colorBackground: "#0f172a",
                                    colorText: "#f1f5f9",
                                    colorDanger: "#ef4444",
                                    borderRadius: "12px"
                                }
                            }
                        }}
                    >
                        <PaymentForm
                            orderId={orderId}
                            locationId={order?.location_id || ""}
                            serverId={order?.server_id}
                            total={(order?.total || 0) + tip - currentDiscount}
                            reward={appliedReward}
                            discountAmount={currentDiscount}
                            customerPhone={loyaltyCustomer?.phone || loyaltyPhone}
                            loyaltyCustomer={loyaltyCustomer}
                        />
                    </Elements>
                )}

                <p className="text-center text-xs text-slate-500 mt-6">
                    Payments powered by Stripe. Your card information is encrypted end-to-end.
                </p>
            </div>
        </div>
    );
}

function PaymentForm({ orderId, locationId, serverId, total, reward, discountAmount, customerPhone, loyaltyCustomer }: {
    orderId: string;
    locationId: string;
    serverId?: string;
    total: number;
    reward?: any;
    discountAmount: number;
    customerPhone?: string;
    loyaltyCustomer?: any;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Customer info states
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState(customerPhone || "");
    const [name, setName] = useState("");
    const [joinLoyalty, setJoinLoyalty] = useState(true);

    // Sync state when loyalty customer or phone prop changes
    useEffect(() => {
        if (customerPhone) setPhone(customerPhone);
        if (loyaltyCustomer?.email) setEmail(loyaltyCustomer.email);
        if (loyaltyCustomer?.first_name || loyaltyCustomer?.last_name) {
            setName(`${loyaltyCustomer.first_name || ""} ${loyaltyCustomer.last_name || ""}`.trim());
        }
    }, [customerPhone, loyaltyCustomer]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        setError(null);

        // 1. Save customer / loyalty info first if provided
        if (email || phone || name) {
            try {
                const nameParts = name.trim().split(/\s+/);
                const firstName = nameParts[0] || "";
                const lastName = nameParts.slice(1).join(" ");

                const customerRes = await fetch("/api/customers", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: email.trim() || null,
                        phone: phone.trim() || null,
                        firstName,
                        lastName,
                        locationId,
                        orderId,
                        serverId, // Pass serverId for attribution
                        marketingOptIn: joinLoyalty,
                        discountAmount: discountAmount || 0,
                        pointsRedeemed: reward?.points_required || 0
                    })
                });

                if (!customerRes.ok) {
                    const errorData = await customerRes.json();
                    console.error("Customer API error response:", errorData);
                } else {
                    console.log("Customer info saved successfully");
                }
            } catch (err) {
                console.error("Failed to save customer info:", err);
            }
        }

        // 2. Confirm payment
        const { error: paymentError } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/pay/${orderId}/success`,
                receipt_email: email || undefined,
            }
        });

        if (paymentError) {
            setError(paymentError.message || "Payment failed");
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4 space-y-4">
                <p className="text-sm font-medium text-slate-100">Contact Information (Optional)</p>
                <div className="grid gap-3">
                    <input
                        type="text"
                        placeholder="Full Name"
                        className="input text-sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="email"
                            placeholder="Email"
                            className="input text-sm"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="tel"
                            placeholder="Phone"
                            className="input text-sm"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    <input
                        type="checkbox"
                        id="loyalty"
                        checked={joinLoyalty}
                        onChange={(e) => setJoinLoyalty(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-orange-500 focus:ring-orange-500"
                    />
                    <label htmlFor="loyalty" className="text-xs text-slate-400">
                        Join our loyalty program for rewards and faster checkout next time.
                    </label>
                </div>
            </div>

            <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                <p className="text-sm font-medium text-slate-100 mb-4">Payment Details</p>
                <PaymentElement />
            </div>

            {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!stripe || loading}
                className="btn btn-primary w-full py-4 text-lg font-bold"
            >
                {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                    <>
                        <CreditCard className="h-5 w-5" />
                        Pay {formatCurrency(total)}
                    </>
                )}
            </button>
        </form>
    );
}
