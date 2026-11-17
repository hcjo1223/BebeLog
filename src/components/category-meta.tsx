import {
  Activity,
  Baby,
  Bath,
  Droplets,
  Milk,
  Moon,
  Pill,
  StickyNote,
  Thermometer,
  type LucideIcon,
} from "lucide-react";
import type { ActivityCategory } from "@/lib/mock-data";

interface CategoryMeta {
  label: string;
  sheetTitle: string;
  Icon: LucideIcon;
  // 원형 일러스트 타일 이미지 (public/*-128.png)
  tileSrc: string;
  // 타임라인 도트 / 아이콘 박스 색상
  dot: string;
  box: string;
}

export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  FEEDING: {
    label: "수유",
    sheetTitle: "수유 기록",
    Icon: Milk,
    tileSrc: "/bottle-128.png",
    dot: "bg-sky-500",
    box: "bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-200",
  },
  SLEEP: {
    label: "수면",
    sheetTitle: "수면 기록",
    Icon: Moon,
    tileSrc: "/crib-128.png",
    dot: "bg-indigo-400",
    box: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-200",
  },
  DIAPER: {
    label: "기저귀",
    sheetTitle: "기저귀 기록",
    Icon: Baby,
    tileSrc: "/diaper-128.png",
    dot: "bg-sprout-500",
    box: "bg-sprout-100 text-sprout-800 dark:bg-sprout-900/70 dark:text-sprout-200",
  },
  TEMPERATURE: {
    label: "체온",
    sheetTitle: "체온 기록",
    Icon: Thermometer,
    tileSrc: "/measurement-128.png",
    dot: "bg-rose-500",
    box: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
  },
  MEDICATION: {
    label: "투약",
    sheetTitle: "투약 기록",
    Icon: Pill,
    tileSrc: "/med-128.png",
    dot: "bg-fuchsia-500",
    box: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/60 dark:text-fuchsia-200",
  },
  BATH: {
    label: "목욕",
    sheetTitle: "목욕 기록",
    Icon: Bath,
    tileSrc: "/bath-128.png",
    dot: "bg-cyan-500",
    box: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-200",
  },
  PUMPING: {
    label: "유축",
    sheetTitle: "유축 기록",
    Icon: Droplets,
    tileSrc: "/pump-128.png",
    dot: "bg-purple-500",
    box: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-200",
  },
  TUMMY_TIME: {
    label: "터미타임",
    sheetTitle: "터미타임 기록",
    Icon: Activity,
    tileSrc: "/activity-128.png",
    dot: "bg-amber-500",
    box: "bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200",
  },
  NOTE: {
    label: "메모",
    sheetTitle: "육아 메모",
    Icon: StickyNote,
    tileSrc: "/note-128.png",
    dot: "bg-slate-500",
    box: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
  },
};

// 빠른 기록 타일/선택 그리드에 노출되는 순서
export const CATEGORY_ORDER: ActivityCategory[] = [
  "FEEDING",
  "DIAPER",
  "SLEEP",
  "TEMPERATURE",
  "PUMPING",
  "MEDICATION",
  "BATH",
  "TUMMY_TIME",
  "NOTE",
];
