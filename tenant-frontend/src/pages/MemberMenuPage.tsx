import { useEffect, useState, Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  getActiveMenuItems,
  type MenuItem,
  type MenuCategory,
} from "../api/menu";

const CATEGORIES: MenuCategory[] = [
  "STARTER",
  "MAIN",
  "SIDE",
  "KIDS",
  "DESSERT",
  "DRINK",
  "SPECIAL",
];

const CATEGORY_LABELS: Record<MenuCategory, string> = {
  STARTER: "Starters",
  MAIN: "Mains",
  SIDE: "Sides",
  KIDS: "Kids",
  DESSERT: "Desserts",
  DRINK: "Drinks",
  SPECIAL: "Specials",
};

export function MemberMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  useEffect(() => {
    getActiveMenuItems()
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const parents = items.filter((i) => !i.is_modifier);
  const modsByParent: Record<number, MenuItem[]> = {};
  items
    .filter((i) => i.is_modifier && i.parent_item_id)
    .forEach((m) => {
      const pid = m.parent_item_id!;
      if (!modsByParent[pid]) modsByParent[pid] = [];
      modsByParent[pid].push(m);
    });

  const byCategory: Record<string, MenuItem[]> = {};
  parents.forEach((i) => {
    if (!byCategory[i.category]) byCategory[i.category] = [];
    byCategory[i.category].push(i);
  });

  const orderedCategories = CATEGORIES.filter((c) => byCategory[c]?.length > 0);

  if (loading) return <div className="table-state">Loading menu...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">Menu</h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {orderedCategories.map((cat) => {
          const catItems = byCategory[cat];
          const collapsed = collapsedCats.has(cat);

          return (
            <div
              key={cat}
              style={{
                border: "1px solid var(--zinc-200)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setCollapsedCats((prev) => {
                    const next = new Set(prev);
                    next.has(cat) ? next.delete(cat) : next.add(cat);
                    return next;
                  })
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.625rem 1rem",
                  background: "var(--zinc-50)",
                  border: "none",
                  cursor: "pointer",
                  borderBottom: collapsed
                    ? "none"
                    : "1px solid var(--zinc-200)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {collapsed ? (
                    <ChevronRight size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--zinc-600)",
                    }}
                  >
                    {CATEGORY_LABELS[cat as MenuCategory] ?? cat}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--zinc-500)" }}>
                    {catItems.length}
                  </span>
                </div>
              </button>

              {!collapsed && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {catItems.map((item) => (
                    <Fragment key={item.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          padding: "0.875rem 1rem",
                          borderBottom: "1px solid var(--zinc-100)",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginBottom: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 600,
                                color: "var(--zinc-900)",
                              }}
                            >
                              {item.name}
                            </span>
                            {item.is_special && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "1px 7px",
                                  borderRadius: "20px",
                                  background: "#fef3c7",
                                  color: "#92400e",
                                  letterSpacing: "0.04em",
                                  textTransform: "uppercase",
                                }}
                              >
                                Special
                              </span>
                            )}
                          </div>
                          {item.description && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--zinc-500)",
                                marginBottom: "4px",
                              }}
                            >
                              {item.description}
                            </div>
                          )}
                          {item.dietary_flags.length > 0 && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "var(--zinc-400)",
                              }}
                            >
                              {item.dietary_flags
                                .map((f) => f.replace(/_/g, " "))
                                .join(" · ")}
                            </div>
                          )}
                          {(modsByParent[item.id] || []).length > 0 && (
                            <div
                              style={{
                                marginTop: "6px",
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              {modsByParent[item.id].map((mod) => (
                                <div
                                  key={mod.id}
                                  style={{
                                    fontSize: "12px",
                                    color: "var(--zinc-500)",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    paddingLeft: "1rem",
                                  }}
                                >
                                  <span>+ {mod.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {orderedCategories.length === 0 && (
          <div className="table-state">No menu items available.</div>
        )}
      </div>
    </div>
  );
}
