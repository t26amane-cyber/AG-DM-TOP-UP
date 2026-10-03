/* =========================================================
   AG D-M TOP UP
   MAIN FRONTEND SCRIPT
========================================================= */


/* =========================================================
   API CONFIG
========================================================= */

/*
   যদি Backend Render-এ থাকে, এখানে আপনার Backend URL দিন।

   উদাহরণ:
   https://your-backend.onrender.com

   Local হলে:
   http://127.0.0.1:5000
*/

const API_URL = "http://127.0.0.1:5000";


/* =========================================================
   GLOBAL STATE
========================================================= */

let authToken = localStorage.getItem("ag_dm_token") || "";

let currentUser = null;

let selectedPaymentMethod = "bKash";

let refreshTimer = null;


/* =========================================================
   START APP
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    setupEvents();

    setupPackages();

    checkLogin();

});


/* =========================================================
   API HELPER
========================================================= */

async function api(path, options = {}) {

    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {

        const response = await fetch(
            `${API_URL}${path}`,
            {
                ...options,
                headers
            }
        );

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {
                ok: false,
                message: "Invalid server response."
            };
        }

        if (!response.ok) {

            throw new Error(
                data.message || `Server error: ${response.status}`
            );

        }

        return data;

    } catch (error) {

        if (
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError")
        ) {

            throw new Error(
                "Server connection failed. Check your backend URL."
            );

        }

        throw error;
    }
}


/* =========================================================
   EVENTS
========================================================= */

function setupEvents() {

    /* LOGIN */

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

    }


    /* REGISTER */

    const registerForm =
        document.getElementById("registerForm");

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            handleRegister
        );

    }


    /* FORGOT PASSWORD */

    const forgotForm =
        document.getElementById("forgotForm");

    if (forgotForm) {

        forgotForm.addEventListener(
            "submit",
            handleForgotPassword
        );

    }


    /* ORDER */

    const orderForm =
        document.getElementById("orderForm");

    if (orderForm) {

        orderForm.addEventListener(
            "submit",
            handleCreateOrder
        );

    }


    /* DEPOSIT */

    const depositForm =
        document.getElementById("depositForm");

    if (depositForm) {

        depositForm.addEventListener(
            "submit",
            handleDeposit
        );

    }

}


/* =========================================================
   CHECK LOGIN
========================================================= */

async function checkLogin() {

    if (!authToken) {

        showAuth();

        return;
    }


    try {

        const result =
            await api("/api/auth/me");

        if (!result.ok) {

            clearLogin();

            showAuth();

            return;
        }


        currentUser = result.user;

        showMainApp();

        updateUserUI();

        startRealtime();

        loadOrders();

        loadDeposits();

        loadTournaments();

        loadMyTournaments();

    } catch (error) {

        console.log(error);

        clearLogin();

        showAuth();

    }

}


/* =========================================================
   AUTH SCREEN
========================================================= */

function showAuth() {

    const authScreen =
        document.getElementById("authScreen");

    const mainApp =
        document.getElementById("mainApp");

    const bottomNav =
        document.getElementById("bottomNav");

    if (authScreen) {

        authScreen.classList.remove("hidden");

    }

    if (mainApp) {

        mainApp.classList.add("hidden");

    }

    if (bottomNav) {

        bottomNav.classList.add("hidden");

    }

    showLogin();

}


/* =========================================================
   MAIN APP
========================================================= */

function showMainApp() {

    const authScreen =
        document.getElementById("authScreen");

    const mainApp =
        document.getElementById("mainApp");

    const bottomNav =
        document.getElementById("bottomNav");

    if (authScreen) {

        authScreen.classList.add("hidden");

    }

    if (mainApp) {

        mainApp.classList.remove("hidden");

    }

    if (bottomNav) {

        bottomNav.classList.remove("hidden");

    }

    showPage("homePage");

}


/* =========================================================
   LOGIN
========================================================= */

async function handleLogin(event) {

    event.preventDefault();

    const login =
        document.getElementById("loginValue").value.trim();

    const password =
        document.getElementById("loginPassword").value;


    if (!login || !password) {

        toast("Enter username/email and password.");

        return;
    }


    const button =
        event.target.querySelector("button[type='submit']");

    setButtonLoading(button, true, "LOGGING IN...");


    try {

        const result = await api(
            "/api/auth/login",
            {
                method: "POST",

                body: JSON.stringify({
                    login,
                    password
                })
            }
        );


        authToken = result.token;

        currentUser = result.user;

        localStorage.setItem(
            "ag_dm_token",
            authToken
        );


        toast("Login successful.");

        showMainApp();

        updateUserUI();

        startRealtime();

        await refreshAll();

    } catch (error) {

        toast(error.message);

    } finally {

        setButtonLoading(
            button,
            false,
            "LOGIN"
        );

    }

}


/* =========================================================
   REGISTER
========================================================= */

async function handleRegister(event) {

    event.preventDefault();


    const name =
        document.getElementById("regName").value.trim();

    const username =
        document.getElementById("regUsername").value.trim();

    const email =
        document.getElementById("regEmail").value.trim();

    const password =
        document.getElementById("regPassword").value;

    const confirm_password =
        document.getElementById("regConfirmPassword").value;


    if (password !== confirm_password) {

        toast("Passwords do not match.");

        return;
    }


    const button =
        event.target.querySelector("button[type='submit']");

    setButtonLoading(
        button,
        true,
        "CREATING..."
    );


    try {

        const result = await api(
            "/api/auth/register",
            {
                method: "POST",

                body: JSON.stringify({
                    name,
                    username,
                    email,
                    password,
                    confirm_password
                })
            }
        );


        toast(
            result.message ||
            "Registration successful."
        );


        document.getElementById("registerForm").reset();

        showLogin();


        document.getElementById(
            "loginValue"
        ).value = username;


    } catch (error) {

        toast(error.message);

    } finally {

        setButtonLoading(
            button,
            false,
            "CREATE ACCOUNT"
        );

    }

}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

async function handleForgotPassword(event) {

    event.preventDefault();


    const email =
        document.getElementById("forgotEmail").value.trim();


    const button =
        event.target.querySelector("button[type='submit']");

    setButtonLoading(
        button,
        true,
        "SENDING..."
    );


    try {

        const result = await api(
            "/api/auth/forgot-password",
            {
                method: "POST",

                body: JSON.stringify({
                    email
                })
            }
        );


        /*
           Current backend returns a reset token for
           development/testing.

           Production-এ email service connect করলে
           this token should NOT be displayed.
        */

        if (result.reset_token) {

            showModal(`
                <h2>Password Reset</h2>

                <p style="
                    color:#8e9aaa;
                    font-size:12px;
                    line-height:1.6;
                    margin:12px 0;
                ">
                    Development reset token:
                </p>

                <div style="
                    padding:13px;
                    border-radius:12px;
                    background:#0b111b;
                    word-break:break-all;
                    color:#00e5ff;
                    font-size:11px;
                ">
                    ${escapeHtml(result.reset_token)}
                </div>

                <p style="
                    color:#8e9aaa;
                    font-size:10px;
                    margin-top:12px;
                ">
                    Production version-এ email reset link
                    ব্যবহার করা হবে।
                </p>

                <button
                    class="primary-btn"
                    onclick="closeModal()"
                >
                    CLOSE
                </button>
            `);

        } else {

            toast(result.message);

        }


        document.getElementById(
            "forgotForm"
        ).reset();


    } catch (error) {

        toast(error.message);

    } finally {

        setButtonLoading(
            button,
            false,
            "SEND RESET REQUEST"
        );

    }

}


/* =========================================================
   LOGIN / REGISTER / FORGOT UI
========================================================= */

function showLogin() {

    hideAuthPages();

    document
        .getElementById("loginPage")
        ?.classList.remove("hidden");

}


function showRegister() {

    hideAuthPages();

    document
        .getElementById("registerPage")
        ?.classList.remove("hidden");

}


function showForgot() {

    hideAuthPages();

    document
        .getElementById("forgotPage")
        ?.classList.remove("hidden");

}


function hideAuthPages() {

    document
        .getElementById("loginPage")
        ?.classList.add("hidden");

    document
        .getElementById("registerPage")
        ?.classList.add("hidden");

    document
        .getElementById("forgotPage")
        ?.classList.add("hidden");

}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(pageId) {

    document
        .querySelectorAll(".page")
        .forEach(page => {

            page.classList.remove("active");

        });


    const page =
        document.getElementById(pageId);


    if (!page) {

        return;
    }


    page.classList.add("active");


    document
        .querySelectorAll(".nav-item")
        .forEach(item => {

            item.classList.remove("active");

            if (
                item.dataset.page === pageId
            ) {

                item.classList.add("active");

            }

        });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    /* Load page data */

    if (pageId === "ordersPage") {

        loadOrders();

    }

    if (pageId === "addMoneyPage") {

        loadDeposits();

    }

    if (pageId === "tournamentPage") {

        loadTournaments();

        loadMyTournaments();

    }

    if (pageId === "profilePage") {

        loadProfile();

    }

}


/* =========================================================
   USER UI
========================================================= */

function updateUserUI() {

    if (!currentUser) {

        return;
    }


    const name =
        currentUser.name || "User";

    const username =
        currentUser.username || "";

    const email =
        currentUser.email || "";

    const balance =
        Number(currentUser.balance || 0).toFixed(2);


    setText(
        "welcomeName",
        name
    );


    setText(
        "homeBalance",
        balance
    );


    setText(
        "profileName",
        name
    );


    setText(
        "profileUsername",
        username
            ? `@${username}`
            : "@user"
    );


    setText(
        "profileBalance",
        balance
    );


    setText(
        "infoName",
        name
    );


    setText(
        "infoUsername",
        username
            ? `@${username}`
            : "-"
    );


    setText(
        "infoEmail",
        email
    );


    setText(
        "infoCreated",
        formatDate(
            currentUser.created_at
        )
    );


    const avatar =
        document.getElementById("profileAvatar");

    if (avatar) {

        avatar.textContent =
            name
                .charAt(0)
                .toUpperCase();

    }

}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {

    try {

        const result =
            await api("/api/profile");

        if (result.user) {

            currentUser = result.user;

            updateUserUI();

        }

    } catch (error) {

        console.log(error);

    }

}


/* =========================================================
   BALANCE
========================================================= */

async function loadBalance() {

    try {

        const result =
            await api("/api/balance");

        if (result.ok) {

            if (!currentUser) {

                currentUser = {};

            }

            currentUser.balance =
                Number(result.balance || 0);

            updateUserUI();

        }

    } catch (error) {

        console.log(error);

    }

}


/* =========================================================
   REAL-TIME REFRESH
========================================================= */

function startRealtime() {

    stopRealtime();


    /*
       Balance / order / deposit status checking.

       Backend polling keeps the user interface updated
       even without WebSocket support.
    */

    refreshTimer = setInterval(
        async () => {

            if (!authToken) {

                return;
            }

            try {

                await loadBalance();

                if (
                    document
                        .getElementById("ordersPage")
                        ?.classList.contains("active")
                ) {

                    await loadOrders();

                }

                if (
                    document
                        .getElementById("addMoneyPage")
                        ?.classList.contains("active")
                ) {

                    await loadDeposits();

                }

            } catch (error) {

                console.log(error);

            }

        },
        10000
    );

}


function stopRealtime() {

    if (refreshTimer) {

        clearInterval(refreshTimer);

        refreshTimer = null;

    }

}


/* =========================================================
   REFRESH ALL
========================================================= */

async function refreshAll() {

    await Promise.allSettled([

        loadProfile(),

        loadBalance(),

        loadOrders(),

        loadDeposits(),

        loadTournaments(),

        loadMyTournaments()

    ]);

}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

    try {

        await api(
            "/api/auth/logout",
            {
                method: "POST"
            }
        );

    } catch (error) {

        console.log(error);

    }


    clearLogin();

    stopRealtime();

    showAuth();

    toast("Logged out.");

}


function clearLogin() {

    authToken = "";

    currentUser = null;

    localStorage.removeItem(
        "ag_dm_token"
    );

}


/* =========================================================
   PACKAGE SELECTION
========================================================= */

function setupPackages() {

    const packages =
        document.querySelectorAll(
            "input[name='package']"
        );


    packages.forEach(item => {

        item.addEventListener(
            "change",
            updateSelectedPrice
        );

    });


    updateSelectedPrice();

}


function updateSelectedPrice() {

    const selected =
        document.querySelector(
            "input[name='package']:checked"
        );


    if (!selected) {

        return;
    }


    const price =
        selected.dataset.price || "0";


    setText(
        "selectedPrice",
        Number(price).toFixed(0)
    );

}


/* =========================================================
   CREATE ORDER
========================================================= */

async function handleCreateOrder(event) {

    event.preventDefault();


    const uid =
        document.getElementById(
            "orderUid"
        ).value.trim();


    const server =
        document.getElementById(
            "orderServer"
        ).value;


    const selected =
        document.querySelector(
            "input[name='package']:checked"
        );


    if (!uid) {

        toast("Enter player UID.");

        return;
    }


    if (!selected) {

        toast("Select a package.");

        return;
    }


    const diamonds =
        Number(selected.value);


    const amount =
        Number(selected.dataset.price);


    const product =
        `${diamonds} Diamonds`;


    const button =
        event.target.querySelector(
            "button[type='submit']"
        );


    setButtonLoading(
        button,
        true,
        "CREATING ORDER..."
    );


    try {

        const result = await api(
            "/api/orders",
            {
                method: "POST",

                body: JSON.stringify({
                    uid,
                    server,
                    product,
                    diamonds,
                    amount
                })
            }
        );


        showModal(`

            <div style="
                text-align:center;
            ">

                <div style="
                    font-size:48px;
                    margin-bottom:10px;
                ">
                    ✅
                </div>

                <h2>Order Created</h2>

                <p style="
                    color:#8e9aaa;
                    font-size:12px;
                    margin:10px 0 16px;
                ">
                    Your order has been submitted.
                </p>

                <div style="
                    padding:13px;
                    border-radius:12px;
                    background:#0b111b;
                    margin-bottom:12px;
                ">

                    <span style="
                        display:block;
                        color:#8e9aaa;
                        font-size:9px;
                    ">
                        ORDER ID
                    </span>

                    <strong style="
                        color:#00e5ff;
                        font-size:13px;
                    ">
                        ${escapeHtml(result.order_id)}
                    </strong>

                </div>

                <button
                    class="primary-btn"
                    onclick="
                        closeModal();
                        showPage('ordersPage');
                        loadOrders();
                    "
                >
                    VIEW MY ORDERS
                </button>

            </div>

        `);


        document
            .getElementById("orderForm")
            .reset();


        updateSelectedPrice();

        await loadBalance();

    } catch (error) {

        toast(error.message);

    } finally {

        setButtonLoading(
            button,
            false,
            "PLACE ORDER"
        );

    }

}


/* =========================================================
   LOAD ORDERS
========================================================= */

async function loadOrders() {

    const container =
        document.getElementById(
            "ordersList"
        );


    if (!container) {

        return;
    }


    try {

        const result =
            await api("/api/orders");


        const orders =
            result.orders || [];


        if (!orders.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div>📦</div>

                    <h3>No orders yet</h3>

                    <p>
                        Your orders will appear here.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            orders.map(
                renderOrder
            ).join("");


    } catch (error) {

        container.innerHTML = `

            <div class="empty-state">

                <div>⚠️</div>

                <h3>Could not load orders</h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>

            </div>

        `;

    }

}


/* =========================================================
   RENDER ORDER
========================================================= */

function renderOrder(order) {

    const status =
        String(
            order.status || "Pending"
        );


    const statusClass =
        status.toLowerCase();


    return `

        <div class="order-card">

            <div class="order-head">

                <div class="order-id">
                    ${escapeHtml(order.order_id)}
                </div>

                <div class="
                    order-status
                    ${statusClass}
                ">
                    ${escapeHtml(status)}
                </div>

            </div>


            <div class="order-product">
                ${escapeHtml(order.product)}
            </div>


            <div class="order-details">

                <div>
                    <span>UID</span>
                    <b>
                        ${escapeHtml(order.uid)}
                    </b>
                </div>

                <div>
                    <span>Server</span>
                    <b>
                        ${escapeHtml(order.server || "-")}
                    </b>
                </div>

                <div>
                    <span>Amount</span>
                    <b>
                        ৳${Number(order.amount || 0).toFixed(2)}
                    </b>
                </div>

                <div>
                    <span>Date</span>
                    <b>
                        ${formatDate(order.created_at)}
                    </b>
                </div>

            </div>

        </div>

    `;

}


/* =========================================================
   PAYMENT METHOD
========================================================= */

function selectPaymentMethod(button) {

    document
        .querySelectorAll(".method")
        .forEach(item => {

            item.classList.remove("active");

        });


    button.classList.add("active");


    selectedPaymentMethod =
        button.dataset.method;


    updatePaymentNumber();

}


function updatePaymentNumber() {

    const element =
        document.getElementById(
            "paymentNumber"
        );


    if (!element) {

        return;
    }


    /*
       Replace these numbers with your actual
       business payment numbers.
    */

    const numbers = {

        "bKash": "01XXXXXXXXX",

        "Nagad": "01XXXXXXXXX",

        "AG Wallet": "AG-WALLET"

    };


    element.textContent =
        numbers[selectedPaymentMethod] ||
        "01XXXXXXXXX";

}


/* =========================================================
   COPY PAYMENT NUMBER
========================================================= */

async function copyPaymentNumber() {

    const text =
        document.getElementById(
            "paymentNumber"
        )?.textContent.trim();


    if (!text) {

        return;
    }


    try {

        await navigator.clipboard.writeText(
            text
        );

        toast("Payment number copied.");

    } catch {

        toast("Copy failed.");

    }

}


/* =========================================================
   CREATE DEPOSIT
========================================================= */

async function handleDeposit(event) {

    event.preventDefault();


    const amount =
        Number(
            document.getElementById(
                "depositAmount"
            ).value
        );


    const transaction_id =
        document.getElementById(
            "transactionId"
        ).value.trim();


    if (amount <= 0) {

        toast("Enter a valid amount.");

        return;
    }


    if (!transaction_id) {

        toast("Enter transaction ID.");

        return;
    }


    const button =
        event.target.querySelector(
            "button[type='submit']"
        );


    setButtonLoading(
        button,
        true,
        "SUBMITTING..."
    );


    try {

        const result = await api(
            "/api/deposits",
            {
                method: "POST",

                body: JSON.stringify({

                    method:
                        selectedPaymentMethod,

                    amount,

                    transaction_id

                })
            }
        );


        toast(
            result.message ||
            "Deposit submitted."
        );


        document
            .getElementById(
                "depositForm"
            )
            .reset();


        await loadDeposits();


    } catch (error) {

        toast(error.message);

    } finally {

        setButtonLoading(
            button,
            false,
            "SUBMIT DEPOSIT"
        );

    }

}


/* =========================================================
   LOAD DEPOSITS
========================================================= */

async function loadDeposits() {

    const container =
        document.getElementById(
            "depositList"
        );


    if (!container) {

        return;
    }


    try {

        const result =
            await api("/api/deposits");


        const deposits =
            result.deposits || [];


        if (!deposits.length) {

            container.innerHTML = `

                <div class="
                    empty-state
                    small-empty
                ">
                    No deposits yet.
                </div>

            `;

            return;
        }


        container.innerHTML =
            deposits.map(
                renderDeposit
            ).join("");


    } catch (error) {

        container.innerHTML = `

            <div class="
                empty-state
                small-empty
            ">
                ${escapeHtml(error.message)}
            </div>

        `;

    }

}


/* =========================================================
   RENDER DEPOSIT
========================================================= */

function renderDeposit(deposit) {

    return `

        <div class="deposit-history">

            <div class="deposit-history-top">

                <strong>
                    ৳${Number(
                        deposit.amount || 0
                    ).toFixed(2)}
                </strong>

                <span class="deposit-status">
                    ${escapeHtml(
                        deposit.status
                    )}
                </span>

            </div>

            <small>
                ${escapeHtml(
                    deposit.method
                )}
                •
                ${escapeHtml(
                    deposit.transaction_id
                )}
            </small>

            <small>
                ${formatDate(
                    deposit.created_at
                )}
            </small>

        </div>

    `;

}


/* =========================================================
   TOURNAMENTS
========================================================= */

async function loadTournaments() {

    const container =
        document.getElementById(
            "tournamentList"
        );


    if (!container) {

        return;
    }


    try {

        const result =
            await api(
                "/api/tournaments"
            );


        const tournaments =
            result.tournaments || [];


        if (!tournaments.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div>🏆</div>

                    <h3>No tournaments</h3>

                    <p>
                        New tournaments will appear here.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            tournaments.map(
                renderTournament
            ).join("");


    } catch (error) {

        container.innerHTML = `

            <div class="empty-state">

                <div>⚠️</div>

                <h3>Unable to load</h3>

                <p>
                    ${escapeHtml(error.message)}
                </p>

            </div>

        `;

    }

}


/* =========================================================
   RENDER TOURNAMENT
========================================================= */

function renderTournament(tournament) {

    const players =
        Number(
            tournament.players || 0
        );


    const maxPlayers =
        Number(
            tournament.max_players || 0
        );


    const full =
        players >= maxPlayers;


    const closed =
        tournament.status !== "Open";


    const disabled =
        full || closed;


    return `

        <div class="tournament-card">

            <div class="tournament-head">

                <h3>
                    🏆
                    ${escapeHtml(
                        tournament.title
                    )}
                </h3>

                <span class="tournament-status">
                    ${escapeHtml(
                        tournament.status
                    )}
                </span>

            </div>


            <p>
                ${escapeHtml(
                    tournament.description ||
                    "AG D-M Tournament"
                )}
            </p>


            <div class="tournament-meta">

                <div>
                    <span>ENTRY</span>
                    <b>
                        ${
                            Number(
                                tournament.entry_fee
                            ) > 0
                            ? "৳" +
                              Number(
                                  tournament.entry_fee
                              ).toFixed(0)
                            : "FREE"
                        }
                    </b>
                </div>


                <div>
                    <span>PLAYERS</span>
                    <b>
                        ${players}/${maxPlayers}
                    </b>
                </div>


                <div>
                    <span>PRIZE</span>
                    <b>
                        ${escapeHtml(
                            tournament.prize ||
                            "-"
                        )}
                    </b>
                </div>

            </div>


            <button
                class="join-btn"
                ${
                    disabled
                    ? "disabled"
                    : ""
                }
                onclick="
                    joinTournament(
                        ${Number(tournament.id)}
                    )
                "
            >
                ${
                    full
                    ? "FULL"
                    : closed
                    ? "CLOSED"
                    : "JOIN TOURNAMENT"
                }
            </button>

        </div>

    `;

}


/* =========================================================
   JOIN TOURNAMENT
========================================================= */

async function joinTournament(
    tournamentId
) {

    if (!tournamentId) {

        return;
    }


    if (
        !confirm(
            "Join this tournament?"
        )
    ) {

        return;
    }


    try {

        const result =
            await api(
                `/api/tournaments/${tournamentId}/join`,
                {
                    method: "POST"
                }
            );


        toast(
            result.message ||
            "Tournament joined."
        );


        await loadBalance();

        await loadTournaments();

        await loadMyTournaments();


    } catch (error) {

        toast(error.message);

    }

}


/* =========================================================
   MY TOURNAMENTS
========================================================= */

async function loadMyTournaments() {

    const container =
        document.getElementById(
            "myTournamentList"
        );


    if (!container) {

        return;
    }


    try {

        const result =
            await api(
                "/api/my-tournaments"
            );


        const tournaments =
            result.tournaments || [];


        if (!tournaments.length) {

            container.innerHTML = `

                <div class="
                    empty-state
                    small-empty
                ">
                    No joined tournaments.
                </div>

            `;

            return;
        }


        container.innerHTML =
            tournaments.map(
                item => `

                    <div class="tournament-card">

                        <div class="tournament-head">

                            <h3>
                                🏆
                                ${escapeHtml(
                                    item.title
                                )}
                            </h3>

                            <span class="
                                tournament-status
                            ">
                                ${escapeHtml(
                                    item.status
                                )}
                            </span>

                        </div>

                        <p>
                            Joined:
                            ${formatDate(
                                item.joined_at
                            )}
                        </p>

                    </div>

                `
            ).join("");


    } catch (error) {

        console.log(error);

    }

}


/* =========================================================
   PROFILE SHORTCUT
========================================================= */

function openProfile() {

    showPage("profilePage");

    loadProfile();

}


/* =========================================================
   CHANGE PASSWORD
========================================================= */

function showChangePassword() {

    showModal(`

        <h2>Change Password</h2>

        <form
            id="changePasswordForm"
            style="
                display:flex;
                flex-direction:column;
                gap:9px;
                margin-top:15px;
            "
        >

            <label>
                Current Password
            </label>

            <input
                id="oldPassword"
                type="password"
                placeholder="Current password"
                required
            >


            <label>
                New Password
            </label>

            <input
                id="newPassword"
                type="password"
                placeholder="New password"
                required
            >


            <button
                class="primary-btn"
                type="submit"
            >
                CHANGE PASSWORD
            </button>

        </form>

    `);


    document
        .getElementById(
            "changePasswordForm"
        )
        .addEventListener(
            "submit",
            handleChangePassword
        );

}


async function handleChangePassword(event) {

    event.preventDefault();


    const old_password =
        document.getElementById(
            "oldPassword"
        ).value;


    const new_password =
        document.getElementById(
            "newPassword"
        ).value;


    if (new_password.length < 6) {

        toast(
            "New password must be at least 6 characters."
        );

        return;
    }


    const button =
        event.target.querySelector(
            "button"
        );


    setButtonLoading(
        button,
        true,
        "CHANGING..."
    );


    try {

        const result =
            await api(
                "/api/auth/change-password",
                {
                    method: "POST",

                    body: JSON.stringify({
                        old_password,
                        new_password
                    })
                }
            );


        toast(
            result.message ||
            "Password changed."
        );


        closeModal();


    } catch (error) {

        toast(error.message);

    } finally {

        setButtonLoading(
            button,
            false,
            "CHANGE PASSWORD"
        );

    }

}


/* =========================================================
   MODAL
========================================================= */

function showModal(content) {

    const modal =
        document.getElementById(
            "modal"
        );


    const modalContent =
        document.getElementById(
            "modalContent"
        );


    if (!modal || !modalContent) {

        return;
    }


    modalContent.innerHTML =
        content;


    modal.classList.remove(
        "hidden"
    );

}


function closeModal() {

    document
        .getElementById(
            "modal"
        )
        ?.classList.add(
            "hidden"
        );

}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;


function toast(message) {

    const element =
        document.getElementById(
            "toast"
        );


    const text =
        document.getElementById(
            "toastMessage"
        );


    if (!element || !text) {

        return;
    }


    text.textContent =
        message;


    element.classList.add(
        "show"
    );


    clearTimeout(
        toastTimer
    );


    toastTimer = setTimeout(
        () => {

            element.classList.remove(
                "show"
            );

        },
        2800
    );

}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(
    button,
    loading,
    text
) {

    if (!button) {

        return;
    }


    if (loading) {

        if (!button.dataset.originalText) {

            button.dataset.originalText =
                button.textContent;
        }

        button.disabled = true;

        button.textContent = text;

    } else {

        button.disabled = false;

        button.textContent =
            text ||
            button.dataset.originalText ||
            "";

    }

}


/* =========================================================
   HELPERS
========================================================= */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value ?? "";

    }

}


function formatDate(value) {

    if (!value) {

        return "-";
    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "-";
    }


    return date.toLocaleString(
        "en-BD",
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================================
   MODAL OUTSIDE CLICK
========================================================= */

document.addEventListener(
    "click",
    event => {

        const modal =
            document.getElementById(
                "modal"
            );


        if (
            modal &&
            event.target === modal
        ) {

            closeModal();

        }

    }
);


/* =========================================================
   INITIAL PAYMENT NUMBER
========================================================= */

updatePaymentNumber();
