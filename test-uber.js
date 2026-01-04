const UBER_DIRECT_CLIENT_ID = "pI2ZZD-qiRVdeU0kmjXhzWXQ2oms0EK5";
const UBER_DIRECT_CLIENT_SECRET = "KHYchU7myxfmds_WrAPPhPFlLWdy2Qo1JGDfIj5R";
const UBER_DIRECT_CUSTOMER_ID = "c78dfc74-8b7f-59b5-b1d6-051a1d05704b";

async function testUber() {
    console.log("Testing Uber Direct Auth...");

    try {
        const params = new URLSearchParams();
        params.append("client_id", UBER_DIRECT_CLIENT_ID);
        params.append("client_secret", UBER_DIRECT_CLIENT_SECRET);
        params.append("grant_type", "client_credentials");
        params.append("scope", "eats.deliveries direct.organizations");

        const authResponse = await fetch("https://login.uber.com/oauth/v2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
        });

        if (!authResponse.ok) {
            const error = await authResponse.text();
            console.error("Auth Failed:", error);
            return;
        }

        const { access_token } = await authResponse.json();
        console.log("Auth Success! Token acquired.");

        console.log("Testing Quote API (Chicago Test Address)...");
        const quoteResponse = await fetch(`https://api.uber.com/v1/customers/${UBER_DIRECT_CUSTOMER_ID}/delivery_quotes`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                pickup_address: "633 S Wabash Ave, Chicago, IL 60605",
                dropoff_address: "1200 S Indiana Ave, Chicago, IL 60605"
            })
        });

        const quoteText = await quoteResponse.text();
        console.log("Raw Response:", quoteText);

        if (!quoteResponse.ok) {
            console.error("Quote Failed:", quoteText);
        } else {
            const quoteData = JSON.parse(quoteText);
            console.log("Quote Success!", quoteData);
        }

        console.log("Checking Organizations Info...");
        const getOrgRes = await fetch(`https://api.uber.com/v1/direct/organizations/${UBER_DIRECT_CUSTOMER_ID}`, {
            headers: { "Authorization": `Bearer ${access_token}` }
        });
        console.log("Check Org Status:", getOrgRes.status);
        console.log("Check Org Body:", await getOrgRes.text());

        console.log("Testing Organizations API (Sub-org creation with /direct)...");
        const orgResponse = await fetch(`https://api.uber.com/v1/direct/organizations`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${access_token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                info: {
                    name: "Test Restaurant Hubplate v3",
                    address: {
                        street1: "633 S Wabash Ave",
                        city: "Chicago",
                        state: "IL",
                        zipcode: "60605",
                        country_iso2: "US"
                    },
                    billing_type: "BILLING_TYPE_CENTRALIZED"
                },
                hierarchy_info: {
                    parent_organization_id: UBER_DIRECT_CUSTOMER_ID
                }
            })
        });

        const orgText = await orgResponse.text();
        console.log("Org Response:", orgText);

    } catch (err) {
        console.error("Error during test:", err);
    }
}

testUber();
