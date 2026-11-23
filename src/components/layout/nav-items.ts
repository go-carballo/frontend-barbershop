import { canAccess } from "@/lib/rbac";
import type { AppRole, NavItem } from "@/types";

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type NavLeaf = NavItem & { href: string };

export type NavTrail = {
  group: NavGroup;
  item: NavItem;
  child?: NavItem;
};

export const navGroups: NavGroup[] = [
  {
    label: "nav.group.dashboard",
    items: [{ title: "nav.dashboard", href: "/app/overview", icon: "LayoutDashboard" }],
  },
  {
    label: "nav.group.management",
    items: [
      {
        title: "nav.customers",
        href: "/app/customers",
        icon: "Users",
        roles: ["admin", "barber", "receptionist"],
      },
      {
        title: "nav.barbers",
        href: "/app/barbers",
        icon: "UserCog",
        roles: ["admin", "barber", "receptionist"],
      },
      {
        title: "nav.services",
        href: "/app/services",
        icon: "CreditCard",
        roles: ["admin", "barber", "receptionist"],
      },
      { title: "nav.appointments", href: "/app/appointments", icon: "Calendar" },
      { title: "nav.notifications", href: "/app/notifications", icon: "Bell" },
    ],
  },
  {
    label: "nav.group.administration",
    items: [
      {
        title: "nav.users",
        href: "/app/users",
        icon: "Users",
        roles: ["admin"],
      },
    ],
  },
];

export const navItems: NavItem[] = navGroups.flatMap((group) => group.items);

const isLeaf = (item: NavItem): item is NavLeaf => Boolean(item.href);

export const navLeafItems: NavLeaf[] = navItems.flatMap((item) =>
  item.children ? item.children.filter(isLeaf) : isLeaf(item) ? [item] : [],
);

export const filterNavGroupsByRole = (groups: NavGroup[], role?: AppRole): NavGroup[] =>
  groups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) =>
          item.children
            ? { ...item, children: item.children.filter((child) => canAccess(role, child.roles)) }
            : item,
        )
        .filter(
          (item) => canAccess(role, item.roles) && (!item.children || item.children.length > 0),
        ),
    }))
    .filter((group) => group.items.length > 0);

export const resolveNavTrail = (pathname: string): NavTrail | undefined => {
  const candidates: { group: NavGroup; item: NavItem; child?: NavItem; href: string }[] = [];
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href) candidates.push({ group, item, href: item.href });
      for (const child of item.children ?? []) {
        if (child.href) candidates.push({ group, item, child, href: child.href });
      }
    }
  }
  const match = candidates
    .sort((a, b) => b.href.length - a.href.length)
    .find(({ href }) => pathname === href || pathname.startsWith(`${href}/`));
  if (!match) return undefined;
  return { group: match.group, item: match.item, child: match.child };
};
