import { useEffect, useState } from "react";
import {
  getDietaryOptions,
  getHouseholdMembers,
  type HouseholdMember,
} from "../../api/users";
import { MemberAutocomplete } from "./MemberAutocomplete";

export type GuestForm = {
  id: string;
  first_name: string;
  last_name: string;
  dietary_flags: string[];
  dietary_other_note: string;
  is_member_guest: boolean;
  linked_member_id: number | null;
};

type Props = {
  userId: number | null;
  selectedMemberIds: number[];
  guests: GuestForm[];
  onMemberToggle: (id: number) => void;
  onGuestsChange: (guests: GuestForm[]) => void;
  onResolvedMembersChange: (members: HouseholdMember[]) => void;
};

function makeGuest(overrides: Partial<GuestForm> = {}): GuestForm {
  return {
    id: crypto.randomUUID(),
    first_name: "",
    last_name: "",
    dietary_flags: [],
    dietary_other_note: "",
    is_member_guest: false,
    linked_member_id: null,
    ...overrides,
  };
}

export function AttendeeSection({
  userId,
  selectedMemberIds,
  guests,
  onMemberToggle,
  onGuestsChange,
  onResolvedMembersChange,
}: Props) {
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>(
    [],
  );
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [dietaryOptions, setDietaryOptions] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) return;

    setMembersLoading(true);
    setMembersError("");
    setHouseholdMembers([]);

    Promise.all([getHouseholdMembers(userId), getDietaryOptions()])
      .then(([household, dietary]) => {
        setHouseholdMembers(household);
        setDietaryOptions(dietary);
      })
      .catch((err) => {
        setMembersError(
          err instanceof Error ? err.message : "Failed to load members.",
        );
      })
      .finally(() => setMembersLoading(false));
  }, [userId]);

  useEffect(() => {
    const resolved = householdMembers.filter((m) =>
      selectedMemberIds.includes(m.id),
    );
    onResolvedMembersChange(resolved);
  }, [selectedMemberIds, householdMembers]);

  function handleGuestNameChange(
    guestId: string,
    field: "first_name" | "last_name",
    value: string,
  ) {
    onGuestsChange(
      guests.map((g) => (g.id === guestId ? { ...g, [field]: value } : g)),
    );
  }

  function toggleGuestDietary(guestId: string, flag: string) {
    onGuestsChange(
      guests.map((g) => {
        if (g.id !== guestId) return g;
        const has = g.dietary_flags.includes(flag);
        return {
          ...g,
          dietary_flags: has
            ? g.dietary_flags.filter((f) => f !== flag)
            : [...g.dietary_flags, flag],
        };
      }),
    );
  }

  function addGuest() {
    onGuestsChange([...guests, makeGuest()]);
  }

  function handleSelectMemberGuest(member: HouseholdMember) {
    if (guests.some((g) => g.linked_member_id === member.id)) return;

    onGuestsChange([
      ...guests,
      makeGuest({
        first_name: member.first_name,
        last_name: member.last_name,
        is_member_guest: true,
        linked_member_id: member.id,
        dietary_flags: member.dietary_flags,
        dietary_other_note: member.dietary_other_note ?? "",
      }),
    ]);
  }

  function removeGuest(guestId: string) {
    onGuestsChange(guests.filter((g) => g.id !== guestId));
  }

  if (!userId) return null;
  if (membersLoading) return <p>Loading household members...</p>;
  if (membersError) return <p className="error-text">{membersError}</p>;

  return (
    <div className="attendee-section">
      <div className="attendee-block">
        <span className="field-label">
          Household Members (Required: At least 1)
        </span>

        {householdMembers.length === 0 ? (
          <p className="attendee-empty">No household members on file.</p>
        ) : (
          <div className="member-list">
            {householdMembers.map((member) => {
              const checked = selectedMemberIds.includes(member.id);
              return (
                <label
                  key={member.id}
                  className={`member-card ${checked ? "member-card--checked" : ""}`}
                >
                  <span className="member-card__row">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onMemberToggle(member.id)}
                    />
                    <span className="member-card__name">
                      {member.first_name} {member.last_name}
                      <span className="member-card__relation">
                        {member.relation}
                      </span>
                    </span>
                  </span>
                  {member.dietary_flags.length > 0 && (
                    <span className="member-card__dietary">
                      {member.dietary_flags.join(", ")}
                      {member.dietary_other_note &&
                        ` — ${member.dietary_other_note}`}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </div>

      <div className="attendee-block">
        <div className="attendee-block__header">
          <span className="field-label">Guests</span>
          <button
            type="button"
            className="btn-ghost btn-ghost--small"
            onClick={addGuest}
          >
            + Add Standard Guest
          </button>
        </div>

        <MemberAutocomplete onSelectMember={handleSelectMemberGuest} />

        {guests.length === 0 ? (
          <p className="attendee-empty">No guests added.</p>
        ) : (
          <div className="guest-list">
            {guests.map((guest, index) => (
              <div key={guest.id} className="guest-card">
                <div className="guest-card__header">
                  <span className="guest-card__label">Guest {index + 1}</span>
                  {guest.is_member_guest && (
                    <span className="guest-card__badge">Member Guest</span>
                  )}
                  <button
                    type="button"
                    className="guest-card__remove"
                    onClick={() => removeGuest(guest.id)}
                  >
                    Remove
                  </button>
                </div>

                <div className="guest-card__fields">
                  <input
                    type="text"
                    placeholder="First name"
                    value={guest.first_name}
                    disabled={guest.is_member_guest}
                    onChange={(e) =>
                      handleGuestNameChange(
                        guest.id,
                        "first_name",
                        e.target.value,
                      )
                    }
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={guest.last_name}
                    disabled={guest.is_member_guest}
                    onChange={(e) =>
                      handleGuestNameChange(
                        guest.id,
                        "last_name",
                        e.target.value,
                      )
                    }
                  />
                </div>

                {dietaryOptions.map((flag) => (
                  <div key={flag} className="dietary-option">
                    <input
                      type="checkbox"
                      id={`${guest.id}-${flag}`}
                      checked={guest.dietary_flags.includes(flag)}
                      disabled={guest.is_member_guest}
                      onChange={() => toggleGuestDietary(guest.id, flag)}
                    />
                    <label htmlFor={`${guest.id}-${flag}`}>
                      {flag.replace(/_/g, " ")}
                    </label>
                  </div>
                ))}
                {guest.dietary_flags.includes("OTHER") && (
                  <input
                    type="text"
                    placeholder="Please describe the dietary restriction..."
                    value={guest.dietary_other_note}
                    disabled={guest.is_member_guest}
                    onChange={(e) =>
                      onGuestsChange(
                        guests.map((g) =>
                          g.id === guest.id
                            ? { ...g, dietary_other_note: e.target.value }
                            : g,
                        ),
                      )
                    }
                    style={{ marginTop: "6px", width: "100%" }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
