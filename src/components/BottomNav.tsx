"use client";

import React from "react";
import { BarChart3, BookOpen, CalendarDays, Moon, StickyNote, type LucideIcon } from "lucide-react";

export type ActiveTab = "HOME" | "CALENDAR" | "NURSERY" | "REPORTS" | "DIARY";

export const TAB_TITLES: Record<ActiveTab, string> = {
  HOME: "기록장",
  CALENDAR: "캘린더",
  NURSERY: "수유방 모드",
  REPORTS: "성장 리포트",
  DIARY: "육아일기",
};

const TABS: { key: ActiveTab; label: string; Icon: LucideIcon }[] = [
  { key: "HOME", label: "기록장", Icon: StickyNote },
  { key: "CALENDAR", label: "캘린더", Icon: CalendarDays },
  { key: "NURSERY", label: "수유방", Icon: Moon },
  { key: "REPORTS", label: "리포트", Icon: BarChart3 },
  { key: "DIARY", label: "일기", Icon: BookOpen },
];

interface BottomNavProps {
  activeTab: ActiveTab;
  onChange: (tab: ActiveTab) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  return (
    <nav
      aria-label="주요 화면"
      className="pb-safe fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-700 dark:bg-night-900/95"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key;
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onChange(key)}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[60px] w-full flex-col items-center justify-center gap-1 text-xs transition-colors duration-150 ${
                  active
                    ? "font-extrabold text-sprout-700 dark:text-sprout-300"
                    : "font-semibold text-slate-600 active:text-slate-900 dark:text-slate-400 dark:active:text-slate-100"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-150 ${
                    active ? "bg-sprout-100 dark:bg-sprout-900/70" : ""
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
