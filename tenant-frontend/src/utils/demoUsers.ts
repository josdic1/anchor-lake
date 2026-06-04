export type DemoUser = {
  first_name: string;
  last_name: string;
  email: string;
};

export const DEMO_USERS: DemoUser[] = [
  { first_name: "[ADMIN] Admin", last_name: "User", email: "admin@demo.com" },
  { first_name: "[STAFF] Staff", last_name: "User", email: "staff@demo.com" },
  { first_name: "Member", last_name: "One", email: "member1@demo.com" },
  { first_name: "Member", last_name: "Two", email: "member2@demo.com" },
  { first_name: "Member", last_name: "Three", email: "member3@demo.com" },
];
