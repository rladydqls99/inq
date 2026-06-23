import { BookOpen, Flag, Home, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/challenges", label: "Challenges", icon: Flag },
  { to: "/decks", label: "Decks", icon: BookOpen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomTabNav() {
  return (
    <nav className="bottom-tab-nav" aria-label="Main navigation">
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/"}
            className={({ isActive }) =>
              isActive ? "bottom-tab-nav__item is-active" : "bottom-tab-nav__item"
            }
            title={tab.label}
          >
            <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
