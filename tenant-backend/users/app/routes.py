from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from .database import get_connection
from .auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)
from .models import (
    UserCreate,
    UserUpdate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    MemberCreate,
    MemberUpdate,
    MemberResponse,
)
from .constants.members import seed_members

router = APIRouter()


# =============================================================================
# TENANT CONFIGURATION
# =============================================================================

@router.get("/config/public")
def get_public_config():
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM tenant_config LIMIT 1;")
        config = cur.fetchone()
        if config is None:
            return {
                "name": "My Club",
                "tagline": "Member Portal",
                "primary_color": "#a38a64",
                "logo_url": "",
                "font_display": None,
                "font_body": None,
                "font_url": None,
                "trial_expires_at": None,
                "features": {
                    "show_demo_login": True,
                    "show_kitchen_board": True,
                    "show_reports": True,
                    "allow_member_booking": True,
                    "allow_preorders": True,
                    "show_dietary_flags": True,
                },
            }
        return dict(config)
    finally:
        cur.close()
        conn.close()


# =============================================================================
# HELPERS
# =============================================================================

def parse_pg_array(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    stripped = value.strip("{}")
    if not stripped:
        return []
    return [item.strip() for item in stripped.split(",")]


def normalize_member(row) -> dict:
    d = dict(row)
    d["dietary_flags"] = parse_pg_array(d.get("dietary_flags"))
    return d


def clean_dietary_other_note(flags, note):
    flags = flags or []

    if "OTHER" not in flags:
        return None

    if note is None:
        return None

    stripped = note.strip()
    return stripped or None


def normalize_email(email: str) -> str:
    return email.lower().strip()


# =============================================================================
# AUTH
# =============================================================================

@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    conn = get_connection()
    cur = conn.cursor()
    try:
        email = normalize_email(body.email)
        cur.execute(
            """
            SELECT id, hashed_password, role, sub_role, is_active, force_password_change
            FROM users
            WHERE LOWER(email) = %s
            """,
            (email,),
        )
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if not user["is_active"]:
            raise HTTPException(status_code=403, detail="Account is inactive")
        if not verify_password(body.password, user["hashed_password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        token = create_access_token({
            "sub": str(user["id"]),
            "role": user["role"],
            "sub_role": user["sub_role"],
        })

        return {
            "access_token": token,
            "token_type": "bearer",
            "user_id": user["id"],
            "role": user["role"],
            "sub_role": user["sub_role"],
            "force_password_change": user["force_password_change"],
        }
    finally:
        cur.close()
        conn.close()


# =============================================================================
# AUTH/ME
# =============================================================================

@router.get("/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, first_name, last_name, email, role, member_number,
                   sub_role, is_active, force_password_change, notes
            FROM users
            WHERE id = %s
            """,
            (int(current_user["sub"]),),
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    finally:
        cur.close()
        conn.close()


class ChangeMyPasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.patch("/users/me/password")
def change_my_password(
    body: ChangeMyPasswordRequest,
    current_user: dict = Depends(get_current_user),
):
    conn = get_connection()
    cur = conn.cursor()
    try:
        user_id = int(current_user["sub"])

        cur.execute(
            "SELECT id, hashed_password FROM users WHERE id = %s",
            (user_id,),
        )
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if not verify_password(body.current_password, user["hashed_password"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        cur.execute(
            """
            UPDATE users
            SET hashed_password = %s, force_password_change = FALSE, updated_at = NOW()
            WHERE id = %s
            RETURNING id
            """,
            (hash_password(body.new_password), user_id),
        )
        conn.commit()

        return {"message": "Password updated successfully"}
    finally:
        cur.close()
        conn.close()


# =============================================================================
# USERS — CRUD
# =============================================================================

@router.post("/users", response_model=UserResponse)
def create_user(body: UserCreate, current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        email = normalize_email(body.email)

        cur.execute("SELECT id FROM users WHERE LOWER(email) = %s", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        hashed = hash_password(body.password)
        cur.execute(
            """
            INSERT INTO users (
                first_name, last_name, email, hashed_password,
                role, member_number, sub_role, notes, force_password_change
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
            RETURNING id, first_name, last_name, email, role, member_number,
                      sub_role, is_active, force_password_change, notes
            """,
            (
                body.first_name,
                body.last_name,
                email,
                hashed,
                body.role,
                body.member_number,
                body.sub_role,
                body.notes,
            ),
        )
        conn.commit()
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


@router.get("/users", response_model=list[UserResponse])
def get_users(current_user: dict = Depends(require_role("admin", "staff"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, first_name, last_name, email, role, member_number,
                   sub_role, is_active, force_password_change, notes
            FROM users
            ORDER BY last_name, first_name
            """
        )
        return cur.fetchall()
    finally:
        cur.close()
        conn.close()


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, first_name, last_name, email, role, member_number,
                   sub_role, is_active, force_password_change, notes
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    finally:
        cur.close()
        conn.close()


@router.get("/dietary-options")
def get_dietary_options(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT unnest(enum_range(NULL::dietary_flag))::text AS flag")
        rows = cur.fetchall()
        return [row["flag"] for row in rows]
    finally:
        cur.close()
        conn.close()


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    body: UserUpdate,
    current_user: dict = Depends(require_role("admin")),
):
    conn = get_connection()
    cur = conn.cursor()
    try:
        update_data = body.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        if "email" in update_data and update_data["email"] is not None:
            update_data["email"] = normalize_email(update_data["email"])
            cur.execute(
                "SELECT id FROM users WHERE LOWER(email) = %s AND id != %s",
                (update_data["email"], user_id),
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already registered")

        if "password" in update_data:
            raw_password = update_data.pop("password")
            update_data["hashed_password"] = hash_password(raw_password)
            update_data["force_password_change"] = False

        set_clause = ", ".join(f"{k} = %s" for k in update_data)
        values = list(update_data.values()) + [user_id]

        cur.execute(
            f"""
            UPDATE users
            SET {set_clause}, updated_at = NOW()
            WHERE id = %s
            RETURNING id, first_name, last_name, email, role, member_number,
                      sub_role, is_active, force_password_change, notes
            """,
            values,
        )
        conn.commit()

        user = cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    finally:
        cur.close()
        conn.close()


@router.delete("/users/{user_id}")
def deactivate_user(user_id: int, current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = %s RETURNING id",
            (user_id,),
        )
        conn.commit()
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deactivated"}
    finally:
        cur.close()
        conn.close()


# =============================================================================
# MEMBERS — household members belonging to a user
# =============================================================================

@router.get("/users/members/all", response_model=list[MemberResponse])
def get_all_members(current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT m.id, m.user_id, m.first_name, m.last_name, m.relation,
                   m.dietary_flags, m.dietary_other_note, m.notes, m.is_active
            FROM members m
            JOIN users u ON u.id = m.user_id
            WHERE m.is_active = TRUE AND u.is_active = TRUE
            ORDER BY m.last_name, m.first_name
            """
        )
        return [normalize_member(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.get("/users/{user_id}/members", response_model=list[MemberResponse])
def get_members(user_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "staff") and int(current_user["sub"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT id, user_id, first_name, last_name, relation,
                   dietary_flags, dietary_other_note, notes, is_active
            FROM members
            WHERE user_id = %s AND is_active = TRUE
            ORDER BY relation, last_name, first_name
            """,
            (user_id,),
        )
        return [normalize_member(row) for row in cur.fetchall()]
    finally:
        cur.close()
        conn.close()


@router.post("/users/{user_id}/members", response_model=MemberResponse)
def create_member(user_id: int, body: MemberCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "staff") and int(current_user["sub"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE id = %s", (user_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        dietary_other_note = clean_dietary_other_note(
            body.dietary_flags,
            body.dietary_other_note,
        )

        cur.execute(
            """
            INSERT INTO members (user_id, first_name, last_name, relation, dietary_flags, dietary_other_note, notes)
            VALUES (%s, %s, %s, %s, %s::dietary_flag[], %s, %s)
            RETURNING id, user_id, first_name, last_name, relation,
                      dietary_flags, dietary_other_note, notes, is_active
            """,
            (
                user_id,
                body.first_name,
                body.last_name,
                body.relation,
                body.dietary_flags,
                dietary_other_note,
                body.notes,
            ),
        )
        conn.commit()
        return normalize_member(cur.fetchone())
    finally:
        cur.close()
        conn.close()


@router.patch("/users/{user_id}/members/{member_id}", response_model=MemberResponse)
def update_member(
    user_id: int,
    member_id: int,
    body: MemberUpdate,
    current_user: dict = Depends(get_current_user),
):
    if current_user["role"] not in ("admin", "staff") and int(current_user["sub"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_connection()
    cur = conn.cursor()
    try:
        fields = body.model_dump(exclude_unset=True)

        if not fields:
            raise HTTPException(status_code=400, detail="No fields provided to update")

        if "dietary_flags" in fields or "dietary_other_note" in fields:
            if "dietary_flags" in fields:
                next_flags = fields.get("dietary_flags") or []
            else:
                cur.execute(
                    """
                    SELECT dietary_flags
                    FROM members
                    WHERE id = %s AND user_id = %s
                    """,
                    (member_id, user_id),
                )
                existing = cur.fetchone()
                next_flags = parse_pg_array(existing["dietary_flags"]) if existing else []

            fields["dietary_other_note"] = clean_dietary_other_note(
                next_flags,
                fields.get("dietary_other_note"),
            )

        set_parts = []
        for k in fields:
            if k == "dietary_flags":
                set_parts.append("dietary_flags = %s::dietary_flag[]")
            else:
                set_parts.append(f"{k} = %s")

        set_clause = ", ".join(set_parts)
        values = list(fields.values()) + [member_id, user_id]

        cur.execute(
            f"""
            UPDATE members
            SET {set_clause}, updated_at = NOW()
            WHERE id = %s AND user_id = %s
            RETURNING id, user_id, first_name, last_name, relation,
                      dietary_flags, dietary_other_note, notes, is_active
            """,
            values,
        )
        conn.commit()

        member = cur.fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        return normalize_member(member)
    finally:
        cur.close()
        conn.close()


@router.delete("/users/{user_id}/members/{member_id}")
def delete_member(user_id: int, member_id: int, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ("admin", "staff") and int(current_user["sub"]) != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            UPDATE members
            SET is_active = FALSE, updated_at = NOW()
            WHERE id = %s AND user_id = %s
            RETURNING id
            """,
            (member_id, user_id),
        )
        conn.commit()
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Member not found")
        return {"message": "Member removed"}
    finally:
        cur.close()
        conn.close()


# =============================================================================
# SEEDS
# =============================================================================

@router.post("/users/seed-admin")
def seed_admin(body: UserCreate):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE role = 'admin'")
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Admin already exists")

        hashed = hash_password(body.password)
        cur.execute(
            """
            INSERT INTO users (
                first_name, last_name, email, hashed_password, role, force_password_change
            )
            VALUES (%s, %s, %s, %s, 'admin', FALSE)
            RETURNING id, first_name, last_name, email, role, member_number,
                      is_active, force_password_change, notes
            """,
            (body.first_name, body.last_name, normalize_email(body.email), hashed),
        )
        conn.commit()
        return cur.fetchone()
    finally:
        cur.close()
        conn.close()


@router.post("/users/seed-members")
def seed_member_households(current_user: dict = Depends(require_role("admin"))):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT COUNT(*) as count FROM members")
        count = cur.fetchone()["count"]
        if count > 0:
            raise HTTPException(
                status_code=400,
                detail=f"Members table already has {count} rows. Clear first.",
            )

        result = seed_members(cur, hash_password)
        conn.commit()

        return {
            "message": "Member households seeded successfully",
            **result,
        }
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Seed failed: {str(e)}")
    finally:
        cur.close()
        conn.close()