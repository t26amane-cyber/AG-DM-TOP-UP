// ==========================================
// AG-DM-TOP-UP | SCRIPT.JS
// ==========================================

let orders = [];

// ------------------------------------------
// PAGE NAVIGATION
// ------------------------------------------

function showPage(page, button) {

    document.querySelectorAll(".page").forEach(function (p) {
        p.classList.remove("active");
    });

    const selectedPage = document.getElementById(page);

    if (selectedPage) {
        selectedPage.classList.add("active");
    }

    document.querySelectorAll(".nav button").forEach(function (b) {
        b.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ------------------------------------------
// ADD MONEY
// ------------------------------------------

function addMoney() {

    const moneyPage = document.getElementById("money");

    if (moneyPage) {

        document.querySelectorAll(".page").forEach(function (p) {
            p.classList.remove("active");
        });

        moneyPage.classList.add("active");

        document.querySelectorAll(".nav button").forEach(function (b) {
            b.classList.remove("active");
        });
    }

    alert(
        "ADD MONEY\n\n" +
        "Payment methods will be connected here."
    );
}


// ------------------------------------------
// NOTIFICATION
// ------------------------------------------

function notification() {

    alert(
        "🔔 NOTIFICATIONS\n\n" +
        "No new notifications."
    );
}


// ------------------------------------------
// BUY PRODUCT
// ------------------------------------------

function buyProduct(name, price) {

    const confirmBuy = confirm(
        "🛒 ORDER CONFIRMATION\n\n" +
        "Product: " + name + "\n" +
        "Price: ৳" + price + " BDT\n\n" +
        "Do you want to place this order?"
    );

    if (!confirmBuy) {
        return;
    }

    const order = {
        id: Date.now(),
        name: name,
        price: price,
        time: new Date().toLocaleString()
    };

    orders.push(order);

    saveOrders();

    updateOrders();

    alert(
        "✅ ORDER CREATED\n\n" +
        name + "\n" +
        "৳" + price + " BDT"
    );
}


// ------------------------------------------
// SAVE ORDERS
// ------------------------------------------

function saveOrders() {

    localStorage.setItem(
        "ag_topup_orders",
        JSON.stringify(orders)
    );
}


// ------------------------------------------
// LOAD ORDERS
// ------------------------------------------

function loadOrders() {

    const savedOrders =
        localStorage.getItem("ag_topup_orders");

    if (savedOrders) {

        try {

            orders = JSON.parse(savedOrders);

        } catch (error) {

            orders = [];
        }
    }

    updateOrders();
}


// ------------------------------------------
// SHOW ORDERS
// ------------------------------------------

function updateOrders() {

    const list =
        document.getElementById("orderList");

    if (!list) {
        return;
    }

    if (orders.length === 0) {

        list.innerHTML =
            "No orders yet.";

        return;
    }

    list.innerHTML = "";

    orders.forEach(function (order) {

        const item =
            document.createElement("div");

        item.style.cssText =
            "padding:18px;" +
            "margin-bottom:12px;" +
            "background:#10182b;" +
            "border:1px solid #075474;" +
            "border-radius:18px;" +
            "text-align:left;";

        item.innerHTML =

            "<b style='color:#18dfff'>" +
            "ORDER #" + order.id +
            "</b>" +

            "<br><br>" +

            "<strong style='color:#ffffff'>" +
            order.name +
            "</strong>" +

            "<br><br>" +

            "<span style='color:#ffc52c'>" +
            "৳" + order.price +
            " BDT" +
            "</span>" +

            "<br><br>" +

            "<small style='color:#75879c'>" +
            order.time +
            "</small>";

        list.appendChild(item);

    });
}


// ------------------------------------------
// CLEAR ORDERS
// ------------------------------------------

function clearOrders() {

    if (orders.length === 0) {

        alert("There are no orders.");

        return;
    }

    const confirmClear =
        confirm(
            "Are you sure you want to clear all orders?"
        );

    if (!confirmClear) {
        return;
    }

    orders = [];

    localStorage.removeItem(
        "ag_topup_orders"
    );

    updateOrders();

    alert("Orders cleared.");
}


// ------------------------------------------
// PAGE LOAD
// ------------------------------------------

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadOrders();

        console.log(
            "AG-DM-TOP-UP loaded successfully."
        );

    }
);
