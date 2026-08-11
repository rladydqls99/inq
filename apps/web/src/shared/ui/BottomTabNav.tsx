import { BookOpen, Flag, Home, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

const tabs = [
  { to: "/", label: "홈", icon: Home },
  { to: "/challenges", label: "챌린지", icon: Flag },
  { to: "/decks", label: "덱", icon: BookOpen },
  { to: "/settings", label: "설정", icon: Settings },
];

export function BottomTabNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-10 min-h-[var(--bottom-tab-height)] border-t border-inq-line bg-inq-canvas pb-[env(safe-area-inset-bottom,0px)]"
      aria-label="주요 메뉴"
    >
      <div className="mx-auto grid min-h-[var(--bottom-tab-height)] w-full max-w-[720px] grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                isActive
                  ? "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-inq-ink no-underline transition-[color,transform] active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-inq-ink focus-visible:outline-offset-[-3px] motion-reduce:transition-none [&>span:first-child]:bg-inq-highlight [&>span:first-child]:text-inq-on-highlight"
                  : "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-inq-ink-soft no-underline transition-[color,transform] active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-inq-ink focus-visible:outline-offset-[-3px] motion-reduce:transition-none"
              }
            >
              <span
                className="inline-grid size-8 h-6 place-items-center rounded-full transition-colors motion-reduce:transition-none"
                aria-hidden="true"
              >
                <Icon size={20} strokeWidth={2.2} />
              </span>
              <span className="max-w-full text-center text-sm font-bold leading-[1.4] text-balance break-keep">
                {tab.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
