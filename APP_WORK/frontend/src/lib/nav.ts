// Sidebar navigation configuration. Icons are Ionicons names.
export type NavItem = { label: string; route: string; icon: string; badge?: number };
export type NavSection = { title: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    title: "OVERVIEW",
    items: [
      { label: "Dashboard", route: "/dashboard", icon: "grid-outline" },
      { label: "Live Map", route: "/live-map", icon: "map-outline" },
    ],
  },
  {
    title: "OPERATIONS",
    items: [
      { label: "Incidents", route: "/incidents", icon: "alert-circle-outline", badge: 12 },
      { label: "Survivors", route: "/survivors", icon: "people-outline" },
      { label: "Volunteers", route: "/volunteers", icon: "hand-left-outline" },
      { label: "Rescue Teams", route: "/teams", icon: "shield-checkmark-outline" },
      { label: "Resources", route: "/resources", icon: "cube-outline" },
      { label: "Requests", route: "/requests", icon: "clipboard-outline" },
      { label: "Shelters", route: "/shelters", icon: "home-outline" },
    ],
  },
  {
    title: "COMMUNICATION",
    items: [
      { label: "Messages", route: "/messages", icon: "chatbubbles-outline", badge: 3 },
      { label: "Announcements", route: "/announcements", icon: "megaphone-outline" },
      { label: "Alerts", route: "/alerts", icon: "notifications-outline" },
    ],
  },
  {
    title: "REPORTS & ANALYTICS",
    items: [
      { label: "Reports", route: "/reports", icon: "document-text-outline" },
      { label: "Analytics", route: "/analytics", icon: "bar-chart-outline" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Offline Data", route: "/offline", icon: "cloud-offline-outline" },
      { label: "Settings", route: "/settings", icon: "settings-outline" },
    ],
  },
];

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/live-map": "Live Map",
  "/incidents": "Incidents",
  "/survivors": "Survivors",
  "/volunteers": "Volunteers",
  "/teams": "Rescue Teams",
  "/resources": "Resources",
  "/requests": "Resource Requests",
  "/shelters": "Shelters",
  "/messages": "Messages",
  "/announcements": "Announcements",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/analytics": "Analytics",
  "/offline": "Offline Data",
  "/settings": "Settings",
  "/profile": "Profile",
  "/sos": "Emergency SOS",
};
