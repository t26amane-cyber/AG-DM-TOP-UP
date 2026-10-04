document.addEventListener("DOMContentLoaded", function () {

    const page1 = document.getElementById("page-1");
    const page2 = document.getElementById("page-2");

    const login = document.getElementById("login");
    const registration = document.getElementById("registration");
    const forgot = document.getElementById("forgot-password");

    function showLogin() {
        login.style.display = "block";
        registration.style.display = "none";
        forgot.style.display = "none";
        page1.style.display = "block";
        page2.style.display = "none";
    }

    function showRegistration() {
        login.style.display = "none";
        registration.style.display = "block";
        forgot.style.display = "none";
    }

    function showForgot() {
        login.style.display = "none";
        registration.style.display = "none";
        forgot.style.display = "block";
    }

    function showHome() {
        page1.style.display = "none";
        page2.style.display = "block";
        window.scrollTo(0, 0);
    }

    /* Initial page */

    showLogin();


    /* Login → Register */

    document.querySelectorAll(
        'a[href="#registration"]'
    ).forEach(function (link) {

        link.addEventListener("click", function (e) {
            e.preventDefault();
            showRegistration();
        });

    });


    /* Register → Login */

    document.querySelectorAll(
        'a[href="#login"]'
    ).forEach(function (link) {

        link.addEventListener("click", function (e) {
            e.preventDefault();
            showLogin();
        });

    });


    /* Forgot Password */

    document.querySelectorAll(
        'a[href="#forgot-password"]'
    ).forEach(function (link) {

        link.addEventListener("click", function (e) {
            e.preventDefault();
            showForgot();
        });

    });


    /* Login form */

    const loginForm = login.querySelector("form");

    loginForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const user =
            document.getElementById("login-email").value.trim();

        const password =
            document.getElementById("login-password").value;

        if (!user || !password) {
            alert("Please enter Email/Mobile and Password.");
            return;
        }

        /*
         * Real authentication will be connected
         * with Google Cloud / backend here.
         *
         * Page 2 is currently DEMO as requested.
         */

        showHome();
    });


    /* Registration */

    const registrationForm =
        registration.querySelector("form");

    registrationForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const name =
            document.getElementById("full-name").value.trim();

        const email =
            document.getElementById("register-email").value.trim();

        const password =
            document.getElementById("register-password").value;

        const confirm =
            document.getElementById("confirm-password").value;

        if (!name || !email || !password || !confirm) {
            alert("Please fill in all fields.");
            return;
        }

        if (password.length < 8) {
            alert("Password must be at least 8 characters.");
            return;
        }

        if (password !== confirm) {
            alert("Passwords do not match.");
            return;
        }

        /*
         * Real account creation will be connected
         * with Google Cloud / backend here.
         */

        alert(
            "Registration information is valid.\n" +
            "Google Cloud authentication will handle the real account."
        );

    });


    /* Forgot Password */

    const forgotForm =
        forgot.querySelector("form");

    forgotForm.addEventListener("submit", function (e) {

        e.preventDefault();

        const value =
            document.getElementById("reset-email").value.trim();

        if (!value) {
            alert("Enter your Email or Mobile Number.");
            return;
        }

        alert(
            "Password reset will be handled by the real authentication system."
        );

    });


    /* Google buttons */

    document.querySelectorAll("button").forEach(function (button) {

        if (
            button.textContent
                .toLowerCase()
                .includes("google")
        ) {

            button.classList.add("google-btn");

            button.addEventListener("click", function () {

                /*
                 * IMPORTANT:
                 * This is NOT fake Google authentication.
                 * Google Cloud OAuth configuration
                 * must be connected here.
                 */

                alert(
                    "Google Sign-In is not connected yet. " +
                    "Connect Google Cloud Authentication to enable it."
                );

            });

        }

    });


    /* Product buttons */

    document.querySelectorAll(
        "#mega-offer article button, " +
        "#ff-topup article button, " +
        "#social-media article button"
    ).forEach(function (button) {

        button.addEventListener("click", function () {

            const card = button.closest("article");

            const name =
                card.querySelector("h3").textContent.trim();

            alert(
                "Selected Product:\n\n" +
                name +
                "\n\nPackage/order system will be added later."
            );

        });

    });


    /* Start Order */

    const startOrder =
        document.querySelector(
            "#page-2 main > section:first-child button"
        );

    if (startOrder) {

        startOrder.addEventListener("click", function () {

            document.getElementById("mega-offer")
                .scrollIntoView({
                    behavior: "smooth"
                });

        });

    }

});
