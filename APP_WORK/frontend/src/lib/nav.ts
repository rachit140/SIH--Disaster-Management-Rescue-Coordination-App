// Sidebar navigation configuration. Icons are Ionicons names.
export type NavItem = { label: string; route: string; icon: string; badge?: number };
export type NavSection = { title: string; items: NavItem[] };

export const CITIZEN_NAV: NavSection[] = [
  {
    title: "SAFETY & EMERGENCY",
    items: [
      { label: "Dashboard", route: "/dashboard", icon: "grid-outline" },
      { label: "Missing Persons", route: "/missing-persons", icon: "people-outline" },
      { label: "Casualty Reporting", route: "/casualties", icon: "ribbon-outline" },
      { label: "Relief Camps", route: "/camps", icon: "home-outline" },
      { label: "Community Help", route: "/community-requests", icon: "heart-outline" },
      { label: "Live Map", route: "/live-map", icon: "map-outline" },
      { label: "Offline Data", route: "/offline", icon: "cloud-offline-outline" },
    ],
  },
  {
    title: "COMMUNITY UPDATES",
    items: [
      { label: "Announcements", route: "/announcements", icon: "megaphone-outline" },
      { label: "Alerts", route: "/alerts", icon: "notifications-outline" },
    ],
  }
];

export const AGENCY_NAV: NavSection[] = [
  {
    title: "COMMAND HQ",
    items: [
      { label: "Dashboard", route: "/dashboard", icon: "grid-outline" },
      { label: "Crisis Updates", route: "/incidents", icon: "alert-circle-outline" },
      { label: "Missing Persons Verification", route: "/missing-persons", icon: "checkmark-circle-outline" },
      { label: "Casualties", route: "/casualties", icon: "ribbon-outline" },
      { label: "Relief Camps", route: "/camps", icon: "home-outline" },
      { label: "Resources", route: "/resources", icon: "cube-outline" },
      { label: "Training", route: "/training", icon: "school-outline" },
      { label: "Analytics Desk", route: "/analytics", icon: "bar-chart-outline" },
    ],
  },
  {
    title: "FIELD RESPONDERS",
    items: [
      { label: "Rescue Teams", route: "/teams", icon: "shield-checkmark-outline" },
      { label: "Volunteers", route: "/volunteers", icon: "hand-left-outline" },
      { label: "Resource Requests", route: "/requests", icon: "clipboard-outline" },
      { label: "Survivors Triage", route: "/survivors", icon: "people-outline" },
    ],
  },
  {
    title: "COMMUNICATIONS",
    items: [
      { label: "Secure Chat", route: "/messages", icon: "chatbubbles-outline", badge: 3 },
      { label: "Broadcast Alert", route: "/alerts", icon: "notifications-outline" },
    ],
  }
];

export const NAV = CITIZEN_NAV;
export const ADMIN_NAV = AGENCY_NAV;

export const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/live-map": "Live Map",
  "/incidents": "Incidents",
  "/survivors": "Survivors",
  "/volunteers": "Volunteers",
  "/teams": "Rescue Teams",
  "/resources": "Resources",
  "/requests": "Resource Requests",
  "/camps": "Relief Camps",
  "/messages": "Messages",
  "/announcements": "Announcements",
  "/alerts": "Alerts",
  "/reports": "Reports",
  "/analytics": "Analytics",
  "/offline": "Offline Data",
  "/settings": "Settings",
  "/profile": "Profile",
  "/sos": "Emergency SOS",
  "/missing-persons": "Missing Persons",
  "/casualties": "Casualties",
  "/training": "Training",
  "/community-requests": "Help Relief Camps",
};
