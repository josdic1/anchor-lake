// api/users.ts
import { usersApi } from "./client";

export type MemberRelation = "PRIMARY" | "SPOUSE" | "CHILD" | "OTHER";

export interface HouseholdMember {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  relation: MemberRelation;
  dietary_flags: string[];
  notes?: string | null;
  is_active: boolean;
}

export async function getHouseholdMembers(
  userId: number,
): Promise<HouseholdMember[]> {
  const response = await usersApi.get<HouseholdMember[]>(
    `/users/${userId}/members`,
  );
  return response.data;
}

export async function getAllMembers(): Promise<HouseholdMember[]> {
  const response = await usersApi.get<HouseholdMember[]>("/users/members/all");
  return response.data;
}

export async function getDietaryOptions(): Promise<string[]> {
  const response = await usersApi.get<string[]>("/dietary-options");
  return response.data;
}

export async function createMember(
  userId: number,
  data: {
    first_name: string;
    last_name: string;
    relation: MemberRelation;
    dietary_flags: string[];
    notes?: string | null;
  },
): Promise<HouseholdMember> {
  const response = await usersApi.post<HouseholdMember>(
    `/users/${userId}/members`,
    data,
  );
  return response.data;
}

export async function updateMember(
  userId: number,
  memberId: number,
  data: Partial<{
    first_name: string;
    last_name: string;
    relation: MemberRelation;
    dietary_flags: string[];
    notes: string | null;
  }>,
): Promise<HouseholdMember> {
  const response = await usersApi.patch<HouseholdMember>(
    `/users/${userId}/members/${memberId}`,
    data,
  );
  return response.data;
}

export async function deleteMember(
  userId: number,
  memberId: number,
): Promise<void> {
  await usersApi.delete(`/users/${userId}/members/${memberId}`);
}
