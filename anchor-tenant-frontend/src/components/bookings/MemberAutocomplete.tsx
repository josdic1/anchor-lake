import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import { getAllMembers, type HouseholdMember } from "../../api/users";

type Props = {
  onSelectMember: (member: HouseholdMember) => void;
  disabled?: boolean;
};

export function MemberAutocomplete({
  onSelectMember,
  disabled = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMembers() {
      setLoading(true);
      try {
        const data = await getAllMembers();
        setMembers(data);
      } catch (err) {
        console.error("Failed to load members", err);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredMembers = members.filter((m) => {
    const fullName = `${m.first_name} ${m.last_name}`.toLowerCase();
    return fullName.includes(query.toLowerCase());
  });

  function handleSelect(member: HouseholdMember) {
    onSelectMember(member);
    setQuery("");
    setIsOpen(false);
  }

  return (
    <div
      className="member-autocomplete"
      ref={wrapperRef}
      style={{ position: "relative", marginBottom: "12px" }}
    >
      <div style={{ position: "relative" }}>
        <Search
          size={14}
          style={{
            position: "absolute",
            left: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "#666",
          }}
        />
        <input
          type="text"
          placeholder="Search club members to add as guests..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          disabled={disabled || loading}
          style={{
            width: "100%",
            paddingLeft: "32px",
            paddingRight: "12px",
            height: "36px",
            border: "1px solid #ccc",
            borderRadius: "4px",
          }}
        />
      </div>

      {isOpen && query && (
        <ul
          className="autocomplete-dropdown"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ccc",
            borderRadius: "4px",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 10,
            listStyle: "none",
            margin: "4px 0 0 0",
            padding: 0,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {filteredMembers.length === 0 ? (
            <li
              style={{ padding: "8px 12px", color: "#666", fontSize: "13px" }}
            >
              No members found.
            </li>
          ) : (
            filteredMembers.map((m) => (
              <li
                key={m.id}
                onClick={() => handleSelect(m)}
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                  fontSize: "13px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f0f4f8")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <div style={{ fontWeight: 600 }}>
                  {m.first_name} {m.last_name}
                </div>
                <div style={{ fontSize: "11px", color: "#666" }}>
                  Member Guest{" "}
                  {m.dietary_flags.length > 0 &&
                    `• ${m.dietary_flags.join(", ")}`}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
