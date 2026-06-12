"""
Anchor Lake Club — Menu Seed
Single source of truth for all menu items and modifiers.
Run via: POST /menu/seed
"""

MENU_ITEMS = [

    # =========================================================================
    # STARTERS
    # =========================================================================

    {
        "key": "shrimp_cocktail",
        "name": "Jumbo Shrimp Cocktail",
        "description": "House-made atomic cocktail sauce, lemon",
        "price": 18.00,
        "category": "STARTER",
        "is_starter": True,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["GLUTEN_FREE", "SHELLFISH_ALLERGY"],
        "sort_order": 1,
    },
    {
        "key": "hummus",
        "name": "Roasted Garlic Hummus",
        "description": "Celery, carrots, cucumber, warm pita",
        "price": 14.00,
        "category": "STARTER",
        "is_starter": True,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGAN", "VEGETARIAN"],
        "sort_order": 2,
    },
    {
        "key": "calamari",
        "name": "Crispy Calamari",
        "description": "Cherry peppers, marinara, lemon aioli",
        "price": 16.00,
        "category": "STARTER",
        "is_starter": True,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["FISH_ALLERGY"],
        "sort_order": 3,
    },
    {
        "key": "pretzel_bites",
        "name": "Bavarian Pretzel Bites",
        "description": "Whole grain mustard, warm beer cheese",
        "price": 13.00,
        "category": "STARTER",
        "is_starter": True,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 4,
    },

    # =========================================================================
    # SOUPS & GREENS
    # =========================================================================

    {
        "key": "french_onion",
        "name": "French Onion Soup",
        "description": "Caramelized onions, beef broth, crouton, melted Gruyère",
        "price": 12.00,
        "category": "STARTER",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 5,
    },
    {
        "key": "lodge_chili",
        "name": "Lodge Chili",
        "description": "Ground sirloin, kidney beans, cheddar, sour cream, scallions",
        "price": 13.00,
        "category": "STARTER",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["GLUTEN_FREE"],
        "sort_order": 6,
    },
    {
        "key": "caesar_salad",
        "name": "Classic Caesar",
        "description": "Romaine hearts, shaved parmesan, garlic croutons, house dressing",
        "price": 14.00,
        "category": "STARTER",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 7,
    },
    {
        "key": "wedge_salad",
        "name": "Iceberg Wedge",
        "description": "Bacon lardons, cherry tomatoes, red onion, bleu cheese dressing",
        "price": 14.00,
        "category": "STARTER",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["GLUTEN_FREE"],
        "sort_order": 8,
    },

    # =========================================================================
    # MAKE YOUR OWN SALAD
    # =========================================================================

    {
        "key": "myo_salad",
        "name": "Make Your Own Salad",
        "description": "Choose your base, vegetables, cheese, crunch, dressing, and protein.",
        "price": 18.00,
        "category": "MAIN",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": [],
        "sort_order": 10,
    },
    # Base
    {"key": "salad_base_mixed",    "name": "Base: Mixed Greens",   "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 1},
    {"key": "salad_base_romaine",  "name": "Base: Romaine",        "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 2},
    {"key": "salad_base_spinach",  "name": "Base: Baby Spinach",   "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 3},
    {"key": "salad_base_iceberg",  "name": "Base: Iceberg",        "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 4},
    # Vegetables
    {"key": "salad_veg_tomato",    "name": "Veg: Tomatoes",        "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 10},
    {"key": "salad_veg_cucumber",  "name": "Veg: Cucumbers",       "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 11},
    {"key": "salad_veg_red_onion", "name": "Veg: Red Onions",      "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 12},
    {"key": "salad_veg_carrots",   "name": "Veg: Carrots",         "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 13},
    {"key": "salad_veg_peppers",   "name": "Veg: Bell Peppers",    "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 14},
    {"key": "salad_veg_olives",    "name": "Veg: Olives",          "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 15},
    {"key": "salad_veg_mushrooms", "name": "Veg: Mushrooms",       "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 16},
    # Fruits
    {"key": "salad_fruit_cranberries", "name": "Fruit: Dried Cranberries", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 20},
    {"key": "salad_fruit_strawberries","name": "Fruit: Strawberries",      "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 21},
    {"key": "salad_fruit_blueberries", "name": "Fruit: Blueberries",       "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 22},
    # Cheese
    {"key": "salad_cheese_cheddar",  "name": "Cheese: Cheddar",        "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 30},
    {"key": "salad_cheese_feta",     "name": "Cheese: Feta",           "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 31},
    {"key": "salad_cheese_bleu",     "name": "Cheese: Bleu Cheese",    "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 32},
    {"key": "salad_cheese_parmesan", "name": "Cheese: Shaved Parmesan","description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 33},
    # Crunch
    {"key": "salad_crunch_croutons",  "name": "Crunch: Croutons",        "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGETARIAN"],              "sort_order": 40},
    {"key": "salad_crunch_walnuts",   "name": "Crunch: Candied Walnuts", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],    "sort_order": 41},
    {"key": "salad_crunch_sunflower", "name": "Crunch: Sunflower Seeds", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],    "sort_order": 42},
    {"key": "salad_crunch_onions",    "name": "Crunch: Crispy Onions",   "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN"],                   "sort_order": 43},
    # Dressing
    {"key": "salad_dress_balsamic",   "name": "Dressing: Balsamic Vinaigrette", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 50},
    {"key": "salad_dress_ranch",      "name": "Dressing: Ranch",               "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 51},
    {"key": "salad_dress_bleu",       "name": "Dressing: Bleu Cheese",         "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 52},
    {"key": "salad_dress_caesar",     "name": "Dressing: Caesar",              "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGETARIAN"],               "sort_order": 53},
    {"key": "salad_dress_lemon_oil",  "name": "Dressing: Lemon Oil",           "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 54},
    # Protein Add-ons
    {"key": "salad_protein_chicken",  "name": "Protein: Grilled Chicken",  "description": "", "price": 6.00,  "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["GLUTEN_FREE"],                 "sort_order": 60},
    {"key": "salad_protein_steak",    "name": "Protein: Sliced Steak",     "description": "", "price": 10.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["GLUTEN_FREE"],                 "sort_order": 61},
    {"key": "salad_protein_salmon",   "name": "Protein: Grilled Salmon",   "description": "", "price": 9.00,  "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["GLUTEN_FREE", "FISH_ALLERGY"], "sort_order": 62},
    {"key": "salad_protein_shrimp",   "name": "Protein: Shrimp",           "description": "", "price": 8.00,  "category": "MAIN", "is_modifier": True, "parent_key": "myo_salad", "dietary_flags": ["GLUTEN_FREE", "SHELLFISH_ALLERGY"], "sort_order": 63},

    # =========================================================================
    # BAR PIES
    # =========================================================================

    {
        "key": "bar_pie",
        "name": "Bar Pie",
        "description": "12\" ultra-thin crust, eight slices. Crushed tomato sauce, whole milk mozzarella.",
        "price": 18.00,
        "category": "MAIN",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 20,
    },
    # Meat Toppings
    {"key": "pie_meat_pepperoni",   "name": "Meat: Pepperoni",          "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": [],            "sort_order": 10},
    {"key": "pie_meat_sausage",     "name": "Meat: Crumbled Sausage",   "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": [],            "sort_order": 11},
    {"key": "pie_meat_bacon",       "name": "Meat: Bacon",              "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": [],            "sort_order": 12},
    {"key": "pie_meat_prosciutto",  "name": "Meat: Prosciutto",         "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": [],            "sort_order": 13},
    # Veggie Toppings
    {"key": "pie_veg_mushrooms",    "name": "Veggie: Mushrooms",        "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGETARIAN"], "sort_order": 20},
    {"key": "pie_veg_onions",       "name": "Veggie: Caramelized Onions","description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGETARIAN"], "sort_order": 21},
    {"key": "pie_veg_peppers",      "name": "Veggie: Bell Peppers",     "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGETARIAN"], "sort_order": 22},
    {"key": "pie_veg_jalapenos",    "name": "Veggie: Jalapeños",        "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGETARIAN"], "sort_order": 23},
    {"key": "pie_veg_olives",       "name": "Veggie: Black Olives",     "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGETARIAN"], "sort_order": 24},
    # Finishers
    {"key": "pie_fin_hot_honey",    "name": "Finish: Hot Honey Drizzle","description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGETARIAN"], "sort_order": 30},
    {"key": "pie_fin_basil",        "name": "Finish: Fresh Basil",      "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGAN"],      "sort_order": 31},
    {"key": "pie_fin_roasted_garlic","name": "Finish: Roasted Garlic",  "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGAN"],      "sort_order": 32},
    {"key": "pie_fin_extra_cheese", "name": "Finish: Extra Cheese",     "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "bar_pie", "dietary_flags": ["VEGETARIAN"], "sort_order": 33},

    # =========================================================================
    # MAINS
    # =========================================================================

    {
        "key": "smash_burger",
        "name": "Anchor Smash Burger",
        "description": "Twin patties, American cheese, lettuce, tomato, pickles, brioche bun",
        "price": 19.00,
        "category": "MAIN",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": [],
        "sort_order": 30,
    },
    # Smash Burger cook temps
    {"key": "smash_temp_mr",       "name": "Temp: Medium Rare",  "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": [], "sort_order": 1},
    {"key": "smash_temp_med",      "name": "Temp: Medium",       "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": [], "sort_order": 2},
    {"key": "smash_temp_mw",       "name": "Temp: Medium Well",  "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": [], "sort_order": 3},
    {"key": "smash_temp_wd",       "name": "Temp: Well Done",    "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": [], "sort_order": 4},
    # Smash Burger customization
    {"key": "smash_mod_no_bun",    "name": "No Bun",             "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 10},
    {"key": "smash_mod_gf_bun",    "name": "Gluten Free Bun",    "description": "", "price": 1.50, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 11},
    {"key": "smash_mod_no_pickle", "name": "No Pickles",         "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": [],              "sort_order": 12},
    {"key": "smash_mod_no_lettuce","name": "No Lettuce",         "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": [],              "sort_order": 13},
    {"key": "smash_mod_no_tomato", "name": "No Tomato",          "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": [],              "sort_order": 14},
    {"key": "smash_mod_add_bacon", "name": "Add Bacon",          "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": [],              "sort_order": 15},
    {"key": "smash_mod_add_egg",   "name": "Add Fried Egg",      "description": "", "price": 1.50, "category": "MAIN", "is_modifier": True, "parent_key": "smash_burger", "dietary_flags": ["VEGETARIAN"],  "sort_order": 16},

    {
        "key": "myo_burger",
        "name": "Make Your Own Burger",
        "description": "Choose your patty, cook temp, cheese, and toppings. Served on a brioche bun.",
        "price": 18.00,
        "category": "MAIN",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": [],
        "sort_order": 31,
    },
    # MYO Burger — Patty
    {"key": "myo_patty_angus",    "name": "Patty: Angus Beef",     "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [],        "sort_order": 1},
    {"key": "myo_patty_turkey",   "name": "Patty: Organic Turkey", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [],        "sort_order": 2},
    {"key": "myo_patty_beyond",   "name": "Patty: Beyond Burger",  "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGAN"], "sort_order": 3},
    {"key": "myo_patty_gc",       "name": "Patty: Grilled Cheese (No Protein)", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGETARIAN"], "sort_order": 4},
    # MYO Burger — Cook Temp
    {"key": "myo_temp_rare",      "name": "Temp: Rare",         "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [], "sort_order": 10},
    {"key": "myo_temp_mr",        "name": "Temp: Medium Rare",  "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [], "sort_order": 11},
    {"key": "myo_temp_med",       "name": "Temp: Medium",       "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [], "sort_order": 12},
    {"key": "myo_temp_mw",        "name": "Temp: Medium Well",  "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [], "sort_order": 13},
    {"key": "myo_temp_wd",        "name": "Temp: Well Done",    "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [], "sort_order": 14},
    {"key": "myo_temp_vwd",       "name": "Temp: Extra Well Done","description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [], "sort_order": 15},
    # MYO Burger — Cheese
    {"key": "myo_cheese_american","name": "Cheese: American",   "description": "", "price": 1.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGETARIAN"], "sort_order": 20},
    {"key": "myo_cheese_cheddar", "name": "Cheese: Cheddar",    "description": "", "price": 1.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGETARIAN"], "sort_order": 21},
    {"key": "myo_cheese_swiss",   "name": "Cheese: Swiss",      "description": "", "price": 1.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGETARIAN"], "sort_order": 22},
    {"key": "myo_cheese_none",    "name": "Cheese: No Cheese",  "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["DAIRY_FREE"], "sort_order": 23},
    # MYO Burger — Toppings
    {"key": "myo_top_lettuce",    "name": "Topping: Lettuce",           "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGAN"],      "sort_order": 30},
    {"key": "myo_top_tomato",     "name": "Topping: Tomato",            "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGAN"],      "sort_order": 31},
    {"key": "myo_top_onion",      "name": "Topping: Raw Onion",         "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGAN"],      "sort_order": 32},
    {"key": "myo_top_pickles",    "name": "Topping: Pickles",           "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGAN"],      "sort_order": 33},
    {"key": "myo_top_bacon",      "name": "Topping: Bacon",             "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [],             "sort_order": 34},
    {"key": "myo_top_fried_egg",  "name": "Topping: Fried Egg",         "description": "", "price": 1.50, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGETARIAN"], "sort_order": 35},
    {"key": "myo_top_avocado",    "name": "Topping: Avocado",           "description": "", "price": 2.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGAN"],      "sort_order": 36},
    {"key": "myo_top_mushrooms",  "name": "Topping: Sautéed Mushrooms", "description": "", "price": 1.50, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["VEGAN"],      "sort_order": 37},
    # MYO Burger — Bun
    {"key": "myo_bun_brioche",    "name": "Bun: Brioche",         "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": [],              "sort_order": 40},
    {"key": "myo_bun_gf",         "name": "Bun: Gluten Free",     "description": "", "price": 1.50, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 41},
    {"key": "myo_bun_none",       "name": "Bun: No Bun",          "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "myo_burger", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 42},

    {
        "key": "ribeye",
        "name": "Grilled Ribeye (14oz)",
        "description": "Garlic herb butter. Served with choice of two sides.",
        "price": 52.00,
        "category": "MAIN",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["GLUTEN_FREE"],
        "sort_order": 32,
    },
    # Ribeye cook temps
    {"key": "ribeye_temp_rare",   "name": "Temp: Rare",        "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "ribeye", "dietary_flags": [], "sort_order": 1},
    {"key": "ribeye_temp_mr",     "name": "Temp: Medium Rare", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "ribeye", "dietary_flags": [], "sort_order": 2},
    {"key": "ribeye_temp_med",    "name": "Temp: Medium",      "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "ribeye", "dietary_flags": [], "sort_order": 3},
    {"key": "ribeye_temp_mw",     "name": "Temp: Medium Well", "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "ribeye", "dietary_flags": [], "sort_order": 4},
    {"key": "ribeye_temp_wd",     "name": "Temp: Well Done",   "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "ribeye", "dietary_flags": [], "sort_order": 5},

    {
        "key": "salmon_entree",
        "name": "Pan-Seared Salmon",
        "description": "Lemon dill sauce. Served with choice of two sides.",
        "price": 34.00,
        "category": "MAIN",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["GLUTEN_FREE", "FISH_ALLERGY"],
        "sort_order": 33,
    },
    {
        "key": "roasted_chicken",
        "name": "Roasted Half Chicken",
        "description": "Pan jus. Served with choice of two sides.",
        "price": 28.00,
        "category": "MAIN",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["GLUTEN_FREE"],
        "sort_order": 34,
    },
    {
        "key": "club_sandwich",
        "name": "Lodge Club Sandwich",
        "description": "Roasted turkey, bacon, lettuce, tomato, mayo, sourdough",
        "price": 19.00,
        "category": "MAIN",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": [],
        "sort_order": 35,
    },
    # Club Sandwich mods
    {"key": "club_mod_gf",         "name": "Gluten Free Bread",  "description": "", "price": 1.50, "category": "MAIN", "is_modifier": True, "parent_key": "club_sandwich", "dietary_flags": ["GLUTEN_FREE"], "sort_order": 1},
    {"key": "club_mod_no_bacon",   "name": "No Bacon",           "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "club_sandwich", "dietary_flags": [],              "sort_order": 2},
    {"key": "club_mod_no_mayo",    "name": "No Mayo",            "description": "", "price": 0.00, "category": "MAIN", "is_modifier": True, "parent_key": "club_sandwich", "dietary_flags": [],              "sort_order": 3},

    # =========================================================================
    # SIDES
    # =========================================================================

    {"key": "fries",            "name": "House-Cut Fries",       "description": "",                              "price": 8.00,  "category": "SIDE", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 1},
    {"key": "truffle_fries",    "name": "Truffle Parmesan Fries","description": "Shaved parmesan, fresh herbs",  "price": 11.00, "category": "SIDE", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 2},
    {"key": "whipped_potatoes", "name": "Whipped Potatoes",      "description": "Butter, chive",                "price": 8.00,  "category": "SIDE", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"], "sort_order": 3},
    {"key": "mac_cheese",       "name": "Macaroni & Cheese",     "description": "",                              "price": 9.00,  "category": "SIDE", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGETARIAN"],               "sort_order": 4},
    {"key": "asparagus",        "name": "Grilled Asparagus",     "description": "Lemon, sea salt",              "price": 9.00,  "category": "SIDE", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 5},
    {"key": "sauteed_spinach",  "name": "Sautéed Spinach",       "description": "Garlic, olive oil",            "price": 8.00,  "category": "SIDE", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"],      "sort_order": 6},

    # =========================================================================
    # SPECIALS
    # =========================================================================

    {
        "key": "prime_rib",
        "name": "Friday Prime Rib",
        "description": "12oz slow-roasted cut, au jus, horseradish cream, baked potato. Fridays only.",
        "price": 48.00,
        "category": "SPECIAL",
        "is_starter": False,
        "is_special": True,
        "is_modifier": False,
        "dietary_flags": ["GLUTEN_FREE"],
        "sort_order": 1,
    },
    {
        "key": "catch_of_week",
        "name": "Catch of the Week",
        "description": "Fresh market fish, pan-seared with seasonal vegetable risotto. Ask your server for today's selection and price (MP).",
        "price": 0.00,
        "category": "SPECIAL",
        "is_starter": False,
        "is_special": True,
        "is_modifier": False,
        "dietary_flags": ["GLUTEN_FREE", "FISH_ALLERGY"],
        "sort_order": 2,
    },

    # =========================================================================
    # DESSERTS
    # =========================================================================

    {
        "key": "brownie_sundae",
        "name": "Warm Chocolate Brownie Sundae",
        "description": "Vanilla bean ice cream, hot fudge, whipped cream",
        "price": 11.00,
        "category": "DESSERT",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 1,
    },
    {
        "key": "cheesecake",
        "name": "New York Style Cheesecake",
        "description": "Graham cracker crust, strawberry compote",
        "price": 10.00,
        "category": "DESSERT",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 2,
    },
    {
        "key": "fruit_cobbler",
        "name": "Seasonal Fruit Cobbler",
        "description": "Baked streusel topping, served warm with vanilla ice cream",
        "price": 10.00,
        "category": "DESSERT",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 3,
    },
    {
        "key": "myo_sundae",
        "name": "Make Your Own Sundae",
        "description": "Choose your base and toppings.",
        "price": 10.00,
        "category": "DESSERT",
        "is_starter": False,
        "is_special": False,
        "is_modifier": False,
        "dietary_flags": ["VEGETARIAN"],
        "sort_order": 4,
    },
    # Sundae — Ice Cream Base
    {"key": "sundae_ic_vanilla",    "name": "Ice Cream: Vanilla",         "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],           "sort_order": 1},
    {"key": "sundae_ic_chocolate",  "name": "Ice Cream: Chocolate",       "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],           "sort_order": 2},
    {"key": "sundae_ic_strawberry", "name": "Ice Cream: Strawberry",      "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],           "sort_order": 3},
    {"key": "sundae_ic_coffee",     "name": "Ice Cream: Coffee",          "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],           "sort_order": 4},
    # Sundae — Yogurt Base
    {"key": "sundae_yog_plain",     "name": "Yogurt: Plain",              "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],           "sort_order": 10},
    {"key": "sundae_yog_vanilla",   "name": "Yogurt: Vanilla",            "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],           "sort_order": 11},
    {"key": "sundae_yog_strawberry","name": "Yogurt: Strawberry",         "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],           "sort_order": 12},
    # Sundae — Vegan Ice Cream
    {"key": "sundae_vic_coconut",   "name": "Vegan IC: Coconut",          "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"], "sort_order": 20},
    {"key": "sundae_vic_chocolate", "name": "Vegan IC: Chocolate",        "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"], "sort_order": 21},
    {"key": "sundae_vic_mango",     "name": "Vegan IC: Mango Sorbet",     "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGAN", "DAIRY_FREE", "GLUTEN_FREE"], "sort_order": 22},
    # Sundae — Toppings
    {"key": "sundae_top_hot_fudge",  "name": "Topping: Hot Fudge",        "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN"],               "sort_order": 30},
    {"key": "sundae_top_caramel",    "name": "Topping: Caramel Sauce",    "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN"],               "sort_order": 31},
    {"key": "sundae_top_strawberry", "name": "Topping: Strawberry Sauce", "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],     "sort_order": 32},
    {"key": "sundae_top_whipped",    "name": "Topping: Whipped Cream",    "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN", "GLUTEN_FREE"],"sort_order": 33},
    {"key": "sundae_top_sprinkles",  "name": "Topping: Sprinkles",        "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN"],               "sort_order": 34},
    {"key": "sundae_top_cherries",   "name": "Topping: Maraschino Cherries","description":"", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGAN", "GLUTEN_FREE"],    "sort_order": 35},
    {"key": "sundae_top_oreo",       "name": "Topping: Crushed Oreo",     "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGETARIAN"],               "sort_order": 36},
    {"key": "sundae_top_granola",    "name": "Topping: Granola",          "description": "", "price": 0.00, "category": "DESSERT", "is_modifier": True, "parent_key": "myo_sundae", "dietary_flags": ["VEGAN"],                    "sort_order": 37},

    # =========================================================================
    # DRINKS
    # =========================================================================

    # Signature Cocktails
    {"key": "cocktail_old_fashioned", "name": "Lodge Old Fashioned",  "description": "Bourbon, Angostura bitters, orange peel, Luxardo cherry",              "price": 16.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["GLUTEN_FREE", "VEGAN"], "sort_order": 1},
    {"key": "cocktail_mule",          "name": "The Fairway Mule",     "description": "Vodka, fresh lime juice, ginger beer",                                   "price": 14.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["GLUTEN_FREE", "VEGAN"], "sort_order": 2},
    {"key": "cocktail_margarita",     "name": "Spicy Margarita",      "description": "Blanco tequila, jalapeño, agave, fresh lime, Tajín rim",                "price": 15.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["GLUTEN_FREE", "VEGAN"], "sort_order": 3},
    {"key": "cocktail_martini",       "name": "Classic Martini",      "description": "Gin or Vodka, dry vermouth, bleu cheese stuffed olives",                "price": 15.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["GLUTEN_FREE", "VEGAN"], "sort_order": 4},
    # Martini spirit choice
    {"key": "martini_gin",   "name": "Spirit: Gin",   "description": "", "price": 0.00, "category": "DRINK", "is_modifier": True, "parent_key": "cocktail_martini", "dietary_flags": ["GLUTEN_FREE", "VEGAN"], "sort_order": 1},
    {"key": "martini_vodka", "name": "Spirit: Vodka", "description": "", "price": 0.00, "category": "DRINK", "is_modifier": True, "parent_key": "cocktail_martini", "dietary_flags": ["GLUTEN_FREE", "VEGAN"], "sort_order": 2},

    # Draft Beer
    {"key": "beer_stella",   "name": "Stella Artois",      "description": "Draft",  "price": 8.00,  "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": [],             "sort_order": 10},
    {"key": "beer_guinness", "name": "Guinness Stout",     "description": "Draft",  "price": 9.00,  "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["GLUTEN_FREE"], "sort_order": 11},
    {"key": "beer_ipa",      "name": "Local Hazy IPA",     "description": "Draft",  "price": 9.00,  "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": [],             "sort_order": 12},
    {"key": "beer_amber",    "name": "Seasonal Amber Ale", "description": "Draft",  "price": 8.00,  "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": [],             "sort_order": 13},

    # Wine by the Glass
    {"key": "wine_cab",      "name": "Cabernet Sauvignon", "description": "Napa Valley",       "price": 16.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 20},
    {"key": "wine_pinot",    "name": "Pinot Noir",         "description": "Willamette Valley", "price": 15.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 21},
    {"key": "wine_chard",    "name": "Chardonnay",         "description": "Sonoma Coast",      "price": 14.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 22},
    {"key": "wine_sauv",     "name": "Sauvignon Blanc",    "description": "Marlborough",       "price": 14.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 23},

    # Non-Alcoholic
    {"key": "drink_coke",        "name": "Coca-Cola",               "description": "",                       "price": 4.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 30},
    {"key": "drink_diet_coke",   "name": "Diet Coke",               "description": "",                       "price": 4.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 31},
    {"key": "drink_sprite",      "name": "Sprite",                  "description": "",                       "price": 4.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 32},
    {"key": "drink_ginger_ale",  "name": "Ginger Ale",              "description": "",                       "price": 4.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 33},
    {"key": "drink_iced_tea",    "name": "Fresh Brewed Iced Tea",   "description": "Unsweetened or Sweet",   "price": 4.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 34},
    {"key": "drink_pellegrino",  "name": "Pellegrino Sparkling Water","description": "",                      "price": 5.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 35},
    {"key": "drink_coffee",      "name": "Locally Roasted Coffee",  "description": "Regular or Decaf",       "price": 5.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 36},
    {"key": "drink_espresso",    "name": "Espresso",                "description": "Single or Double",       "price": 5.00, "category": "DRINK", "is_starter": False, "is_special": False, "is_modifier": False, "dietary_flags": ["VEGAN", "GLUTEN_FREE"], "sort_order": 37},
]


def seed_menu(cur):
    """
    Seed the Anchor Lake menu.
    Safe to run multiple times — skips existing items by name.
    Inserts base items first, then modifiers (resolves parent_key -> parent_item_id).
    """
    key_to_id: dict = {}

    base_items = [i for i in MENU_ITEMS if not i.get("is_modifier")]
    modifiers   = [i for i in MENU_ITEMS if i.get("is_modifier")]

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
        parent_id  = key_to_id.get(parent_key) if parent_key else None
        insert_item(item, parent_id)

    return {
        "seeded":    len(MENU_ITEMS),
        "base":      len(base_items),
        "modifiers": len(modifiers),
    }