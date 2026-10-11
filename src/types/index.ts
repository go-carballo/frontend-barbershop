export type NavItem = {
  title: string;
  href?: string;
  icon: string;
  roles?: AppRole[];
  children?: NavItem[];
};

/** Roles emitted verbatim by the NestJS API. */
export type AppRole = "admin" | "barber" | "receptionist";

export type Session = {
  user: {
    id: string;
    name: string;
    email: string;
    role?: AppRole;
    organization: string;
  };
  isAuthenticated: boolean;
  accessToken: string;
  expiresAt: number;
};

export type DashboardKpi = {
  id: string;
  label: string;
  value: number;
  change: number;
  tone: "positive" | "neutral";
  spark: number[];
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserStatus = "Active" | "Invited" | "Paused";

/** Shared color vocabulary for appointment state. */
export type CalendarTone = "accent" | "success" | "warning" | "neutral";

export type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  time: string;
  tone: CalendarTone;
};
