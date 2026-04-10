"""
Abeyton Lodge — Full Menu Seed
Based on 2025 Final Menu Rough Draft
Run via: POST /menu/seed
"""

MENU_ITEMS = [
    # ─── ARTISAN SNACKS (STARTER) ────────────────────────────────────────────
    {
        "key": "cheese_board",
        "name": "Hudson Valley Cheese Board",
        "description": "Cypress Hill Farms Blue Cheese, Murray's Farms Young Gouda, Grafton Farms Aged Cheddar, Hard Salami, Dried Fruit, Olives, Crostini",
        "price": 24.00,
        "category": "STARTER",
        "is_starter": True,
        "dietary_flags": [],
        "sort_order": 1,
    },
    {
        "key": "burrata",
        "name": "Burrata",
        "description": "Tomato Confit, Olive Oil, Roasted Garlic, Cracked Fresh Pepper, Served in a Mini Skillet with Crostini or Gluten Free Crackers",
        "price": 19.00,
        "category": "STARTER",
        "is_starter": True,
        "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],
        "sort_order": 2,
    },
    {
        "key": "pretzel",
        "name": "Jumbo Bavarian Pretzel",
        "description": "Butter Brushed, Sea Salt, Honey Dijon",
        "price": 14.00,
        "category": "STARTER",
        "is_starter": True,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 3,
    },
    {
        "key": "mezze",
        "name": "Mezze Platter",
        "description": "Grilled Soft Flatbread, Sun-dried Tomato Hummus, Stuffed Grape Leaves, Marinated Olives, Feta Cheese",
        "price": 18.00,
        "category": "STARTER",
        "is_starter": True,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 4,
    },

    # ─── SALAD / BOWL (MAIN) ─────────────────────────────────────────────────
    {
        "key": "salad_bowl",
        "name": "Create Your Own Salad or Bowl",
        "description": "Choice of greens, grains, protein, vegetables, fruits, cheese, and dressing. Greens sourced from Satur Farm, Norwich Meadows Farm, Hepworth Farm.",
        "price": 22.00,
        "category": "MAIN",
        "is_starter": False,
        "dietary_flags": [],
        "sort_order": 10,
    },
    {"key": "salad_mixed_greens", "name": "Mixed Greens", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 1},
    {"key": "salad_romaine", "name": "Baby Romaine", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 2},
    {"key": "salad_arugula", "name": "Arugula", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 3},
    {"key": "salad_chicken", "name": "Add Grilled Chicken", "description": "", "price": 5.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 10},
    {"key": "salad_salmon", "name": "Add Grilled Salmon", "description": "", "price": 7.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["GLUTEN_FREE", "FISH_ALLERGY"], "sort_order": 11},
    {"key": "salad_tuna", "name": "Add Grilled Tuna", "description": "", "price": 7.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["GLUTEN_FREE", "FISH_ALLERGY"], "sort_order": 12},
    {"key": "salad_falafel", "name": "Add Fried Falafel", "description": "", "price": 4.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 13},
    {"key": "salad_egg", "name": "Add Hard Boiled Egg", "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 14},
    {"key": "salad_bacon", "name": "Add Bacon", "description": "", "price": 3.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 15},
    {"key": "salad_quinoa", "name": "Tri Color Quinoa", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 20},
    {"key": "salad_farro", "name": "Farro", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN"], "sort_order": 21},
    {"key": "salad_rice", "name": "Basmati Rice", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 22},
    {"key": "dressing_caesar", "name": "Caesar Dressing", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": [], "sort_order": 30},
    {"key": "dressing_ranch", "name": "Wishbone Ranch", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 31},
    {"key": "dressing_balsamic", "name": "Balsamic Dressing", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 32},
    {"key": "dressing_carrot", "name": "Carrot Ginger Dressing", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "salad_bowl", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 33},

    # ─── BISTRO SANDWICHES (MAIN) ─────────────────────────────────────────────
    {"key": "chicken_salad", "name": "Classic Chicken Salad", "description": "Herb Mayonnaise, Martin's Bun or Whole Wheat Wrap. GF bread/wrap available on request.", "price": 18.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["GLUTEN_FREE"], "sort_order": 20},
    {"key": "turkey_club", "name": "Free Range Turkey Club", "description": "Bacon, Lettuce, Tomato Chutney, Sliced Tomato, Stone Ground Wheat Bread", "price": 19.00, "category": "MAIN", "is_starter": False, "dietary_flags": [], "sort_order": 21},
    {"key": "fried_chicken_sandwich", "name": "Fried Chicken Sandwich", "description": "Fried Chicken Thigh, Martin's Roll, Hot Honey, Home-Made Pickles and Coleslaw", "price": 20.00, "category": "MAIN", "is_starter": False, "dietary_flags": [], "sort_order": 22},

    # ─── FRESH OFF THE GRILL (MAIN) ──────────────────────────────────────────
    {"key": "angus_burger", "name": "Angus Beef Hamburger", "description": "Served on Martin's Roll. GF bread available on request.", "price": 21.00, "category": "MAIN", "is_starter": False, "dietary_flags": [], "sort_order": 30},
    {"key": "turkey_burger", "name": "Turkey Burger", "description": "Served on Martin's Roll. GF bread available on request.", "price": 19.00, "category": "MAIN", "is_starter": False, "dietary_flags": [], "sort_order": 31},
    {"key": "grilled_salmon", "name": "Grilled Salmon", "description": "Fresh Atlantic Salmon, served with choice of side.", "price": 26.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["GLUTEN_FREE", "FISH_ALLERGY"], "sort_order": 32},
    {"key": "grilled_chicken", "name": "Grilled Chicken Breast", "description": "Served with choice of side. GF.", "price": 20.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["GLUTEN_FREE"], "sort_order": 33},
    {"key": "beyond_burger", "name": "Beyond Burger", "description": "Plant-based patty, served on Martin's Roll.", "price": 20.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["VEGAN"], "sort_order": 34},
    {"key": "quesadilla", "name": "Quesadilla", "description": "Cheddar Cheese Melted in a Flour Tortilla, Pico de Gallo", "price": 17.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["VEGETARIAN"], "sort_order": 35},
    {"key": "hot_dog", "name": "All Beef Hot Dog", "description": "Martin's Bun, choice of Cheddar or American Cheese", "price": 13.00, "category": "MAIN", "is_starter": False, "dietary_flags": [], "sort_order": 36},
    {"key": "lobster_roll", "name": "Lobster Roll", "description": "Lobster Salad on a Toasted Buttered Roll, Lemon Aioli, Lemon Wedge", "price": 38.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["SHELLFISH_ALLERGY"], "sort_order": 37},
    {"key": "pizza_flatbread", "name": "Pizza Flatbread", "description": "San Marzano Tomato Sauce, Fresh Mozzarella, Basil", "price": 16.00, "category": "MAIN", "is_starter": False, "dietary_flags": ["VEGETARIAN"], "sort_order": 38},

    # Burger/sandwich modifiers
    {"key": "mod_gf_bread", "name": "Gluten Free Bread/Roll", "description": "", "price": 1.50, "category": "MAIN", "is_modifier": True, "parent_key": "angus_burger", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 1},
    {"key": "mod_burger_cheddar", "name": "Add Cheddar Cheese", "description": "", "price": 1.00, "category": "MAIN", "is_modifier": True, "parent_key": "angus_burger", "dietary_flags": ["VEGETARIAN"], "sort_order": 2},
    {"key": "mod_burger_american", "name": "Add American Cheese", "description": "", "price": 1.00, "category": "MAIN", "is_modifier": True, "parent_key": "angus_burger", "dietary_flags": ["VEGETARIAN"], "sort_order": 3},
    {"key": "mod_quesadilla_chicken", "name": "Add Chicken", "description": "", "price": 3.00, "category": "MAIN", "is_modifier": True, "parent_key": "quesadilla", "dietary_flags": [], "sort_order": 1},
    {"key": "mod_hotdog_cheddar", "name": "Cheddar Cheese", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "hot_dog", "dietary_flags": ["VEGETARIAN"], "sort_order": 1},
    {"key": "mod_hotdog_american", "name": "American Cheese", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "hot_dog", "dietary_flags": ["VEGETARIAN"], "sort_order": 2},

    # ─── ENTREES / SPECIALS ───────────────────────────────────────────────────
    {"key": "strip_steak", "name": "Grilled NY Strip Steak", "description": "Wild Mushroom Haricot Verts, Baked Potato with Sour Cream and Chopped Chives. Thu/Fri/Sat Dinner only.", "price": 52.00, "category": "SPECIAL", "is_special": True, "is_starter": False, "dietary_flags": ["GLUTEN_FREE"], "sort_order": 1},

    # ─── SIDES ────────────────────────────────────────────────────────────────
    {"key": "potato_salad", "name": "Classic Potato Salad", "description": "Vegetarian, GF", "price": 7.00, "category": "SIDE", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 1},
    {"key": "baked_potato", "name": "Baked Potato", "description": "With Sour Cream and Butter", "price": 6.00, "category": "SIDE", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 2},
    {"key": "grilled_veg", "name": "Grilled Vegetable Medley", "description": "Vegan, GF", "price": 8.00, "category": "SIDE", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 3},
    {"key": "chips", "name": "Potato Chips", "description": "", "price": 4.00, "category": "SIDE", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 4},
    {"key": "chicken_strips", "name": "Grilled Chicken Strips", "description": "Kids / Side", "price": 10.00, "category": "SIDE", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 5},
    {"key": "mac_cheese", "name": "Mac & Cheese", "description": "GF", "price": 9.00, "category": "SIDE", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 6},

    # ─── DESSERTS ─────────────────────────────────────────────────────────────
    {"key": "pound_cake", "name": "Classic Pound Cake", "description": "With a Vanilla Glaze", "price": 8.00, "category": "DESSERT", "dietary_flags": ["VEGETARIAN"], "sort_order": 1},
    {"key": "blondies", "name": "Blondies", "description": "", "price": 6.00, "category": "DESSERT", "dietary_flags": ["VEGETARIAN"], "sort_order": 2},
    {"key": "churros", "name": "Churros", "description": "Rolled in Cinnamon Sugar, Served with Chocolate Chili Sauce", "price": 9.00, "category": "DESSERT", "dietary_flags": ["VEGETARIAN"], "sort_order": 3},
    {"key": "brownies", "name": "Fudge Brownies", "description": "", "price": 6.00, "category": "DESSERT", "dietary_flags": ["VEGETARIAN"], "sort_order": 4},
    {"key": "cookies", "name": "Oatmeal & Chocolate Chip Cookies", "description": "", "price": 5.00, "category": "DESSERT", "dietary_flags": ["VEGETARIAN"], "sort_order": 5},
    {"key": "ice_cream_sundae", "name": "Ice Cream Sundae Bar", "description": "Choice of ice cream and toppings", "price": 10.00, "category": "DESSERT", "dietary_flags": ["VEGETARIAN"], "sort_order": 6},
    {"key": "mod_ice_cream_vanilla", "name": "Vanilla Ice Cream", "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "ice_cream_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 1},
    {"key": "mod_ice_cream_chocolate", "name": "Chocolate Ice Cream", "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "ice_cream_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 2},
    {"key": "mod_ice_cream_strawberry", "name": "Strawberry Ice Cream", "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "ice_cream_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 3},
    {"key": "mod_ice_cream_coconut", "name": "Coconut Ice Cream (DF)", "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "ice_cream_sundae", "dietary_flags": ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"], "sort_order": 4},
    {"key": "mod_sundae_caramel", "name": "Caramel Sauce", "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "ice_cream_sundae", "dietary_flags": ["VEGETARIAN"], "sort_order": 10},
    {"key": "mod_sundae_chocolate_sauce", "name": "Chocolate Sauce", "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "ice_cream_sundae", "dietary_flags": ["VEGETARIAN"], "sort_order": 11},
    {"key": "popsicle_strawberry", "name": "Strawberry Popsicle", "description": "Vegan, Dairy Free", "price": 5.00, "category": "DESSERT", "dietary_flags": ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"], "sort_order": 20},
    {"key": "popsicle_tangerine", "name": "Tangerine Popsicle", "description": "Vegan, Dairy Free", "price": 5.00, "category": "DESSERT", "dietary_flags": ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"], "sort_order": 21},
    {"key": "popsicle_raspberry", "name": "Raspberry Popsicle", "description": "Vegan, Dairy Free", "price": 5.00, "category": "DESSERT", "dietary_flags": ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"], "sort_order": 22},

    # ─── DRINKS ───────────────────────────────────────────────────────────────
    {"key": "soft_drink", "name": "Soft Drink", "description": "Coke, Diet Coke, Sprite, Ginger Ale, Lemonade", "price": 4.00, "category": "DRINK", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 1},
    {"key": "sparkling_water", "name": "Sparkling Water", "description": "", "price": 4.00, "category": "DRINK", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 2},
    {"key": "still_water", "name": "Still Water", "description": "", "price": 3.00, "category": "DRINK", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 3},
    {"key": "iced_tea", "name": "Iced Tea", "description": "Sweetened or Unsweetened", "price": 4.00, "category": "DRINK", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 4},
    {"key": "fresh_lemonade", "name": "Fresh Lemonade", "description": "", "price": 5.00, "category": "DRINK", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 5},
]


def seed_menu(cur):
    """
    Seed the menu. Safe to run multiple times — skips existing items by name.
    Inserts base items first, then modifiers (resolves parent_key -> parent_item_id).
    """
    key_to_id: dict = {}

    base_items = [i for i in MENU_ITEMS if not i.get("is_modifier")]
    modifiers = [i for i in MENU_ITEMS if i.get("is_modifier")]

    def insert_item(item: dict, parent_id=None):
        cur.execute("SELECT id FROM menu_items WHERE name = %s", (item["name"],))
        existing = cur.fetchone()
        if existing:
            key_to_id[item["key"]] = existing["id"]
            return existing["id"]

        cur.execute("""
            INSERT INTO menu_items (
                name, description, price, category,
                is_starter, is_special, is_modifier, is_active,
                parent_item_id, dietary_flags, sort_order
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE, %s, %s::dietary_flag[], %s)
            RETURNING id
        """, (
            item["name"],
            item.get("description", ""),
            item["price"],
            item["category"],
            item.get("is_starter", False),
            item.get("is_special", False),
            item.get("is_modifier", False),
            parent_id,
            item.get("dietary_flags", []),
            item.get("sort_order", 0),
        ))
        row = cur.fetchone()
        item_id = row["id"]
        key_to_id[item["key"]] = item_id
        return item_id

    for item in base_items:
        insert_item(item)

    for item in modifiers:
        parent_key = item.get("parent_key")
        parent_id = key_to_id.get(parent_key) if parent_key else None
        insert_item(item, parent_id)

    return {"seeded": len(MENU_ITEMS), "base": len(base_items), "modifiers": len(modifiers)}