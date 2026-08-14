import type { IconName } from "@/components/admin/Icon";

export type UserStats = {
  total: number;
  active: number;
  suspended: number;
};

export type RoleDist = {
  name: string;
  count: number;
  system: boolean;
};

export type DistrictSlice = {
  key: string;
  label: string;
  count: number;
};

export type SupporterStats = {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byDistrict: DistrictSlice[];
};

export type ActivityItem = {
  id: string;
  icon: IconName;
  tone: "blue" | "amber" | "green" | "neutral";
  title: string;
  sub: string;
  at: string; // ISO
};

export type QuickAction = {
  label: string;
  desc: string;
  href: string;
  icon: IconName;
};

export type DashboardData = {
  firstName: string;
  greeting: string;
  dateLabel: string;
  users: UserStats | null;
  roles: { total: number; distribution: RoleDist[] } | null;
  supporters: SupporterStats | null;
  activity: ActivityItem[];
  quickActions: QuickAction[];
};
