import os
import sqlite3
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Flask, request, jsonify, g
from flask_cors import CORS


# =========================================================
# AG D-M TOP UP — BACKEND
# =========================================================

app = Flask(__name__)
CORS(app)

DATABASE = os.environ.get("DATABASE_PATH", "ag_dm_topup.db")

# Change this in production.
SECRET_KEY = os.environ.get("SECRET_KEY", "AG_DM_TOP_UP_CHANGE_THIS_SECRET")

app.config["JSON_SORT_KEYS"] = False


# =========================================================
# DATABASE
# =========================================================

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute("PRAGMA foreign_keys = ON")

    # USERS
    db.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
    """)

    # LOGIN SESSIONS
    db.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # ORDERS
    db.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL UNIQUE,
            user_id INTEGER NOT NULL,
            uid TEXT NOT NULL,
            server TEXT,
            product TEXT NOT NULL,
            diamonds INTEGER NOT NULL DEFAULT 0,
            amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # ADD MONEY / DEPOSITS
    db.execute("""
        CREATE TABLE IF NOT EXISTS deposits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deposit_id TEXT NOT NULL UNIQUE,
            user_id INTEGER NOT NULL,
            method TEXT NOT NULL,
            amount REAL NOT NULL,
            transaction_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # TOURNAMENTS
    db.execute("""
        CREATE TABLE IF NOT EXISTS tournaments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            entry_fee REAL NOT NULL DEFAULT 0,
            prize TEXT,
            max_players INTEGER NOT NULL DEFAULT 100,
            status TEXT NOT NULL DEFAULT 'Open',
            start_time TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # TOURNAMENT PARTICIPANTS
    db.execute("""
        CREATE TABLE IF NOT EXISTS tournament_players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tournament_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            joined_at TEXT NOT NULL,
            UNIQUE(tournament_id, user_id),
            FOREIGN KEY(tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    # PASSWORD RESET TOKENS
    db.execute("""
        CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            token TEXT NOT NULL UNIQUE,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)

    db.commit()
    db.close()


# =========================================================
# HELPERS
# =========================================================

def now():
    return datetime.now(timezone.utc)


def now_iso():
    return now().isoformat()


def hash_password(password):
    salt = secrets.token_hex(16)

    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        120000
    )

    return f"{salt}${digest.hex()}"


def verify_password(password, stored_hash):
    try:
        salt, old_digest = stored_hash.split("$", 1)

        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120000
        ).hex()

        return secrets.compare_digest(digest, old_digest)

    except Exception:
        return False


def make_token():
    return secrets.token_urlsafe(48)


def make_id(prefix):
    return f"{prefix}-{secrets.token_hex(6).upper()}"


def get_current_user():
    auth = request.headers.get("Authorization", "")

    if not auth.startswith("Bearer "):
        return None

    token = auth[7:].strip()

    if not token:
        return None

    db = get_db()

    row = db.execute("""
        SELECT users.*
        FROM sessions
        JOIN users ON users.id = sessions.user_id
        WHERE sessions.token = ?
        AND sessions.expires_at > ?
        AND users.is_active = 1
    """, (token, now_iso())).fetchone()

    return row


def login_required(function):
    @wraps(function)
    def wrapper(*args, **kwargs):

        user = get_current_user()

        if not user:
            return jsonify({
                "ok": False,
                "message": "Login required."
            }), 401

        g.current_user = user

        return function(*args, **kwargs)

    return wrapper


def user_json(user):
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "email": user["email"],
        "balance": round(float(user["balance"]), 2),
        "created_at": user["created_at"]
    }


# =========================================================
# HEALTH
# =========================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "ok": True,
        "service": "AG D-M TOP UP",
        "status": "online",
        "time": now_iso()
    })


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "ok": True,
        "database": "online",
        "service": "AG D-M TOP UP"
    })


# =========================================================
# REGISTER
# =========================================================

@app.route("/api/auth/register", methods=["POST"])
def register():

    data = request.get_json(silent=True) or {}

    name = str(data.get("name", "")).strip()
    username = str(data.get("username", "")).strip().lower()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))
    confirm_password = str(data.get("confirm_password", ""))

    if not name or not username or not email or not password:
        return jsonify({
            "ok": False,
            "message": "All fields are required."
        }), 400

    if len(username) < 3:
        return jsonify({
            "ok": False,
            "message": "Username must be at least 3 characters."
        }), 400

    if len(password) < 6:
        return jsonify({
            "ok": False,
            "message": "Password must be at least 6 characters."
        }), 400

    if password != confirm_password:
        return jsonify({
            "ok": False,
            "message": "Passwords do not match."
        }), 400

    if "@" not in email or "." not in email:
        return jsonify({
            "ok": False,
            "message": "Enter a valid email."
        }), 400

    db = get_db()

    existing = db.execute("""
        SELECT id
        FROM users
        WHERE username = ? OR email = ?
    """, (username, email)).fetchone()

    if existing:
        return jsonify({
            "ok": False,
            "message": "Username or email already exists."
        }), 409

    created = now_iso()

    db.execute("""
        INSERT INTO users
        (name, username, email, password_hash, balance, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
    """, (
        name,
        username,
        email,
        hash_password(password),
        created
    ))

    db.commit()

    return jsonify({
        "ok": True,
        "message": "Registration successful. Please login."
    }), 201


# =========================================================
# LOGIN
# =========================================================

@app.route("/api/auth/login", methods=["POST"])
def login():

    data = request.get_json(silent=True) or {}

    login_value = str(
        data.get("login", data.get("username", ""))
    ).strip().lower()

    password = str(data.get("password", ""))

    if not login_value or not password:
        return jsonify({
            "ok": False,
            "message": "Username/email and password are required."
        }), 400

    db = get_db()

    user = db.execute("""
        SELECT *
        FROM users
        WHERE username = ? OR email = ?
    """, (login_value, login_value)).fetchone()

    if not user or not verify_password(password, user["password_hash"]):
        return jsonify({
            "ok": False,
            "message": "Invalid login details."
        }), 401

    if not user["is_active"]:
        return jsonify({
            "ok": False,
            "message": "This account is disabled."
        }), 403

    token = make_token()

    expires = now() + timedelta(days=30)

    db.execute("""
        INSERT INTO sessions
        (user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?)
    """, (
        user["id"],
        token,
        expires.isoformat(),
        now_iso()
    ))

    db.commit()

    return jsonify({
        "ok": True,
        "message": "Login successful.",
        "token": token,
        "user": user_json(user)
    })


# =========================================================
# LOGOUT
# =========================================================

@app.route("/api/auth/logout", methods=["POST"])
@login_required
def logout():

    auth = request.headers.get("Authorization", "")

    token = auth[7:].strip()

    db = get_db()

    db.execute(
        "DELETE FROM sessions WHERE token = ?",
        (token,)
    )

    db.commit()

    return jsonify({
        "ok": True,
        "message": "Logged out successfully."
    })


# =========================================================
# CURRENT USER / PROFILE
# =========================================================

@app.route("/api/auth/me", methods=["GET"])
@login_required
def me():

    user = get_current_user()

    return jsonify({
        "ok": True,
        "user": user_json(user)
    })


@app.route("/api/profile", methods=["GET"])
@login_required
def profile():

    user = get_current_user()

    return jsonify({
        "ok": True,
        "user": user_json(user)
    })


# =========================================================
# CHANGE PASSWORD
# =========================================================

@app.route("/api/auth/change-password", methods=["POST"])
@login_required
def change_password():

    data = request.get_json(silent=True) or {}

    old_password = str(data.get("old_password", ""))
    new_password = str(data.get("new_password", ""))

    user = get_current_user()

    if not verify_password(old_password, user["password_hash"]):
        return jsonify({
            "ok": False,
            "message": "Current password is incorrect."
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "ok": False,
            "message": "New password must be at least 6 characters."
        }), 400

    db = get_db()

    db.execute("""
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
    """, (
        hash_password(new_password),
        user["id"]
    ))

    db.commit()

    return jsonify({
        "ok": True,
        "message": "Password changed successfully."
    })


# =========================================================
# FORGOT PASSWORD
# =========================================================

@app.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():

    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()

    if not email:
        return jsonify({
            "ok": False,
            "message": "Email is required."
        }), 400

    db = get_db()

    user = db.execute("""
        SELECT *
        FROM users
        WHERE email = ?
    """, (email,)).fetchone()

    # Don't expose whether an account exists.
    if not user:
        return jsonify({
            "ok": True,
            "message": "If the email exists, a reset request has been created."
        })

    token = secrets.token_urlsafe(32)
    expires = now() + timedelta(minutes=30)

    db.execute("""
        INSERT INTO password_resets
        (user_id, token, expires_at, created_at)
        VALUES (?, ?, ?, ?)
    """, (
        user["id"],
        token,
        expires.isoformat(),
        now_iso()
    ))

    db.commit()

    # Development response only.
    # For production, connect an email provider.
    return jsonify({
        "ok": True,
        "message": "Password reset request created.",
        "reset_token": token,
        "note": "Email delivery must be connected for production."
    })


# =========================================================
# RESET PASSWORD
# =========================================================

@app.route("/api/auth/reset-password", methods=["POST"])
def reset_password():

    data = request.get_json(silent=True) or {}

    token = str(data.get("token", "")).strip()
    new_password = str(data.get("new_password", ""))

    if not token or not new_password:
        return jsonify({
            "ok": False,
            "message": "Token and new password are required."
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "ok": False,
            "message": "Password must be at least 6 characters."
        }), 400

    db = get_db()

    reset = db.execute("""
        SELECT *
        FROM password_resets
        WHERE token = ?
        AND used = 0
        AND expires_at > ?
    """, (token, now_iso())).fetchone()

    if not reset:
        return jsonify({
            "ok": False,
            "message": "Invalid or expired reset token."
        }), 400

    db.execute("""
        UPDATE users
        SET password_hash = ?
        WHERE id = ?
    """, (
        hash_password(new_password),
        reset["user_id"]
    ))

    db.execute("""
        UPDATE password_resets
        SET used = 1
        WHERE id = ?
    """, (reset["id"],))

    db.commit()

    return jsonify({
        "ok": True,
        "message": "Password reset successful."
    })


# =========================================================
# BALANCE
# =========================================================

@app.route("/api/balance", methods=["GET"])
@login_required
def balance():

    user = get_current_user()

    return jsonify({
        "ok": True,
        "balance": round(float(user["balance"]), 2)
    })


# =========================================================
# ADD MONEY
# =========================================================

@app.route("/api/deposits", methods=["POST"])
@login_required
def create_deposit():

    data = request.get_json(silent=True) or {}

    method = str(data.get("method", "")).strip()
    transaction_id = str(data.get("transaction_id", "")).strip()

    try:
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        amount = 0

    if method not in ["bKash", "Nagad", "AG Wallet"]:
        return jsonify({
            "ok": False,
            "message": "Invalid payment method."
        }), 400

    if amount <= 0:
        return jsonify({
            "ok": False,
            "message": "Invalid amount."
        }), 400

    if not transaction_id:
        return jsonify({
            "ok": False,
            "message": "Transaction ID is required."
        }), 400

    user = get_current_user()

    deposit_id = make_id("DEP")

    db = get_db()

    db.execute("""
        INSERT INTO deposits
        (deposit_id, user_id, method, amount, transaction_id,
         status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?)
    """, (
        deposit_id,
        user["id"],
        method,
        amount,
        transaction_id,
        now_iso(),
        now_iso()
    ))

    db.commit()

    return jsonify({
        "ok": True,
        "message": "Deposit request submitted.",
        "deposit_id": deposit_id,
        "status": "Pending"
    }), 201


@app.route("/api/deposits", methods=["GET"])
@login_required
def deposits():

    user = get_current_user()

    db = get_db()

    rows = db.execute("""
        SELECT deposit_id, method, amount, transaction_id,
               status, created_at, updated_at
        FROM deposits
        WHERE user_id = ?
        ORDER BY id DESC
    """, (user["id"],)).fetchall()

    return jsonify({
        "ok": True,
        "deposits": [dict(row) for row in rows]
    })


# =========================================================
# CREATE ORDER
# =========================================================

@app.route("/api/orders", methods=["POST"])
@login_required
def create_order():

    data = request.get_json(silent=True) or {}

    uid = str(data.get("uid", "")).strip()
    server = str(data.get("server", "")).strip()
    product = str(data.get("product", "")).strip()

    try:
        diamonds = int(data.get("diamonds", 0))
        amount = float(data.get("amount", 0))
    except (TypeError, ValueError):
        diamonds = 0
        amount = 0

    if not uid:
        return jsonify({
            "ok": False,
            "message": "Player UID is required."
        }), 400

    if not product:
        return jsonify({
            "ok": False,
            "message": "Product is required."
        }), 400

    if amount <= 0:
        return jsonify({
            "ok": False,
            "message": "Invalid amount."
        }), 400

    if diamonds < 0:
        return jsonify({
            "ok": False,
            "message": "Invalid diamond amount."
        }), 400

    user = get_current_user()

    if float(user["balance"]) < amount:
        return jsonify({
            "ok": False,
            "message": "Insufficient balance."
        }), 400

    order_id = make_id("ORD")

    db = get_db()

    # Deduct balance atomically.
    updated = db.execute("""
        UPDATE users
        SET balance = balance - ?
        WHERE id = ?
        AND balance >= ?
    """, (
        amount,
        user["id"],
        amount
    ))

    if updated.rowcount != 1:
        db.rollback()

        return jsonify({
            "ok": False,
            "message": "Insufficient balance."
        }), 400

    db.execute("""
        INSERT INTO orders
        (order_id, user_id, uid, server, product, diamonds,
         amount, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
    """, (
        order_id,
        user["id"],
        uid,
        server,
        product,
        diamonds,
        amount,
        now_iso(),
        now_iso()
    ))

    db.commit()

    return jsonify({
        "ok": True,
        "message": "Order created successfully.",
        "order_id": order_id,
        "status": "Pending"
    }), 201


# =========================================================
# MY ORDERS
# =========================================================

@app.route("/api/orders", methods=["GET"])
@login_required
def get_orders():

    user = get_current_user()

    db = get_db()

    rows = db.execute("""
        SELECT order_id, uid, server, product, diamonds,
               amount, status, created_at, updated_at
        FROM orders
        WHERE user_id = ?
        ORDER BY id DESC
    """, (user["id"],)).fetchall()

    return jsonify({
        "ok": True,
        "orders": [dict(row) for row in rows]
    })


# =========================================================
# SINGLE ORDER
# =========================================================

@app.route("/api/orders/<order_id>", methods=["GET"])
@login_required
def get_order(order_id):

    user = get_current_user()

    db = get_db()

    row = db.execute("""
        SELECT order_id, uid, server, product, diamonds,
               amount, status, created_at, updated_at
        FROM orders
        WHERE order_id = ?
        AND user_id = ?
    """, (
        order_id,
        user["id"]
    )).fetchone()

    if not row:
        return jsonify({
            "ok": False,
            "message": "Order not found."
        }), 404

    return jsonify({
        "ok": True,
        "order": dict(row)
    })


# =========================================================
# TOURNAMENT LIST
# =========================================================

@app.route("/api/tournaments", methods=["GET"])
def tournaments():

    db = get_db()

    rows = db.execute("""
        SELECT
            t.id,
            t.title,
            t.description,
            t.entry_fee,
            t.prize,
            t.max_players,
            t.status,
            t.start_time,
            t.created_at,
            COUNT(tp.id) AS players
        FROM tournaments t
        LEFT JOIN tournament_players tp
            ON tp.tournament_id = t.id
        GROUP BY t.id
        ORDER BY t.id DESC
    """).fetchall()

    return jsonify({
        "ok": True,
        "tournaments": [dict(row) for row in rows]
    })


# =========================================================
# JOIN TOURNAMENT
# =========================================================

@app.route("/api/tournaments/<int:tournament_id>/join", methods=["POST"])
@login_required
def join_tournament(tournament_id):

    user = get_current_user()

    db = get_db()

    tournament = db.execute("""
        SELECT
            t.*,
            COUNT(tp.id) AS players
        FROM tournaments t
        LEFT JOIN tournament_players tp
            ON tp.tournament_id = t.id
        WHERE t.id = ?
        GROUP BY t.id
    """, (tournament_id,)).fetchone()

    if not tournament:
        return jsonify({
            "ok": False,
            "message": "Tournament not found."
        }), 404

    if tournament["status"] != "Open":
        return jsonify({
            "ok": False,
            "message": "Tournament is not open."
        }), 400

    if tournament["players"] >= tournament["max_players"]:
        return jsonify({
            "ok": False,
            "message": "Tournament is full."
        }), 400

    existing = db.execute("""
        SELECT id
        FROM tournament_players
        WHERE tournament_id = ?
        AND user_id = ?
    """, (
        tournament_id,
        user["id"]
    )).fetchone()

    if existing:
        return jsonify({
            "ok": False,
            "message": "You already joined this tournament."
        }), 409

    fee = float(tournament["entry_fee"])

    if float(user["balance"]) < fee:
        return jsonify({
            "ok": False,
            "message": "Insufficient balance."
        }), 400

    if fee > 0:
        updated = db.execute("""
            UPDATE users
            SET balance = balance - ?
            WHERE id = ?
            AND balance >= ?
        """, (
            fee,
            user["id"],
            fee
        ))

        if updated.rowcount != 1:
            db.rollback()

            return jsonify({
                "ok": False,
                "message": "Insufficient balance."
            }), 400

    db.execute("""
        INSERT INTO tournament_players
        (tournament_id, user_id, joined_at)
        VALUES (?, ?, ?)
    """, (
        tournament_id,
        user["id"],
        now_iso()
    ))

    db.commit()

    return jsonify({
        "ok": True,
        "message": "Tournament joined successfully."
    })


# =========================================================
# MY TOURNAMENTS
# =========================================================

@app.route("/api/my-tournaments", methods=["GET"])
@login_required
def my_tournaments():

    user = get_current_user()

    db = get_db()

    rows = db.execute("""
        SELECT
            t.id,
            t.title,
            t.description,
            t.entry_fee,
            t.prize,
            t.status,
            t.start_time,
            tp.joined_at
        FROM tournament_players tp
        JOIN tournaments t
            ON t.id = tp.tournament_id
        WHERE tp.user_id = ?
        ORDER BY tp.id DESC
    """, (user["id"],)).fetchall()

    return jsonify({
        "ok": True,
        "tournaments": [dict(row) for row in rows]
    })


# =========================================================
# CREATE SAMPLE TOURNAMENT
# =========================================================

def create_sample_tournament():

    db = sqlite3.connect(DATABASE)

    count = db.execute("""
        SELECT COUNT(*)
        FROM tournaments
    """).fetchone()[0]

    if count == 0:

        db.execute("""
            INSERT INTO tournaments
            (title, description, entry_fee, prize,
             max_players, status, start_time, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "AG D-M Tournament #1",
            "Free Fire community tournament.",
            0,
            "Prize will be announced",
            100,
            "Open",
            None,
            now_iso()
        ))

        db.commit()

    db.close()


# =========================================================
# STARTUP
# =========================================================

init_db()
create_sample_tournament()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
