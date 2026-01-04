async function testPost() {
    const url = "https://www.hubplate.app/api/online-order";
    const body = {
        locationId: "c7964467-f9d2-452f-9813-f9a888a70c7b", // Downtown Grill Main
        orderType: "delivery",
        deliveryAddress: "633 S Wabash Ave, Chicago, IL 60605",
        deliveryFee: 5.99,
        uberQuoteId: "test_quote_id",
        items: [{
            id: "test_item",
            menu_item_id: "test_mi",
            name: "Test Burger",
            price: 10.00,
            quantity: 1
        }],
        subtotal: 10.00,
        tax: 1.00,
        total: 16.99
    };

    console.log("Testing POST to", url);

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        console.log("Status:", response.status);
        console.log("Response:", await response.text());
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

testPost();
