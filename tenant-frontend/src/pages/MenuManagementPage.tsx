import React, { useEffect, useState, Fragment } from "react";
import {
  Plus,
  Edit2,
  Power,
  X,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { TenantLoader } from "../components/shared/TenantLoader";
import {
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deactivateMenuItem,
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

const DIETARY_FLAGS = [
  "DAIRY_FREE",
  "EGG_FREE",
  "FISH_ALLERGY",
  "GLUTEN_FREE",
  "HALAL",
  "KOSHER",
  "NUT_ALLERGY",
  "PEANUT_ALLERGY",
  "SESAME_ALLERGY",
  "SHELLFISH_ALLERGY",
  "SOY_FREE",
  "VEGAN",
  "VEGETARIAN",
];

const EMPTY_FORM = {
  name: "",
  description: "",
  price: 0,
  category: "MAIN" as MenuCategory,
  is_starter: false,
  is_special: false,
  is_modifier: false,
  parent_item_id: null as number | null,
  dietary_flags: [] as string[],
  sort_order: 0,
};

function Badge({
  label,
  color = "default",
}: {
  label: string;
  color?: "green" | "red" | "blue" | "default";
}) {
  const map = {
    default: ["var(--zinc-100)", "var(--zinc-600)"],
    green: ["#dcfce7", "#166534"],
    red: ["#fee2e2", "#991b1b"],
    blue: ["#dbeafe", "#1e40af"],
  };
  const [bg, fg] = map[color];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 8px",
        borderRadius: "20px",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: bg,
        color: fg,
      }}
    >
      {label}
    </span>
  );
}

export function MenuManagementPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualLoading, setManualLoading] = useState(false);
  const [, setError] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
  const [filterCat, setFilterCat] = useState("ALL");
  const [filterActive, setFilterActive] = useState("ALL");

  useEffect(() => {
    getMenuItems()
      .then(setItems)
      .catch(() => setError("Failed to load menu."))
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    setSaveError("");
    setDrawerOpen(true);
  }
  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      category: item.category,
      is_starter: item.is_starter,
      is_special: item.is_special,
      is_modifier: item.is_modifier,
      parent_item_id: item.parent_item_id,
      dietary_flags: [...item.dietary_flags],
      sort_order: item.sort_order,
    });
    setSaveError("");
    setDrawerOpen(true);
  }
  function closeDrawer() {
    setDrawerOpen(false);
    setEditingItem(null);
    setSaveError("");
  }
  function clearFilters() {
    setFilterCat("ALL");
    setFilterActive("ALL");
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setSaveError("Name is required.");
      return;
    }
    if (!form.price || form.price <= 0) {
      setSaveError("Price must be > 0.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      if (editingItem) {
        const updated = await updateMenuItem(editingItem.id, form);
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? updated : i)),
        );
      } else {
        const created = await createMenuItem(form);
        setItems((prev) => [...prev, created]);
      }
      closeDrawer();
    } catch (err: any) {
      setSaveError(err?.response?.data?.detail ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: MenuItem) {
    try {
      if (item.is_active) {
        await deactivateMenuItem(item.id);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, is_active: false } : i)),
        );
      } else {
        const updated = await updateMenuItem(item.id, { is_active: true });
        setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      }
    } catch {
      alert("Failed to update.");
    }
  }

  const parents = items.filter((i) => !i.is_modifier);
  const modsByParent: Record<number, MenuItem[]> = {};
  items
    .filter((i) => i.is_modifier && i.parent_item_id)
    .forEach((m) => {
      const pid = m.parent_item_id!;
      if (!modsByParent[pid]) modsByParent[pid] = [];
      modsByParent[pid].push(m);
    });

  const filteredParents = parents.filter((i) => {
    if (filterCat !== "ALL" && i.category !== filterCat) return false;
    if (filterActive === "ACTIVE" && !i.is_active) return false;
    if (filterActive === "INACTIVE" && i.is_active) return false;
    return true;
  });

  const byCategory: Record<string, MenuItem[]> = {};
  filteredParents.forEach((i) => {
    if (!byCategory[i.category]) byCategory[i.category] = [];
    byCategory[i.category].push(i);
  });

  const potentialParents = parents.filter((i) => i.is_active);
  const isFiltered = filterCat !== "ALL" || filterActive !== "ALL";

  const thStyle: React.CSSProperties = {
    padding: "0.5rem 1rem",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    color: "var(--zinc-500)",
    textAlign: "left",
    borderBottom: "1px solid var(--zinc-100)",
    background: "var(--bg-surface)",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    fontSize: "13px",
    color: "var(--zinc-800)",
    borderBottom: "1px solid var(--zinc-100)",
    verticalAlign: "middle",
  };
  const tdSmStyle: React.CSSProperties = {
    ...tdStyle,
    padding: "0.5rem 1rem",
    fontSize: "12px",
    color: "var(--zinc-600)",
    backgroundColor: "var(--zinc-50)",
  };
  const iconBtn: React.CSSProperties = {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--zinc-500)",
    padding: "3px 5px",
    borderRadius: "4px",
    display: "inline-flex",
    alignItems: "center",
  };

  if (loading) return <TenantLoader />;

  return (
    <div className="fade-in">
      {/* MANUAL LOADER PORTAL */}
      {manualLoading && (
        <TenantLoader isManual manualExit={() => setManualLoading(false)} />
      )}

      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h2 className="page-title">Menu Management</h2>
          <button
            className="btn-ghost"
            style={{
              padding: "4px 8px",
              display: "flex",
              gap: "6px",
              alignItems: "center",
              fontSize: "11px",
            }}
            onClick={() => setManualLoading(true)}
          >
            <Loader2
              size={12}
              className={manualLoading ? "animate-spin" : ""}
            />
          </button>
        </div>
        <button className="btn-primary" onClick={openNew}>
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <select
          className="filter-input"
          style={{ width: "auto" }}
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="filter-input"
          style={{ width: "auto" }}
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
        >
          <option value="ALL">All Items</option>
          <option value="ACTIVE">Active Only</option>
          <option value="INACTIVE">Inactive Only</option>
        </select>
        {isFiltered && (
          <button
            onClick={clearFilters}
            className="btn-ghost"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              color: "var(--zinc-500)",
            }}
          >
            <RotateCcw size={13} /> Clear
          </button>
        )}
        <span
          style={{
            fontSize: "13px",
            color: "var(--zinc-500)",
            marginLeft: "auto",
          }}
        >
          {filteredParents.length} items
        </span>
      </div>

      {/* Grouped table */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {Object.entries(byCategory).map(([cat, catItems]) => {
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
                    {cat}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--zinc-500)" }}>
                    {catItems.length}
                  </span>
                </div>
              </button>

              {!collapsed && (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "icon",
                        "Name",
                        "Price",
                        "Dietary",
                        "Tags",
                        "Status",
                        "Actions",
                      ].map((h) => (
                        <th key={h} style={thStyle}>
                          {h === "icon" ? "" : h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map((item) => (
                      <Fragment key={item.id}>
                        <tr style={{ opacity: item.is_active ? 1 : 0.45 }}>
                          <td style={{ ...tdStyle, width: "32px" }}>
                            <Power
                              size={12}
                              color={item.is_active ? "#10b981" : "#ccc"}
                            />
                          </td>
                          <td style={tdStyle}>
                            <div style={{ fontWeight: 600 }}>{item.name}</div>
                            {item.description && (
                              <div
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 400,
                                  color: "var(--zinc-500)",
                                  marginTop: "1px",
                                  maxWidth: "280px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td style={tdStyle}>${item.price.toFixed(2)}</td>
                          <td
                            style={{
                              ...tdStyle,
                              fontSize: "11px",
                              color: "var(--zinc-500)",
                            }}
                          >
                            {item.dietary_flags.length > 0
                              ? item.dietary_flags
                                  .map((f) => f.replace(/_/g, " "))
                                  .join(", ")
                              : "—"}
                          </td>
                          <td style={tdStyle}>
                            <div
                              style={{
                                display: "flex",
                                gap: "4px",
                                flexWrap: "wrap",
                              }}
                            >
                              {item.is_starter && (
                                <Badge label="Pre-order" color="blue" />
                              )}
                              {item.is_special && <Badge label="Special" />}
                              {(modsByParent[item.id]?.length ?? 0) > 0 && (
                                <Badge
                                  label={`${modsByParent[item.id].length} add-ons`}
                                />
                              )}
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <Badge
                              label={item.is_active ? "Active" : "Off"}
                              color={item.is_active ? "green" : "red"}
                            />
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "2px" }}>
                              <button
                                type="button"
                                style={iconBtn}
                                onClick={() => openEdit(item)}
                                title="Edit"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                type="button"
                                style={iconBtn}
                                onClick={() => handleToggle(item)}
                                title={
                                  item.is_active ? "Deactivate" : "Activate"
                                }
                              >
                                <Power size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {(modsByParent[item.id] || []).map((mod) => (
                          <tr
                            key={`mod-${mod.id}`}
                            style={{ opacity: mod.is_active ? 1 : 0.4 }}
                          >
                            <td style={{ ...tdSmStyle, width: "32px" }}>
                              <Power
                                size={11}
                                color={mod.is_active ? "#10b981" : "#ccc"}
                              />
                            </td>
                            <td style={{ ...tdSmStyle, paddingLeft: "2.5rem" }}>
                              <span
                                style={{
                                  color: "var(--zinc-500)",
                                  marginRight: "6px",
                                }}
                              >
                                ↳
                              </span>
                              {mod.name}
                            </td>
                            <td style={tdSmStyle}>+${mod.price.toFixed(2)}</td>
                            <td style={{ ...tdSmStyle, fontSize: "11px" }}>
                              {mod.dietary_flags.length > 0
                                ? mod.dietary_flags
                                    .map((f) => f.replace(/_/g, " "))
                                    .join(", ")
                                : "—"}
                            </td>
                            <td style={tdSmStyle}>
                              <Badge label="Modifier" />
                            </td>
                            <td style={tdSmStyle}>
                              <Badge
                                label={mod.is_active ? "Active" : "Off"}
                                color={mod.is_active ? "green" : "red"}
                              />
                            </td>
                            <td style={tdSmStyle}>
                              <div style={{ display: "flex", gap: "2px" }}>
                                <button
                                  type="button"
                                  style={iconBtn}
                                  onClick={() => openEdit(mod)}
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  style={iconBtn}
                                  onClick={() => handleToggle(mod)}
                                >
                                  <Power size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      {/* DRAWER remains the same as previous full code... */}
      {drawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(0,0,0,0.25)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDrawer();
          }}
        >
          <div
            style={{
              width: "440px",
              height: "100%",
              background: "var(--bg-surface)",
              boxShadow: "var(--shadow-flyout)",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.25rem 1.5rem",
                borderBottom: "1px solid var(--zinc-200)",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "20px",
                  fontWeight: 500,
                }}
              >
                {editingItem ? `Edit: ${editingItem.name}` : "New Menu Item"}
              </h3>
              <button
                type="button"
                className="btn-ghost btn-ghost--small"
                onClick={closeDrawer}
              >
                <X size={16} />
              </button>
            </div>
            <div
              style={{
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
                flex: 1,
              }}
            >
              <div className="form-stack">
                <label>
                  <span>Name *</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Item name"
                  />
                </label>
              </div>
              <div className="form-stack">
                <label>
                  <span>Description</span>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Short description"
                  />
                </label>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div className="form-stack">
                  <label>
                    <span>Price ($) *</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.price}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                </div>
                <div className="form-stack">
                  <label>
                    <span>Sort Order</span>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sort_order: parseInt(e.target.value) || 0,
                        })
                      }
                    />
                  </label>
                </div>
              </div>
              <div className="form-stack">
                <label>
                  <span>Category</span>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        category: e.target.value as MenuCategory,
                      })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-stack">
                <label>
                  <span>Item Type</span>
                  <select
                    value={form.is_modifier ? "MOD" : "BASE"}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        is_modifier: e.target.value === "MOD",
                        parent_item_id: null,
                      })
                    }
                  >
                    <option value="BASE">Base Item</option>
                    <option value="MOD">Modifier / Add-on</option>
                  </select>
                </label>
              </div>
              {form.is_modifier && (
                <div className="form-stack">
                  <label>
                    <span>Parent Item *</span>
                    <select
                      value={form.parent_item_id ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          parent_item_id: Number(e.target.value) || null,
                        })
                      }
                    >
                      <option value="">Select parent...</option>
                      {potentialParents.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.category})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <span className="field-label">Options</span>
                {(
                  [
                    ["is_starter", "Available for pre-order"],
                    ["is_special", "Mark as special / featured"],
                  ] as [keyof typeof form, string][]
                ).map(([key, label]) => (
                  <label
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      cursor: "pointer",
                      fontSize: "13px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form[key] as boolean}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.checked })
                      }
                      style={{
                        width: "16px",
                        height: "16px",
                        accentColor: "var(--zinc-900)",
                      }}
                    />
                    {label}
                  </label>
                ))}
              </div>
              <div>
                <span
                  className="field-label"
                  style={{ marginBottom: "0.5rem", display: "block" }}
                >
                  Dietary Flags
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {DIETARY_FLAGS.map((flag) => {
                    const active = form.dietary_flags.includes(flag);
                    return (
                      <button
                        key={flag}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            dietary_flags: f.dietary_flags.includes(flag)
                              ? f.dietary_flags.filter((x) => x !== flag)
                              : [...f.dietary_flags, flag],
                          }))
                        }
                        style={{
                          padding: "3px 10px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: active ? 600 : 400,
                          border: `1px solid ${active ? "var(--zinc-900)" : "var(--zinc-200)"}`,
                          backgroundColor: active
                            ? "var(--zinc-900)"
                            : "var(--bg-surface)",
                          color: active ? "white" : "var(--zinc-600)",
                          cursor: "pointer",
                        }}
                      >
                        {flag.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>
              {saveError && <p className="error-text">{saveError}</p>}
            </div>
            <div
              style={{
                padding: "1.25rem 1.5rem",
                borderTop: "1px solid var(--zinc-200)",
                display: "flex",
                gap: "0.75rem",
              }}
            >
              <button
                className="btn-primary"
                style={{ flex: 1 }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingItem
                    ? "Save Changes"
                    : "Add to Menu"}
              </button>
              <button className="btn-ghost" onClick={closeDrawer}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
