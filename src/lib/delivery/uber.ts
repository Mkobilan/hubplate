const UBER_API_BASE = "https://api.uber.com/v1";

export interface UberAuthConfig {
    clientId: string;
    clientSecret: string;
    customerId: string;
}

export class UberDirectClient {
    private config: UberAuthConfig;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(config?: UberAuthConfig) {
        this.config = config || {
            clientId: process.env.UBER_DIRECT_CLIENT_ID || "",
            clientSecret: process.env.UBER_DIRECT_CLIENT_SECRET || "",
            customerId: process.env.UBER_DIRECT_CUSTOMER_ID || "",
        };
    }

    async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const params = new URLSearchParams();
            params.append("client_id", this.config.clientId);
            params.append("client_secret", this.config.clientSecret);
            params.append("grant_type", "client_credentials");
            params.append("scope", "eats.deliveries direct.organizations");

            const response = await fetch("https://login.uber.com/oauth/v2/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params.toString(),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Uber Auth Error Data:", errorData);
                throw new Error("Failed to authenticate with Uber Direct");
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

            return this.accessToken!;
        } catch (error: any) {
            console.error("Uber Auth Error:", error.message);
            throw error;
        }
    }

    private async getHeaders() {
        const token = await this.getAccessToken();
        return {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        };
    }

    /**
     * Create a sub-organization for a specific restaurant location.
     */
    async createSubOrganization(params: {
        name: string;
        address: {
            street1: string;
            city: string;
            state: string;
            zipcode: string;
            country_iso2: string;
        };
        billing_type?: "BILLING_TYPE_DECENTRALIZED" | "BILLING_TYPE_CENTRALIZED";
    }) {
        const headers = await this.getHeaders();
        try {
            const response = await fetch(`${UBER_API_BASE}/direct/organizations`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    info: {
                        name: params.name,
                        address: params.address,
                        billing_type: params.billing_type || "BILLING_TYPE_CENTRALIZED",
                    },
                    hierarchy_info: {
                        parent_organization_id: this.config.customerId,
                    }
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Uber Create Org Error Data:", errorData);
                throw new Error(`Uber API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error("Uber Create Org Error:", error.message);
            throw error;
        }
    }

    /**
     * Create a delivery quote.
     */
    async createQuote(params: {
        pickup_address: string;
        dropoff_address: string;
        pickup_phone_number?: string;
        dropoff_phone_number?: string;
        customerId?: string; // Optional: specific sub-org ID
    }) {
        const customerId = params.customerId || this.config.customerId;
        const headers = await this.getHeaders();
        try {
            const response = await fetch(
                `${UBER_API_BASE}/customers/${customerId}/delivery_quotes`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        pickup_address: params.pickup_address,
                        dropoff_address: params.dropoff_address,
                        pickup_phone_number: params.pickup_phone_number,
                        dropoff_phone_number: params.dropoff_phone_number,
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Uber Quote Error Data:", errorData);
                throw new Error(`Uber API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error("Uber Quote Error:", error.message);
            throw error;
        }
    }

    /**
     * Create a delivery from a quote.
     */
    async createDelivery(params: {
        quote_id: string;
        order_value: number;
        pickup_name: string;
        pickup_address: string;
        pickup_phone_number: string;
        dropoff_name: string;
        dropoff_address: string;
        dropoff_phone_number: string;
        manifest_items: Array<{ name: string; quantity: number }>;
        customerId?: string; // Optional: specific sub-org ID
    }) {
        const customerId = params.customerId || this.config.customerId;
        const headers = await this.getHeaders();
        try {
            const response = await fetch(
                `${UBER_API_BASE}/customers/${customerId}/deliveries`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        quote_id: params.quote_id,
                        order_value: params.order_value,
                        pickup_name: params.pickup_name,
                        pickup_address: params.pickup_address,
                        pickup_phone_number: params.pickup_phone_number,
                        dropoff_name: params.dropoff_name,
                        dropoff_address: params.dropoff_address,
                        dropoff_phone_number: params.dropoff_phone_number,
                        manifest_items: params.manifest_items,
                        test_specifications: (params as any).test_specifications
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Uber Delivery Error Data:", errorData);
                throw new Error(`Uber API Error: ${response.statusText}`);
            }

            return await response.json();
        } catch (error: any) {
            console.error("Uber Delivery Error:", error.message);
            throw error;
        }
    }
}

export const uberClient = new UberDirectClient({
    customerId: process.env.UBER_DIRECT_CUSTOMER_ID!,
    clientId: process.env.UBER_DIRECT_CLIENT_ID!,
    clientSecret: process.env.UBER_DIRECT_CLIENT_SECRET!,
});
