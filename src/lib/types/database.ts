export type SplitType = "equal" | "exact" | "percentage";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  client_request_id?: string | null;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profiles?: Profile;
}

export interface Expense {
  id: string;
  group_id: string;
  paid_by: string;
  created_by: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  split_type: SplitType;
  expense_date: string;
  created_at: string;
  updated_at: string;
  expense_participants?: ExpenseParticipant[];
  paid_by_profile?: Profile;
}

export interface ExpenseParticipant {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount: number;
  share_percentage: number | null;
  profiles?: Profile;
}

export interface Settlement {
  id: string;
  group_id: string;
  payer_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  note: string | null;
  settled_at: string;
  created_by: string;
  payer?: Profile;
  receiver?: Profile;
}

export interface Invite {
  id: string;
  group_id: string;
  email: string | null;
  invite_token: string;
  created_by: string;
  accepted_by: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface GroupWithMembers extends Group {
  group_members: GroupMember[];
}

export interface ActivityItem {
  id: string;
  type: "expense" | "settlement";
  title: string;
  amount: number;
  currency: string;
  group_id: string;
  group_name: string;
  created_at: string;
  actor_name: string | null;
}

export interface UserBalance {
  user_id: string;
  full_name: string | null;
  email: string;
  balance: number;
}
