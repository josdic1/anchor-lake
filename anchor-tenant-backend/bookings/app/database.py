import os
import psycopg2
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
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT typarray
            FROM pg_type
            WHERE typname = 'dietary_flag'
            """
        )
        row = cur.fetchone()

        if row and row["typarray"]:
            dietary_flag_array_oid = row["typarray"]
            dietary_flag_array = psycopg2.extensions.new_array_type(
                (dietary_flag_array_oid,),
                "dietary_flag[]",
                psycopg2.STRING,
            )
            psycopg2.extensions.register_type(dietary_flag_array, conn)
    finally:
        cur.close()