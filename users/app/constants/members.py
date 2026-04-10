# users/app/constants/members.py
# Seed data for member households.
# PARTNER and PARENT mapped to OTHER (not in member_relation enum).
# One user account per household, keyed on the PRIMARY member.
# Emails: firstname.lastname@abeytonlodge.com (lowercase, no spaces)
# Default password: 111111

RELATION_MAP = {
    "PRIMARY": "PRIMARY",
    "SPOUSE":  "SPOUSE",
    "CHILD":   "CHILD",
    "PARTNER": "OTHER",
    "PARENT":  "OTHER",
    "OTHER":   "OTHER",
}

def normalize_flags(flags: list[str]) -> list[str]:
    return [f.upper() for f in flags]


# Grouped by household. user_id is the intended seed order (1-based).
# The PRIMARY member drives the user account email/name.
HOUSEHOLDS = [
    [
        {"first_name": "Russ",   "last_name": "Rankin",  "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Elise",  "last_name": "Rankin",  "relation": "SPOUSE",  "dietary_flags": ["VEGETARIAN"]},
        {"first_name": "Milo",   "last_name": "Rankin",  "relation": "CHILD",   "dietary_flags": ["PEANUT_ALLERGY"]},
        {"first_name": "Tessa",  "last_name": "Rankin",  "relation": "CHILD",   "dietary_flags": ["DAIRY_FREE"]},
        {"first_name": "Helen",  "last_name": "Rankin",  "relation": "OTHER",   "dietary_flags": ["GLUTEN_FREE"]},
    ],
    [
        {"first_name": "Gwen",   "last_name": "Young",   "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Marcus", "last_name": "Young",   "relation": "OTHER",   "dietary_flags": ["HALAL"]},
        {"first_name": "Ava",    "last_name": "Young",   "relation": "CHILD",   "dietary_flags": ["EGG_FREE"]},
        {"first_name": "Nora",   "last_name": "Young",   "relation": "CHILD",   "dietary_flags": []},
    ],
    [
        {"first_name": "Darren", "last_name": "Goodbar", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Leah",   "last_name": "Goodbar", "relation": "SPOUSE",  "dietary_flags": ["KOSHER"]},
        {"first_name": "Noah",   "last_name": "Goodbar", "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Sophie", "last_name": "Goodbar", "relation": "CHILD",   "dietary_flags": ["NUT_ALLERGY"]},
        {"first_name": "Caleb",  "last_name": "Goodbar", "relation": "CHILD",   "dietary_flags": ["SOY_FREE"]},
        {"first_name": "Rita",   "last_name": "Goodbar", "relation": "OTHER",   "dietary_flags": ["VEGETARIAN"]},
    ],
    [
        {"first_name": "Jay",    "last_name": "Dennis",  "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Carla",  "last_name": "Dennis",  "relation": "SPOUSE",  "dietary_flags": ["SHELLFISH_ALLERGY"]},
        {"first_name": "Evan",   "last_name": "Dennis",  "relation": "CHILD",   "dietary_flags": ["SOY_FREE"]},
        {"first_name": "Lila",   "last_name": "Dennis",  "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Mason",  "last_name": "Dennis",  "relation": "CHILD",   "dietary_flags": ["SESAME_ALLERGY"]},
    ],
    [
        {"first_name": "Steve",  "last_name": "Cohen",   "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Rachel", "last_name": "Cohen",   "relation": "SPOUSE",  "dietary_flags": ["KOSHER"]},
        {"first_name": "Eli",    "last_name": "Cohen",   "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Mara",   "last_name": "Cohen",   "relation": "OTHER",   "dietary_flags": ["DAIRY_FREE"]},
    ],
    [
        {"first_name": "Brittany", "last_name": "Moore", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Jordan",   "last_name": "Moore", "relation": "OTHER",   "dietary_flags": ["VEGAN"]},
        {"first_name": "Harper",   "last_name": "Moore", "relation": "CHILD",   "dietary_flags": ["SESAME_ALLERGY"]},
        {"first_name": "Nina",     "last_name": "Moore", "relation": "CHILD",   "dietary_flags": ["VEGETARIAN"]},
        {"first_name": "Cole",     "last_name": "Moore", "relation": "CHILD",   "dietary_flags": []},
    ],
    [
        {"first_name": "Lu",    "last_name": "Nguyen",  "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Mai",   "last_name": "Nguyen",  "relation": "SPOUSE",  "dietary_flags": ["HALAL"]},
        {"first_name": "Theo",  "last_name": "Nguyen",  "relation": "CHILD",   "dietary_flags": ["FISH_ALLERGY"]},
        {"first_name": "Gia",   "last_name": "Nguyen",  "relation": "OTHER",   "dietary_flags": ["GLUTEN_FREE"]},
    ],
    [
        {"first_name": "Thurston", "last_name": "Howell", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Mara",     "last_name": "Howell", "relation": "SPOUSE",  "dietary_flags": ["GLUTEN_FREE"]},
        {"first_name": "Owen",     "last_name": "Howell", "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Piper",    "last_name": "Howell", "relation": "CHILD",   "dietary_flags": ["DAIRY_FREE", "EGG_FREE"]},
        {"first_name": "Drew",     "last_name": "Howell", "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Agnes",    "last_name": "Howell", "relation": "OTHER",   "dietary_flags": ["VEGETARIAN"]},
    ],
    [
        {"first_name": "Missy",   "last_name": "Jackson", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Derrick", "last_name": "Jackson", "relation": "SPOUSE",  "dietary_flags": ["SHELLFISH_ALLERGY"]},
        {"first_name": "Kayla",   "last_name": "Jackson", "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Jules",   "last_name": "Jackson", "relation": "CHILD",   "dietary_flags": ["VEGAN"]},
        {"first_name": "Bernice", "last_name": "Jackson", "relation": "OTHER",   "dietary_flags": ["SOY_FREE"]},
    ],
    [
        {"first_name": "Craig",  "last_name": "Robinson", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Paige",  "last_name": "Robinson", "relation": "OTHER",   "dietary_flags": ["VEGETARIAN"]},
        {"first_name": "Aiden",  "last_name": "Robinson", "relation": "CHILD",   "dietary_flags": ["PEANUT_ALLERGY"]},
        {"first_name": "June",   "last_name": "Robinson", "relation": "OTHER",   "dietary_flags": []},
    ],
    [
        {"first_name": "Joey",   "last_name": "Cape",    "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Lena",   "last_name": "Cape",    "relation": "SPOUSE",  "dietary_flags": ["GLUTEN_FREE"]},
        {"first_name": "Maddox", "last_name": "Cape",    "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Iris",   "last_name": "Cape",    "relation": "CHILD",   "dietary_flags": ["EGG_FREE"]},
    ],
    [
        {"first_name": "Sandy",   "last_name": "Romanello", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Victor",  "last_name": "Romanello", "relation": "SPOUSE",  "dietary_flags": ["DAIRY_FREE"]},
        {"first_name": "Bianca",  "last_name": "Romanello", "relation": "CHILD",   "dietary_flags": ["VEGETARIAN"]},
        {"first_name": "Leo",     "last_name": "Romanello", "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Teresa",  "last_name": "Romanello", "relation": "OTHER",   "dietary_flags": ["KOSHER"]},
    ],
    [
        {"first_name": "Brooke", "last_name": "Morris",  "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Shane",  "last_name": "Morris",  "relation": "OTHER",   "dietary_flags": ["VEGAN"]},
        {"first_name": "Penny",  "last_name": "Morris",  "relation": "CHILD",   "dietary_flags": ["SESAME_ALLERGY"]},
        {"first_name": "Dean",   "last_name": "Morris",  "relation": "CHILD",   "dietary_flags": []},
    ],
    [
        {"first_name": "James",  "last_name": "DeWees",  "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Alana",  "last_name": "DeWees",  "relation": "SPOUSE",  "dietary_flags": ["HALAL"]},
        {"first_name": "Finn",   "last_name": "DeWees",  "relation": "CHILD",   "dietary_flags": ["NUT_ALLERGY"]},
        {"first_name": "Ruth",   "last_name": "DeWees",  "relation": "OTHER",   "dietary_flags": ["GLUTEN_FREE"]},
    ],
    [
        {"first_name": "Curtis",  "last_name": "Holden", "relation": "PRIMARY", "dietary_flags": []},
        {"first_name": "Vanessa", "last_name": "Holden", "relation": "SPOUSE",  "dietary_flags": ["VEGETARIAN"]},
        {"first_name": "Wyatt",   "last_name": "Holden", "relation": "CHILD",   "dietary_flags": []},
        {"first_name": "Chloe",   "last_name": "Holden", "relation": "CHILD",   "dietary_flags": ["DAIRY_FREE"]},
        {"first_name": "Elliot",  "last_name": "Holden", "relation": "CHILD",   "dietary_flags": ["SOY_FREE"]},
    ],
]


def seed_members(cur, hash_password_fn) -> dict:
    """
    Insert all member households.
    Creates one user account per household (keyed on PRIMARY member).
    Email format: firstname.lastname@abeytonlodge.com (lowercase).
    Default password: 111111
    Returns summary: {"users_created": N, "members_created": N}
    """
    default_password = hash_password_fn("111111")
    users_created = 0
    members_created = 0

    for index, household in enumerate(HOUSEHOLDS):
        primary = next(m for m in household if m["relation"] == "PRIMARY")

        first = primary["first_name"].lower()
        last = primary["last_name"].lower()
        email = f"{first}.{last}@abeytonlodge.com"
        member_number = f"M{str(index + 1).zfill(4)}"

        cur.execute("""
            INSERT INTO users (first_name, last_name, email, hashed_password, role, member_number)
            VALUES (%s, %s, %s, %s, 'member', %s)
            RETURNING id
        """, (primary["first_name"], primary["last_name"], email, default_password, member_number))

        user_id = cur.fetchone()["id"]
        users_created += 1

        for member in household:
            relation = RELATION_MAP.get(member["relation"], "OTHER")
            flags = normalize_flags(member["dietary_flags"])

            cur.execute("""
                INSERT INTO members (user_id, first_name, last_name, relation, dietary_flags)
                VALUES (%s, %s, %s, %s, %s::dietary_flag[])
            """, (
                user_id,
                member["first_name"],
                member["last_name"],
                relation,
                flags,
            ))
            members_created += 1

    return {"users_created": users_created, "members_created": members_created}