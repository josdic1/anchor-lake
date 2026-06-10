import { useEffect, useState } from "react";
import { Trash2, UserPlus, X, Edit2, Check, RotateCcw } from "lucide-react";
import {
  getHouseholdMembers,
  createMember,
  deleteMember,
  updateMember,
  getDietaryOptions,
  type HouseholdMember,
  type MemberRelation,
} from "../api/users";
import { useAuth } from "../hooks/useAuth";

const RELATION_OPTIONS: { value: MemberRelation; label: string }[] = [
  { value: "PRIMARY", label: "Self (Primary)" },
  { value: "SPOUSE", label: "Spouse" },
  { value: "CHILD", label: "Child" },
  { value: "OTHER", label: "Other" },
];

export function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [dietaryOptions, setDietaryOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [newMember, setNewMember] = useState({
    first_name: "",
    last_name: "",
    relation: "OTHER" as MemberRelation,
    dietary_flags: [] as string[],
    dietary_other_note: "",
  });

  const [editForm, setEditForm] = useState<Partial<HouseholdMember>>({});

  useEffect(() => {
    if (user?.userId) {
      loadData();
    }
  }, [user?.userId]);

  async function loadData() {
    try {
      const [m, d] = await Promise.all([
        getHouseholdMembers(user!.userId),
        getDietaryOptions(),
      ]);
      setMembers(m);
      setDietaryOptions(d);
    } catch {
      setError("Failed to load household data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.userId) return;
    try {
      const created = await createMember(user.userId, {
        ...newMember,
        dietary_other_note: newMember.dietary_flags.includes("OTHER")
          ? newMember.dietary_other_note
          : null,
        notes: null,
      });
      setMembers([...members, created]);
      setShowAddForm(false);
      setNewMember({
        first_name: "",
        last_name: "",
        relation: "OTHER",
        dietary_flags: [],
        dietary_other_note: "",
      });
    } catch {
      setError("Failed to add member.");
    }
  }

  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.userId || !editingId) return;
    try {
      const updated = await updateMember(user.userId, editingId, {
        ...editForm,
        dietary_other_note: (editForm.dietary_flags || []).includes("OTHER")
          ? (editForm.dietary_other_note ?? null)
          : null,
      });
      setMembers(members.map((m) => (m.id === editingId ? updated : m)));
      setEditingId(null);
    } catch {
      setError("Failed to update member.");
    }
  }

  async function handleRemove(memberId: number) {
    if (!user?.userId) return;
    if (!window.confirm("Remove this member from your household?")) return;
    try {
      await deleteMember(user.userId, memberId);
      setMembers(members.filter((m) => m.id !== memberId));
    } catch {
      setError("Failed to remove member.");
    }
  }

  const startEditing = (member: HouseholdMember) => {
    setEditingId(member.id);
    setEditForm({
      ...member,
      dietary_other_note: member.dietary_other_note ?? "",
    });
    setShowAddForm(false);
  };

  const toggleDietary = (flag: string, isEdit: boolean) => {
    if (isEdit) {
      const current = editForm.dietary_flags || [];
      setEditForm({
        ...editForm,
        dietary_flags: current.includes(flag)
          ? current.filter((f) => f !== flag)
          : [...current, flag],
      });
    } else {
      setNewMember((prev) => ({
        ...prev,
        dietary_flags: prev.dietary_flags.includes(flag)
          ? prev.dietary_flags.filter((f) => f !== flag)
          : [...prev.dietary_flags, flag],
      }));
    }
  };

  if (loading) return <div className="table-state">Loading household...</div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h2 className="page-title">My Household</h2>
        <button
          className="btn-primary"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingId(null);
          }}
        >
          <UserPlus size={16} />
          {showAddForm ? "Cancel" : "Add Member"}
        </button>
      </div>

      {error && (
        <div className="error-text" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <section className="panel" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <h3>Add Member</h3>
            <button
              className="btn-ghost btn-ghost--small"
              onClick={() => setShowAddForm(false)}
            >
              <X size={14} />
            </button>
          </div>
          <form onSubmit={handleAddMember} className="form-stack">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <label>
                <span>First Name</span>
                <input
                  type="text"
                  value={newMember.first_name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, first_name: e.target.value })
                  }
                  required
                />
              </label>
              <label>
                <span>Last Name</span>
                <input
                  type="text"
                  value={newMember.last_name}
                  onChange={(e) =>
                    setNewMember({ ...newMember, last_name: e.target.value })
                  }
                  required
                />
              </label>
            </div>
            <label>
              <span>Relationship</span>
              <select
                value={newMember.relation}
                onChange={(e) =>
                  setNewMember({
                    ...newMember,
                    relation: e.target.value as MemberRelation,
                  })
                }
              >
                {RELATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="field-label">Dietary Restrictions</span>
              <div className="dietary-grid" style={{ marginTop: "0.5rem" }}>
                {dietaryOptions.map((opt) => (
                  <div
                    key={opt}
                    className="dietary-option"
                    onClick={() => toggleDietary(opt, false)}
                  >
                    <input
                      type="checkbox"
                      checked={newMember.dietary_flags.includes(opt)}
                      onChange={(e) => e.stopPropagation()}
                    />
                    {opt.replace(/_/g, " ")}
                  </div>
                ))}
              </div>
            </div>
            {newMember.dietary_flags.includes("OTHER") && (
              <label>
                <span>Please describe your dietary restriction</span>
                <input
                  type="text"
                  placeholder="e.g. lactose intolerant, low sodium..."
                  value={newMember.dietary_other_note}
                  onChange={(e) =>
                    setNewMember({
                      ...newMember,
                      dietary_other_note: e.target.value,
                    })
                  }
                />
              </label>
            )}
            <button type="submit" className="btn-primary">
              Save Member
            </button>
          </form>
        </section>
      )}

      <div className="member-list">
        {members.map((member) => (
          <article key={member.id} className="member-card">
            {editingId === member.id ? (
              <form onSubmit={handleUpdateMember} className="form-stack">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0.75rem",
                  }}
                >
                  <input
                    type="text"
                    value={editForm.first_name ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, first_name: e.target.value })
                    }
                  />
                  <input
                    type="text"
                    value={editForm.last_name ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, last_name: e.target.value })
                    }
                  />
                </div>
                <select
                  value={editForm.relation ?? "OTHER"}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      relation: e.target.value as MemberRelation,
                    })
                  }
                >
                  {RELATION_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div className="dietary-grid">
                  {dietaryOptions.map((opt) => (
                    <div
                      key={opt}
                      className="dietary-option"
                      onClick={() => toggleDietary(opt, true)}
                    >
                      <input
                        type="checkbox"
                        checked={(editForm.dietary_flags || []).includes(opt)}
                        onChange={() => toggleDietary(opt, true)}
                      />
                      {opt.replace(/_/g, " ")}
                    </div>
                  ))}
                </div>
                {(editForm.dietary_flags || []).includes("OTHER") && (
                  <label>
                    <span>Please describe your dietary restriction</span>
                    <input
                      type="text"
                      placeholder="e.g. lactose intolerant, low sodium..."
                      value={editForm.dietary_other_note ?? ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          dietary_other_note: e.target.value,
                        })
                      }
                    />
                  </label>
                )}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button type="submit" className="btn-primary">
                    <Check size={14} /> Update
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setEditingId(null)}
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="member-card-content">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div className="member-card__name">
                    {member.first_name} {member.last_name}
                    <span className="member-card__relation">
                      {member.relation}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      className="btn-ghost btn-ghost--small"
                      onClick={() => startEditing(member)}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn-ghost btn-ghost--small"
                      style={{
                        color: "var(--error)",
                        borderColor: "var(--error)",
                      }}
                      onClick={() => handleRemove(member.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {member.dietary_flags.length > 0 && (
                  <div className="member-card__dietary">
                    {member.dietary_flags.join(", ").replace(/_/g, " ")}
                    {member.dietary_other_note && (
                      <span> — {member.dietary_other_note}</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </article>
        ))}
        {members.length === 0 && !showAddForm && (
          <div className="table-state">No household members added yet.</div>
        )}
      </div>
    </div>
  );
}
