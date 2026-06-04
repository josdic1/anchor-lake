import os
import psycopg2
import psycopg2.extras
import psycopg2.extensions
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)


def get_connection():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    _register_array_types(conn)
    return conn


def _register_array_types(conn):
    """
    Register custom Postgres enum array types so psycopg2 returns them
    as Python lists instead of raw strings like '{GLUTEN_FREE,VEGAN}'.
    Without this, dietary_flag[] comes back as a string and fails Pydantic validation.
    """
    cur = conn.cursor()
    try:
        cur.execute("SELECT oid FROM pg_type WHERE typname = 'dietary_flag'")
        row = cur.fetchone()
        if row:
            dietary_flag_oid = row["oid"]
            array_type = psycopg2.extensions.new_array_type(
                (dietary_flag_oid,),
                "dietary_flag[]",
                psycopg2.STRING
            )
            psycopg2.extensions.register_type(array_type, conn)
    finally:
        cur.close()