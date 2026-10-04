/* ==================================================
   AG D-M TOP UP
   PAGE 1 + PAGE 2
   ONLY JAVASCRIPT
   ================================================== */

document.addEventListener("DOMContentLoaded", () => {

    /* ---------- PAGE REFERENCES ---------- */

    const page1 = document.getElementById("page-1");
    const page2 = document.getElementById("page-2");

    const loginBox = document.getElementById("login");
    const registerBox = document.getElementById("registration");
    const forgotBox = document.getElementById("forgot-password");

    /* ---------- HIDE PAGE 2 INITIALLY ---------- */

    if (page2) {
        page2.style.display = "none";
    }

    /* ---------- PAGE SWITCH ---------- */

    function showLogin() {
        loginBox.style.display = "block";
        registerBox.style.display = "none";
        forgotBox.style.display = "none";
    }

    function showRegister() {
        loginBox.style.display = "none";
        registerBox.style.display = "block";
        forgotBox.style.display = "none";
    }

    function showForgotPassword() {
        loginBox.style.display = "none";
        registerBox.style.display = "none";
        forgotBox.style.display = "block";
    }

    /* ---------- INITIAL VIEW ---------- */

    showLogin();


    /* ---------- NAVIGATION LINKS ---------- */

    document.querySelectorAll('a[href="#registration"]').forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            showRegister();
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });


    document.querySelectorAll('a[href="#login"]').forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            showLogin();
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });


    document.querySelectorAll('a[href="#forgot-password"]').forEach(link => {
        link.addEventListener("click", event => {
            event.preventDefault();
            showForgotPassword();
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    });


    /* ==================================================
       PAGE 1 — REGISTRATION
       ================================================== */

    const registrationForm =
        registerBox.querySelector("form");

    registrationForm.addEventListener("submit", event => {

        event.preventDefault();

        const name =
            document.getElementById("full-name").value.trim();

        const email =
            document.getElementById("register-email").value.trim();

        const password =
            document.getElementById("register-password").value;

        const confirmPassword =
            document.getElementById("confirm-password").value;


        if (!name || !email || !password || !confirmPassword) {
            alert("Please complete all fields.");
            return;
        }


        if (password.length < 8) {
            alert("Password must contain at least 8 characters.");
            return;
        }


        if (password !== confirmPassword) {
            alert("Passwords do not match.");
            return;
        }


        alert(
            "Registration form validated.\n\n" +
            "Real account creation requires your backend / Google Cloud authentication."
        );
    });


    /* ==================================================
       PAGE 1 — LOGIN
       ================================================== */

    const loginForm =
        loginBox.querySelector("form");

    loginForm.addEventListener("submit", event => {

        event.preventDefault();

        const email =
            document.getElementById("login-email").value.trim();

        const password =
            document.getElementById("login-password").value;


        if (!email || !password) {
            alert("Please enter your login information.");
            return;
        }


        alert(
            "Login form submitted.\n\n" +
            "Connect your real authentication backend / Google Cloud here."
        );
    });


    /* ==================================================
       PAGE 1 — FORGOT PASSWORD
       ================================================== */

    const forgotForm =
        forgotBox.querySelector("form");

    forgotForm.addEventListener("submit", event => {

        event.preventDefault();

        const email =
            document.getElementById("reset-email").value.trim();


        if (!email) {
            alert("Please enter your email or mobile number.");
            return;
        }


        alert(
            "Password reset request received.\n\n" +
            "Real OTP delivery requires a backend authentication service."
        );
    });


    /* ==================================================
       GOOGLE BUTTONS
       ================================================== */

    const googleButtons =
        document.querySelectorAll(
            'button[type="button"]'
        );


    googleButtons.forEach(button => {

        if (
            button.textContent
                .toLowerCase()
                .includes("google")
        ) {

            button.addEventListener("click", () => {

                /*
                 * REAL GOOGLE AUTHENTICATION
                 *
                 * This button is intentionally NOT a fake login.
                 *
                 * Google Cloud / Firebase Authentication
                 * configuration must be connected here.
                 */

                alert(
                    "Google Sign-In is ready for Google Cloud Authentication integration."
                );

            });

        }

    });


    /* ==================================================
       PAGE 2 — PRODUCT BUTTONS
       ================================================== */

    const productButtons =
        document.querySelectorAll(
            "#mega-offer article button, " +
            "#ff-topup article button, " +
            "#social-media article button"
        );


    productButtons.forEach(button => {

        button.addEventListener("click", () => {

            const product =
                button.closest("article");

            const productName =
                product.querySelector("h3")
                    ?.textContent
                    .trim();

            if (!productName) {
                return;
            }


            alert(
                "Selected Product:\n\n" +
                productName +
                "\n\nPackage / order system will be connected later."
            );

        });

    });


    /* ==================================================
       START ORDER
       ================================================== */

    const startOrderButton =
        document.querySelector(
            '#page-2 main > section:first-child button'
        );


    if (startOrderButton) {

        startOrderButton.addEventListener("click", () => {

            document.getElementById("mega-offer")
                ?.scrollIntoView({
                    behavior: "smooth"
                });

        });

    }


    /* ==================================================
       PAGE 2 NAVIGATION
       ================================================== */

    document.querySelectorAll(
        '#page-2 nav a[href^="#"]'
    ).forEach(link => {

        link.addEventListener("click", event => {

            const target =
                document.querySelector(
                    link.getAttribute("href")
                );

            if (target) {

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        });

    });

});
