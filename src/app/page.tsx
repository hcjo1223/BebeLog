"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Sun,
  Moon,
  Droplets,
  Sparkles,
  Thermometer,
  Pill,
  Bath,
  Timer,
  Play,
  Pause,
  Square,
  Plus,
  Check,
  Calendar as CalendarIcon,
  BarChart3,
  BookOpen,
  Settings,
  MonitorSmartphone,
  StickyNote,
  Scale,
  Ruler,
  Award,
  Trash2,
  Eye,
  Lock,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  ActivityCategory,
  ActivityRecord,
  BabyProfile,
  BASE_NOW_MS,
  DiaryItem,
  GrowthItem,
  INITIAL_ACTIVITIES,
  INITIAL_BABIES,
  INITIAL_DIARIES,
  INITIAL_GROWTH_RECORDS,
  RunningTimer,
} from "@/lib/mock-data";

type ActiveTab = "HOME" | "CALENDAR" | "REPORTS" | "NURSERY" | "DIARY";

// 생후 일수(D+Day), 주수(weeks), 개월 수 계산 유틸리티 (Sprout Track 헤더 스타일)
function calculateAgeInfo(birthDateStr: string, dueDateStr?: string) {
  const birth = new Date(birthDateStr);
  const today = new Date("2026-11-11T12:00:00+09:00");
  const diffDays = Math.max(
    1,
    Math.floor((today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24)) + 1
  );
  const weeks = Math.floor(diffDays / 7);
  const months = Math.floor(diffDays / 30);
  const remainDays = diffDays % 30;

  let correctedDays: number | null = null;
  if (dueDateStr) {
    const due = new Date(dueDateStr);
    correctedDays = Math.floor(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
  }

  return { diffDays, weeks, months, remainDays, correctedDays };
}

// Sprout Track 원형 타일 상단 상태 버블용 HH:MM 포맷 ("2:31")
function formatBubbleDuration(isoDate: string | undefined, nowMs: number) {
  if (!isoDate) return "0:00";
  const diffMin = Math.max(
    1,
    Math.floor((nowMs - new Date(isoDate).getTime()) / 60000)
  );
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

// 한국어 경과 시간 ("2시간 31분 전")
function formatElapsedKo(isoDate: string, nowMs: number) {
  const diffMin = Math.max(
    1,
    Math.floor((nowMs - new Date(isoDate).getTime()) / 60000)
  );
  if (diffMin < 60) return `${diffMin}분 전`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `${h}시간 ${m}분 전` : `${h}시간 전`;
}

// 초 단위를 MM:SS 또는 HH:MM:SS로 변환
function formatTimerSec(totalSec: number) {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hrs > 0
    ? `${pad(hrs)}:${pad(mins)}:${pad(secs)}`
    : `${pad(mins)}:${pad(secs)}`;
}

// 시간대(오전 / 오후 / 밤·새벽) 분류 함수 (Sprout Track 타임라인 그룹핑)
function getTimePeriodLabel(isoDate: string): "오전 (Morning)" | "오후 (Afternoon)" | "밤·새벽 (Night)" {
  const hour = new Date(isoDate).getHours();
  if (hour >= 6 && hour < 12) return "오전 (Morning)";
  if (hour >= 12 && hour < 19) return "오후 (Afternoon)";
  return "밤·새벽 (Night)";
}

// SSR과 iOS Safari(WebKit) 간 toLocaleTimeString 공백/유니코드 불일치로 인한
// Hydration Error를 방지하기 위한 결정론적 한국어 시각 포맷터 ("오후 8:35")
function formatKoreanTime(isoDate: string): string {
  const d = new Date(isoDate);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const period = h < 12 ? "오전" : "오후";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${hour12}:${m}`;
}

export default function SproutTrackKoreanApp() {
  // 다크 모드 상태 (Sprout Track Deep Navy 테마: #111827)
  const [darkMode, setDarkMode] = useState(false);
  // 현재 활성화된 하단 탭
  const [activeTab, setActiveTab] = useState<ActiveTab>("HOME");

  // 아이 프로필 및 다둥이 선택 상태
  const [babies] = useState<BabyProfile[]>(INITIAL_BABIES);
  const [selectedBabyId, setSelectedBabyId] = useState<string>(INITIAL_BABIES[0].id);
  const [showBabySelector, setShowBabySelector] = useState(false);

  // 공동 양육자(Caretaker) PIN 전환 상태
  const [currentCaregiver, setCurrentCaregiver] = useState<"엄마" | "아빠" | "할머니">("엄마");

  // 일일 요약(Daily Summary) 접기/펼치기 및 24시간 히트맵 토글
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  // 육아 기록, 일기, 성장 기록 데이터 상태
  const [activities, setActivities] = useState<ActivityRecord[]>(INITIAL_ACTIVITIES);
  const [diaries, setDiaries] = useState<DiaryItem[]>(INITIAL_DIARIES);
  const [growthRecords, setGrowthRecords] = useState<GrowthItem[]>(INITIAL_GROWTH_RECORDS);

  // 실시간 작동 타이머 (SSR/CSR 초기 Hydration 일치를 위해 BASE_NOW_MS로 초기화 후 마운트 시 동기화)
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);
  const [nowMs, setNowMs] = useState<number>(BASE_NOW_MS);

  // 수유방 모드(Nursery Mode) 배경 색조(Hue) 및 밝기(Dim) 상태
  const [nurseryHue, setNurseryHue] = useState<number>(178); // 기본 Sprout Teal 색조
  const [nurseryDim, setNurseryDim] = useState<number>(15);  // 화면 어둡기 (0 ~ 70%)
  const [wakeLockActive, setWakeLockActive] = useState<boolean>(true);

  // 성장 리포트 탭 선택 (몸무게 | 키 | 머리둘레)
  const [growthChartMetric, setGrowthChartMetric] = useState<"WEIGHT" | "HEIGHT" | "HEAD">("WEIGHT");

  // 원형 타일 클릭 시 열리는 바텀 시트 모달 상태
  const [sheetCategory, setSheetCategory] = useState<ActivityCategory | null>(null);
  const [feedingType, setFeedingType] = useState<"FORMULA" | "BREAST" | "SOLID_FOOD">("FORMULA");
  const [formulaMl, setFormulaMl] = useState<number>(160);
  const [breastSide, setBreastSide] = useState<"LEFT" | "RIGHT" | "BOTH">("RIGHT");
  const [breastMinutes, setBreastMinutes] = useState<number>(15);
  const [diaperType, setDiaperType] = useState<"WET" | "SOLID" | "BOTH">("WET");
  const [stoolColor, setStoolColor] = useState<"YELLOW" | "BROWN" | "GREEN">("YELLOW");
  const [sleepMinutes, setSleepMinutes] = useState<number>(80);
  const [tempValue, setTempValue] = useState<number>(36.6);
  const [quickNote, setQuickNote] = useState<string>("");

  // 육아일기 모달 상태
  const [showDiaryModal, setShowDiaryModal] = useState(false);
  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryContent, setDiaryContent] = useState("");
  const [diaryMood, setDiaryMood] = useState("🥰");
  const [diaryTags, setDiaryTags] = useState("첫뒤집기, 폭풍성장");
  const [diaryMilestone, setDiaryMilestone] = useState(false);

  // 성장 기록 모달 상태
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [newWeight, setNewWeight] = useState("6.5");
  const [newHeight, setNewHeight] = useState("63.0");
  const [newHead, setNewHead] = useState("41.0");
  const [newGrowthNote, setNewGrowthNote] = useState("");

  // 삭제 실행 취소(Undo) 및 오프라인 배너 상태
  const [deletedActivityBackup, setDeletedActivityBackup] =
    useState<ActivityRecord | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // 다크 모드 HTML 클래스 동기화
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // 온라인/오프라인 상태 감지
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1초 주기 타이머 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const currentBaby = useMemo(
    () => babies.find((b) => b.id === selectedBabyId) ?? babies[0],
    [babies, selectedBabyId]
  );

  const ageInfo = useMemo(
    () => calculateAgeInfo(currentBaby.birthDate, currentBaby.dueDate),
    [currentBaby]
  );

  const babyActivities = useMemo(
    () =>
      activities
        .filter((a) => a.babyId === currentBaby.id)
        .sort(
          (a, b) =>
            new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        ),
    [activities, currentBaby.id]
  );

  // Sprout Track 스타일의 정밀 일일 요약(Daily Summary) 집계
  const dailySummary = useMemo(() => {
    let totalMl = 0;
    let bottleCount = 0;
    let breastCount = 0;
    let breastRightMin = 0;
    let breastLeftMin = 0;
    let totalSleepMin = 0;
    let wetCount = 0;
    let poopCount = 0;
    let medCount = 0;
    let noteCount = 0;
    let tummyMin = 19;
    let tummyCount = 2;

    babyActivities.forEach((act) => {
      if (act.category === "FEEDING") {
        if (act.amountMl) {
          totalMl += act.amountMl;
          bottleCount += 1;
        } else {
          breastCount += 1;
          const mins = Math.round((act.durationSec ?? 780) / 60);
          breastRightMin += Math.ceil(mins / 2);
          breastLeftMin += Math.floor(mins / 2);
        }
      } else if (act.category === "SLEEP") {
        totalSleepMin += Math.round((act.durationSec ?? 3600) / 60);
      } else if (act.category === "DIAPER") {
        if (act.details?.diaperType === "SOLID") {
          poopCount += 1;
        } else if (act.details?.diaperType === "BOTH") {
          wetCount += 1;
          poopCount += 1;
        } else {
          wetCount += 1;
        }
      } else if (act.category === "MEDICATION") {
        medCount += 1;
      } else if (act.category === "NOTE") {
        noteCount += 1;
      } else if (act.category === "TUMMY_TIME") {
        tummyCount += 1;
        tummyMin += Math.round((act.durationSec ?? 600) / 60);
      }
    });

    const awakeMin = Math.max(60, 14 * 60 - totalSleepMin);
    const lastFeeding = babyActivities.find((a) => a.category === "FEEDING");
    const lastSleep = babyActivities.find((a) => a.category === "SLEEP");
    const lastDiaper = babyActivities.find((a) => a.category === "DIAPER");

    return {
      totalMl,
      bottleCount,
      breastCount,
      breastRightMin,
      breastLeftMin,
      totalSleepMin,
      awakeMin,
      wetCount,
      poopCount,
      medCount,
      noteCount,
      tummyCount,
      tummyMin,
      lastFeeding,
      lastSleep,
      lastDiaper,
    };
  }, [babyActivities]);

  // 타임라인 시간대별 그룹핑 (오전 / 오후 / 밤·새벽)
  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityRecord[]> = {
      "오후 (Afternoon)": [],
      "오전 (Morning)": [],
      "밤·새벽 (Night)": [],
    };
    babyActivities.forEach((act) => {
      const label = getTimePeriodLabel(act.startedAt);
      groups[label].push(act);
    });
    return Object.entries(groups).filter(([, list]) => list.length > 0);
  }, [babyActivities]);

  // 타이머 경과 시간(초)
  const activeTimerSeconds = useMemo(() => {
    if (!runningTimer) return 0;
    if (runningTimer.isPaused) return runningTimer.accumulatedSec;
    const elapsed = Math.max(
      0,
      Math.floor((nowMs - runningTimer.startedAt) / 1000)
    );
    return runningTimer.accumulatedSec + elapsed;
  }, [runningTimer, nowMs]);

  // 타이머 시작
  const handleStartTimer = (
    category: RunningTimer["category"],
    label: string
  ) => {
    setRunningTimer({
      id: `timer-${Date.now()}`,
      category,
      label,
      startedAt: Date.now(),
      startedBy: currentCaregiver,
      isPaused: false,
      accumulatedSec: 0,
    });
  };

  // 타이머 일시정지/재개
  const handleTogglePauseTimer = () => {
    if (!runningTimer) return;
    if (runningTimer.isPaused) {
      setRunningTimer({
        ...runningTimer,
        startedAt: Date.now(),
        isPaused: false,
      });
    } else {
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - runningTimer.startedAt) / 1000)
      );
      setRunningTimer({
        ...runningTimer,
        isPaused: true,
        accumulatedSec: runningTimer.accumulatedSec + elapsed,
      });
    }
  };

  // 타이머 종료 및 즉시 타임라인 저장
  const handleStopAndSaveTimer = () => {
    if (!runningTimer) return;
    const finalSec = Math.max(60, activeTimerSeconds);
    const mins = Math.max(1, Math.round(finalSec / 60));

    let category: ActivityCategory = "FEEDING";
    let summaryTitle = "";
    let subDetail = `${runningTimer.startedBy}가 실시간 타이머로 기록`;

    if (runningTimer.category === "FEEDING_LEFT") {
      category = "FEEDING";
      summaryTitle = "모유 수유";
      subDetail = `왼쪽 (Left) · ${mins}분`;
    } else if (runningTimer.category === "FEEDING_RIGHT") {
      category = "FEEDING";
      summaryTitle = "모유 수유";
      subDetail = `오른쪽 (Right) · ${mins}분`;
    } else if (runningTimer.category === "SLEEP") {
      category = "SLEEP";
      summaryTitle = "낮잠 / 수면";
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      subDetail = `${h > 0 ? `${h}시간 ` : ""}${m}분 수면 완료`;
    } else if (runningTimer.category === "PUMPING") {
      category = "PUMPING";
      summaryTitle = "유축 완료";
      subDetail = `${mins}분 유축 · 모유 저장소 반영`;
    } else {
      category = "TUMMY_TIME";
      summaryTitle = "터미타임 (배밀이 연습)";
      subDetail = `${mins}분 진행`;
    }

    const newRecord: ActivityRecord = {
      id: `act-${Date.now()}`,
      babyId: currentBaby.id,
      category,
      startedAt: new Date().toISOString(),
      durationSec: finalSec,
      recordedBy: currentCaregiver,
      summaryTitle,
      subDetail,
      details: { timerCategory: runningTimer.category },
    };

    setActivities((prev) => [newRecord, ...prev]);
    setRunningTimer(null);
  };

  // 수유방 모드(Nursery Mode) 원탭 즉시 기록 핸들러
  const handleNurseryQuickTap = (
    category: ActivityCategory,
    title: string,
    detail: string,
    amountMl?: number,
    diaperKind?: "WET" | "SOLID" | "BOTH"
  ) => {
    const newRecord: ActivityRecord = {
      id: `act-${Date.now()}`,
      babyId: currentBaby.id,
      category,
      startedAt: new Date().toISOString(),
      amountMl,
      recordedBy: currentCaregiver,
      summaryTitle: title,
      subDetail: detail,
      details: diaperKind ? { diaperType: diaperKind } : {},
    };
    setActivities((prev) => [newRecord, ...prev]);
  };

  // 바텀 시트 상세 기록 저장 핸들러
  const handleSaveQuickActivity = () => {
    if (!sheetCategory) return;

    let summaryTitle = "";
    let subDetail = quickNote.trim() || undefined;
    let amountMl: number | undefined;
    let durationSec: number | undefined;
    let valueNum: number | undefined;
    let details: Record<string, unknown> = {};

    if (sheetCategory === "FEEDING") {
      if (feedingType === "FORMULA") {
        amountMl = formulaMl;
        summaryTitle = `분유 수유 ${formulaMl}ml`;
        if (!subDetail) subDetail = `젖병 수유 · ${currentCaregiver} 기록`;
        details = { feedingType: "FORMULA" };
      } else if (feedingType === "BREAST") {
        durationSec = breastMinutes * 60;
        const sideLabel =
          breastSide === "LEFT"
            ? "왼쪽 (Left)"
            : breastSide === "RIGHT"
            ? "오른쪽 (Right)"
            : "양쪽 (Both)";
        summaryTitle = "모유 수유";
        subDetail = `${sideLabel} · ${breastMinutes}분`;
        details = { feedingType: "BREAST", side: breastSide };
      } else {
        amountMl = formulaMl;
        summaryTitle = `이유식 ${formulaMl}g`;
        if (!subDetail) subDetail = "한우 브로콜리 미음";
        details = { feedingType: "SOLID_FOOD" };
      }
    } else if (sheetCategory === "DIAPER") {
      const typeLabel =
        diaperType === "WET"
          ? "소변 (Wet)"
          : diaperType === "SOLID"
          ? "대변 (Dirty)"
          : "대소변 혼합 (Both)";
      summaryTitle = typeLabel;
      const colorLabel =
        stoolColor === "YELLOW"
          ? "황금변"
          : stoolColor === "BROWN"
          ? "갈색변"
          : "녹변";
      subDetail =
        diaperType === "WET"
          ? subDetail || "기저귀 교체 완료"
          : `${colorLabel} · ${subDetail || "기저귀 교체 완료"}`;
      details = { diaperType, stoolColor };
    } else if (sheetCategory === "SLEEP") {
      durationSec = sleepMinutes * 60;
      const h = Math.floor(sleepMinutes / 60);
      const m = sleepMinutes % 60;
      summaryTitle = "낮잠 / 수면";
      subDetail = `${h > 0 ? `${h}시간 ` : ""}${m > 0 ? `${m}분` : ""}`;
    } else if (sheetCategory === "TEMPERATURE") {
      valueNum = tempValue;
      summaryTitle = `체온 ${tempValue.toFixed(1)}°C`;
      subDetail = tempValue >= 37.5 ? "미열/발열 관찰 필요" : "정상 체온";
    } else if (sheetCategory === "MEDICATION") {
      summaryTitle = "비타민 D 드롭 / 투약";
      subDetail = subDetail || "비타민 D 2방울 (2ml) 복용 완료";
    } else if (sheetCategory === "BATH") {
      summaryTitle = "목욕 & 로션 케어";
      subDetail = subDetail || "따뜻한 물 목욕 완료";
    } else if (sheetCategory === "PUMPING") {
      amountMl = 120;
      summaryTitle = "모유 유축 120ml";
      subDetail = subDetail || "좌 60ml · 우 60ml (모유 저장팩 보관)";
    } else if (sheetCategory === "TUMMY_TIME") {
      durationSec = 10 * 60;
      summaryTitle = "터미타임 (Tummy Time)";
      subDetail = subDetail || "10분 동안 고개 들기 연습";
    } else {
      summaryTitle = "육아 메모 (Note)";
      subDetail = subDetail || "오늘 컨디션 아주 좋음";
    }

    const newRecord: ActivityRecord = {
      id: `act-${Date.now()}`,
      babyId: currentBaby.id,
      category: sheetCategory,
      startedAt: new Date().toISOString(),
      amountMl,
      durationSec,
      valueNum,
      recordedBy: currentCaregiver,
      summaryTitle,
      subDetail,
      details,
    };

    setActivities((prev) => [newRecord, ...prev]);
    setQuickNote("");
    setSheetCategory(null);
  };

  // 타임라인 삭제 및 Undo 복구
  const handleDeleteActivity = (id: string) => {
    const target = activities.find((a) => a.id === id);
    if (target) setDeletedActivityBackup(target);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const handleUndoDelete = () => {
    if (!deletedActivityBackup) return;
    setActivities((prev) => [deletedActivityBackup, ...prev]);
    setDeletedActivityBackup(null);
  };

  // 감성 육아일기 저장
  const handleSaveDiary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!diaryTitle.trim() || !diaryContent.trim()) return;

    const newDiary: DiaryItem = {
      id: `diary-${Date.now()}`,
      babyId: currentBaby.id,
      diaryDate: "2026-11-11",
      title: diaryTitle.trim(),
      content: diaryContent.trim(),
      mood: diaryMood,
      author: currentCaregiver,
      tags: diaryTags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean),
      isMilestone: diaryMilestone,
      photos: ["new-upload"],
      dailySummary: {
        totalFeedingMl: dailySummary.totalMl,
        totalSleepHours: Number((dailySummary.totalSleepMin / 60).toFixed(1)),
        diaperCount: dailySummary.wetCount + dailySummary.poopCount,
      },
    };

    setDiaries((prev) => [newDiary, ...prev]);
    setDiaryTitle("");
    setDiaryContent("");
    setDiaryMilestone(false);
    setShowDiaryModal(false);
    setActiveTab("DIARY");
  };

  // 성장 측정값 추가 저장
  const handleSaveGrowth = (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(newWeight) || currentBaby.weightKg;
    const h = parseFloat(newHeight) || currentBaby.heightCm;
    const hc = parseFloat(newHead) || currentBaby.headCm;

    const newItem: GrowthItem = {
      id: `g-${Date.now()}`,
      date: "2026-11-11",
      ageDays: ageInfo.diffDays,
      weightKg: w,
      heightCm: h,
      headCm: hc,
      note: newGrowthNote.trim() || `${currentCaregiver} 측정 기록`,
    };

    setGrowthRecords((prev) => [...prev, newItem]);
    setNewGrowthNote("");
    setShowGrowthModal(false);
  };

  // Sprout Track 원형 일러스트 타일 목록 정의 (public/*-128.png 정품 에셋 활용)
  const sproutActivityTiles: {
    key: string;
    label: string;
    iconSrc: string;
    category: ActivityCategory;
    bubbleText?: string;
    bubbleStyle?: string;
  }[] = [
    {
      key: "sleep",
      label: "수면",
      iconSrc: "/crib-128.png",
      category: "SLEEP",
      bubbleText: `☀️ ${formatBubbleDuration(dailySummary.lastSleep?.startedAt, nowMs)}`,
      bubbleStyle: "bg-white text-slate-800 border border-amber-300 shadow-sm",
    },
    {
      key: "feed",
      label: "수유",
      iconSrc: "/bottle-128.png",
      category: "FEEDING",
      bubbleText: `🍼 ${formatBubbleDuration(dailySummary.lastFeeding?.startedAt, nowMs)}`,
      bubbleStyle: "bg-[#10b981] text-white shadow-sm",
    },
    {
      key: "diaper",
      label: "기저귀",
      iconSrc: "/diaper-128.png",
      category: "DIAPER",
      bubbleText: `🧷 ${formatBubbleDuration(dailySummary.lastDiaper?.startedAt, nowMs)}`,
      bubbleStyle: "bg-[#10b981] text-white shadow-sm",
    },
    {
      key: "note",
      label: "메모",
      iconSrc: "/note-128.png",
      category: "NOTE",
    },
    {
      key: "bath",
      label: "목욕",
      iconSrc: "/bath-128.png",
      category: "BATH",
    },
    {
      key: "pump",
      label: "유축",
      iconSrc: "/pump-128.png",
      category: "PUMPING",
    },
    {
      key: "med",
      label: "투약",
      iconSrc: "/med-128.png",
      category: "MEDICATION",
    },
    {
      key: "tummy",
      label: "터미타임",
      iconSrc: "/activity-128.png",
      category: "TUMMY_TIME",
    },
  ];

  return (
    <div className="flex flex-col min-h-dvh pb-24 bg-white dark:bg-[#111827] text-slate-900 dark:text-slate-100 transition-colors">
      {/* =====================================================================
          1. Sprout Track 시그니처 에메랄드/틸(Teal) 상단 히어로 헤더
      ===================================================================== */}
      <header className="bg-gradient-to-b from-[#0d8a72] to-[#0a725e] dark:from-[#0b6e5b] dark:to-[#085446] text-white pt-4 pb-3 px-4 shadow-md relative z-30">
        {/* 상단 인사말 + 가족명 + 우측 파란색 알약형(Pill) 아이 선택기 (iPhone 15 Pro 393px 폭 최적화) */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* 새싹(Sprout) 원형 로고 아바타 */}
            <div className="w-11 h-11 rounded-full bg-[#fdf6e9] p-1.5 shadow-md flex items-center justify-center shrink-0 border-2 border-white/40">
              <img
                src="/sprout-128.png"
                alt="Sprout Track 로고"
                className="w-8 h-8 object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-[11px] text-emerald-100 font-medium whitespace-nowrap">
                  안녕하세요, {currentCaregiver}님
                </p>
                <button
                  onClick={() =>
                    setCurrentCaregiver((prev) =>
                      prev === "엄마" ? "아빠" : prev === "아빠" ? "할머니" : "엄마"
                    )
                  }
                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/15 hover:bg-white/25 text-white font-semibold transition whitespace-nowrap shrink-0"
                  title="양육자(PIN) 전환"
                >
                  양육자 전환
                </button>
              </div>
              <h1 className="text-[14px] font-extrabold tracking-tight leading-snug truncate">
                튼튼이네 ·{" "}
                {activeTab === "HOME"
                  ? "일일 기록장"
                  : activeTab === "CALENDAR"
                  ? "월간 캘린더"
                  : activeTab === "REPORTS"
                  ? "성장 리포트"
                  : activeTab === "NURSERY"
                  ? "수유방 모드"
                  : "감성 육아일기"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* 다크 모드 토글 아이콘 */}
            <button
              onClick={() => setDarkMode((d) => !d)}
              aria-label="다크 모드 전환"
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition shrink-0"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Sprout Track 특유의 파란색 알약형(Blue Pill) 아이 프로필 드롭다운 */}
            <div className="relative shrink-0">
              <button
                onClick={() => setShowBabySelector((v) => !v)}
                className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md border border-blue-400/40 transition whitespace-nowrap"
              >
                <div className="text-left leading-tight">
                  <p className="text-xs font-extrabold whitespace-nowrap">{currentBaby.name}</p>
                  <p className="text-[10px] text-blue-100 font-medium whitespace-nowrap">
                    {ageInfo.weeks}주 ({ageInfo.diffDays}일)
                  </p>
                </div>
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </button>

              {showBabySelector && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-700 p-1.5 z-50">
                  <p className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase">
                    아이 전환 (다둥이 지원)
                  </p>
                  {babies.map((b) => {
                    const isSelected = b.id === currentBaby.id;
                    const info = calculateAgeInfo(b.birthDate);
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          setSelectedBabyId(b.id);
                          setShowBabySelector(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-300 font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-700/60"
                        }`}
                      >
                        <div className="text-left">
                          <p>
                            {b.name} ({b.nickname})
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {info.weeks}주 · 생후 {info.diffDays}일 · {b.weightKg}kg
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 실시간 작동 중인 타이머 배너 (ActiveFeedBanner / ActiveActivityBanner 대응) */}
        {runningTimer && (
          <div className="mt-3 p-3 rounded-2xl bg-slate-900/35 backdrop-blur-md border border-white/25 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-400/25 flex items-center justify-center">
                <Timer className="w-5 h-5 text-emerald-200 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold bg-emerald-500 px-2 py-0.5 rounded-full">
                    {runningTimer.startedBy} 진행중
                  </span>
                  <span className="text-xs font-semibold text-emerald-50">
                    {runningTimer.label}
                  </span>
                </div>
                <p className="text-lg font-extrabold font-mono tracking-wider mt-0.5">
                  {formatTimerSec(activeTimerSeconds)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTogglePauseTimer}
                className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition"
                title={runningTimer.isPaused ? "재개" : "일시정지"}
              >
                {runningTimer.isPaused ? (
                  <Play className="w-4 h-4 fill-white" />
                ) : (
                  <Pause className="w-4 h-4 fill-white" />
                )}
              </button>
              <button
                onClick={handleStopAndSaveTimer}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white text-[#0d8a72] font-extrabold text-xs shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-[#0d8a72]" />
                <span>종료·저장</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            2. Sprout Track 시그니처 가로 스크롤 원형 일러스트 타일 + 상단 상태 버블
            (헤더 하단에 걸쳐지도록 배치)
        ===================================================================== */}
        {activeTab === "HOME" && (
          <div className="mt-4 pt-2 overflow-x-auto no-scrollbar">
            <div className="flex items-end gap-3.5 min-w-max pb-1 px-1">
              {sproutActivityTiles.map((tile) => (
                <button
                  key={tile.key}
                  onClick={() => setSheetCategory(tile.category)}
                  className="flex flex-col items-center group relative pt-3 focus:outline-none"
                >
                  {/* 상단 경과 시간 상태 알약 버블 (Status Bubble) */}
                  {tile.bubbleText && (
                    <span
                      className={`absolute top-0 z-10 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-tight whitespace-nowrap ${tile.bubbleStyle}`}
                    >
                      {tile.bubbleText}
                    </span>
                  )}

                  {/* 원형 일러스트 아이콘 컨테이너 */}
                  <div className="w-16 h-16 rounded-full bg-[#f4f1ea] dark:bg-slate-800 border-[3px] border-white/90 dark:border-slate-700 shadow-md flex items-center justify-center overflow-hidden group-active:scale-95 transition">
                    <img
                      src={tile.iconSrc}
                      alt={tile.label}
                      className="w-14 h-14 object-cover"
                    />
                  </div>

                  {/* 하단 한국어 라벨 */}
                  <span className="mt-1.5 text-xs font-bold text-white drop-shadow-xs">
                    {tile.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* =====================================================================
          3. 메인 컨텐츠 영역 (HOME | CALENDAR | REPORTS | NURSERY | DIARY)
      ===================================================================== */}
      <main className="flex-1 px-4 pt-3 space-y-4">
        {/* ===================================================================
            [탭 1] 일일 기록장 & Daily Summary & 타임라인 (SproutTrackLogEntryMobile 스타일)
        =================================================================== */}
        {activeTab === "HOME" && (
          <>
            {/* 날짜 이동 네비게이터 (< 2026년 11월 11일 >) */}
            <div className="flex items-center justify-center gap-6 py-1.5">
              <button
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                aria-label="이전 날짜"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold tracking-tight">
                2026년 11월 11일 (수)
              </span>
              <button
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                aria-label="다음 날짜"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 실시간 타이머 원터치 시작 바 (iPhone 15 Pro 폭에서 글씨 밀림 방지) */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => handleStartTimer("FEEDING_LEFT", "모유 수유 (왼쪽)")}
                className="py-2 px-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 text-[#0d8a72] dark:text-emerald-400 border border-emerald-200/70 dark:border-slate-700 flex items-center justify-center gap-1 whitespace-nowrap transition"
              >
                <Play className="w-2.5 h-2.5 fill-current shrink-0" />
                <span>모유(좌)</span>
              </button>
              <button
                onClick={() => handleStartTimer("FEEDING_RIGHT", "모유 수유 (오른쪽)")}
                className="py-2 px-1.5 rounded-xl text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800 text-[#0d8a72] dark:text-emerald-400 border border-emerald-200/70 dark:border-slate-700 flex items-center justify-center gap-1 whitespace-nowrap transition"
              >
                <Play className="w-2.5 h-2.5 fill-current shrink-0" />
                <span>모유(우)</span>
              </button>
              <button
                onClick={() => handleStartTimer("SLEEP", "낮잠/밤잠 타이머")}
                className="py-2 px-1.5 rounded-xl text-[11px] font-bold bg-blue-50 hover:bg-blue-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-slate-700 flex items-center justify-center gap-1 whitespace-nowrap transition"
              >
                <Play className="w-2.5 h-2.5 fill-current shrink-0" />
                <span>수면측정</span>
              </button>
              <button
                onClick={() => handleStartTimer("PUMPING", "유축 타이머")}
                className="py-2 px-1.5 rounded-xl text-[11px] font-bold bg-purple-50 hover:bg-purple-100 dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-200/70 dark:border-slate-700 flex items-center justify-center gap-1 whitespace-nowrap transition"
              >
                <Play className="w-2.5 h-2.5 fill-current shrink-0" />
                <span>유축측정</span>
              </button>
            </div>

            {/* Sprout Track 스타일 Daily Summary (일일 요약 그리드 + 히트맵 보기) */}
            <section className="rounded-2xl bg-slate-50/80 dark:bg-[#1e293b]/90 border border-slate-200/80 dark:border-slate-800 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setSummaryExpanded((v) => !v)}
                  className="flex items-center gap-1 text-xs font-extrabold text-slate-700 dark:text-slate-200 whitespace-nowrap"
                >
                  <span>일일 요약 (Daily Summary)</span>
                  {summaryExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>

                <button
                  onClick={() => setShowHeatmap((v) => !v)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0d8a72] dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>{showHeatmap ? "히트맵 숨기기" : "히트맵 보기"}</span>
                </button>
              </div>

              {summaryExpanded && (
                <div className="grid grid-cols-2 gap-y-3 gap-x-2.5 pt-1">
                  {/* 깨어 있던 시간 */}
                  <div className="flex items-start gap-2 min-w-0">
                    <Sun className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold leading-tight whitespace-nowrap">
                        {Math.floor(dailySummary.awakeMin / 60)}시간{" "}
                        {dailySummary.awakeMin % 60}분
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        깨어 있던 시간
                      </p>
                    </div>
                  </div>

                  {/* 총 수면 시간 */}
                  <div className="flex items-start gap-2 min-w-0">
                    <Moon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold leading-tight whitespace-nowrap">
                        {Math.floor(dailySummary.totalSleepMin / 60)}시간{" "}
                        {dailySummary.totalSleepMin % 60}분
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        총 수면 시간
                      </p>
                    </div>
                  </div>

                  {/* 수유 횟수 및 상세 */}
                  <div className="flex items-start gap-2 min-w-0">
                    <Droplets className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold leading-tight whitespace-nowrap">
                        {dailySummary.bottleCount + dailySummary.breastCount}회 수유
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        분유 {dailySummary.totalMl}ml · 모유 {dailySummary.breastRightMin}분
                      </p>
                    </div>
                  </div>

                  {/* 소변 기저귀 */}
                  <div className="flex items-start gap-2 min-w-0">
                    <Sparkles className="w-4 h-4 text-[#0d8a72] dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold leading-tight whitespace-nowrap">
                        {dailySummary.wetCount}회
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        소변 기저귀
                      </p>
                    </div>
                  </div>

                  {/* 대변 기저귀 */}
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-4 h-4 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      💩
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold leading-tight whitespace-nowrap">
                        {dailySummary.poopCount}회
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        대변 (황금변)
                      </p>
                    </div>
                  </div>

                  {/* 투약 / 비타민 D */}
                  <div className="flex items-start gap-2 min-w-0">
                    <Pill className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold leading-tight whitespace-nowrap">
                        {Math.max(1, dailySummary.medCount)}회
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        비타민 D (2방울)
                      </p>
                    </div>
                  </div>

                  {/* 모유 냉동/냉장 보관량 (Breast Milk Stored) */}
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="w-4 h-4 rounded-md bg-purple-500/20 text-purple-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                      🍼
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold leading-tight whitespace-nowrap">
                        1,240 ml
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        모유 보관량
                      </p>
                    </div>
                  </div>

                  {/* 터미타임 / 액티비티 */}
                  <div className="flex items-start gap-2 min-w-0">
                    <Award className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[13px] font-extrabold leading-tight whitespace-nowrap">
                        {dailySummary.tummyCount}회 ({dailySummary.tummyMin}분)
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        터미타임 연습
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 24시간 수유·수면 히트맵 바 (Show heatmap 클릭 시 노출) */}
              {showHeatmap && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>00시 (자정)</span>
                    <span>06시</span>
                    <span>12시 (정오)</span>
                    <span>18시</span>
                    <span>24시</span>
                  </div>
                  <div className="h-4 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                    <div style={{ width: "28%" }} className="bg-slate-500 h-full" title="밤잠" />
                    <div style={{ width: "6%" }} className="bg-sky-400 h-full" title="새벽 수유" />
                    <div style={{ width: "16%" }} className="h-full" />
                    <div style={{ width: "10%" }} className="bg-amber-400 h-full" title="터미타임" />
                    <div style={{ width: "8%" }} className="bg-emerald-500 h-full" title="기저귀/수유" />
                    <div style={{ width: "14%" }} className="bg-slate-500 h-full" title="낮잠" />
                    <div style={{ width: "18%" }} className="bg-sky-400 h-full" title="오후 수유" />
                  </div>
                </div>
              )}
            </section>

            {/* Sprout Track 스타일 좌측 세로 타임라인 + 컬러 도트 + 둥근 정사각형 배지 리스트 */}
            <section className="space-y-4 pb-4">
              {groupedActivities.length === 0 ? (
                <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/70 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-3">
                  <p className="text-sm font-bold">
                    아직 오늘 등록된 {currentBaby.name}의 활동 기록이 없습니다
                  </p>
                  <button
                    onClick={() => setSheetCategory("FEEDING")}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0d8a72] text-white text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>첫 수유 기록 추가하기</span>
                  </button>
                </div>
              ) : (
                groupedActivities.map(([periodTitle, items]) => (
                  <div key={periodTitle} className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-400 pl-6">
                      {periodTitle}
                    </h3>

                    <div className="relative pl-5 space-y-4 before:content-[''] before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-slate-700">
                      {items.map((item) => {
                        const startStr = formatKoreanTime(item.startedAt);
                        const endStr = item.endedAt
                          ? formatKoreanTime(item.endedAt)
                          : null;

                        // Sprout Track 카테고리별 도트 & 스퀘어 아이콘 컬러 매핑
                        const styleMap =
                          item.category === "FEEDING"
                            ? {
                                dot: "bg-sky-400",
                                box: "bg-sky-100 text-sky-600 dark:bg-sky-900/70 dark:text-sky-300",
                              }
                            : item.category === "DIAPER"
                            ? {
                                dot: "bg-[#0d8a72]",
                                box: "bg-[#0d8a72] text-white",
                              }
                            : item.category === "SLEEP"
                            ? {
                                dot: "bg-slate-400",
                                box: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
                              }
                            : item.category === "TUMMY_TIME"
                            ? {
                                dot: "bg-amber-300",
                                box: "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-200",
                              }
                            : {
                                dot: "bg-rose-400",
                                box: "bg-rose-100 text-rose-600 dark:bg-rose-900/60 dark:text-rose-200",
                              };

                        return (
                          <div
                            key={item.id}
                            className="relative flex items-center justify-between gap-3 group"
                          >
                            {/* 좌측 타임라인 수직선 위의 컬러 도트 */}
                            <span
                              className={`absolute -left-[17px] w-3 h-3 rounded-full ring-4 ring-white dark:ring-[#111827] ${styleMap.dot}`}
                            />

                            <div className="flex items-center gap-3 min-w-0">
                              {/* 둥근 정사각형 아이콘 박스 */}
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${styleMap.box}`}
                              >
                                {item.category === "FEEDING" && (
                                  <Droplets className="w-5 h-5" />
                                )}
                                {item.category === "DIAPER" && (
                                  <Sparkles className="w-5 h-5" />
                                )}
                                {item.category === "SLEEP" && (
                                  <Moon className="w-5 h-5" />
                                )}
                                {item.category === "TEMPERATURE" && (
                                  <Thermometer className="w-5 h-5" />
                                )}
                                {item.category !== "FEEDING" &&
                                  item.category !== "DIAPER" &&
                                  item.category !== "SLEEP" &&
                                  item.category !== "TEMPERATURE" && (
                                    <Award className="w-5 h-5" />
                                  )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p className="text-[13px] font-bold truncate">
                                    {item.summaryTitle}
                                  </p>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 whitespace-nowrap">
                                    {item.recordedBy}
                                  </span>
                                </div>
                                {item.subDetail && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {item.subDetail}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* 우측 시각 표시 및 삭제 버튼 */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap tabular-nums">
                                {endStr ? `${startStr}~${endStr}` : startStr}
                              </span>
                              <button
                                onClick={() => handleDeleteActivity(item.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 transition shrink-0"
                                title="기록 삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* ===================================================================
            [탭 2] Sprout Track 스타일 월간 캘린더 (CalandarMobile.png 스타일)
        =================================================================== */}
        {activeTab === "CALENDAR" && (
          <div className="space-y-3 pb-4">
            {/* 월간 이동 헤더 */}
            <div className="p-3 rounded-2xl bg-[#0d8a72] text-white flex items-center justify-between shadow-sm">
              <button className="p-1.5 rounded-lg hover:bg-white/10">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5 font-extrabold text-base">
                  <CalendarIcon className="w-4 h-4" />
                  <span>2026년 11월</span>
                </div>
                <span className="text-[11px] text-emerald-100">오늘 (11월 11일)</span>
              </div>
              <button className="p-1.5 rounded-lg hover:bg-white/10">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 요일 헤더 + 7열 월간 그리드 */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
              <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-800 text-center py-2 text-[11px] font-bold text-slate-500">
                <span className="text-rose-500">일</span>
                <span>월</span>
                <span>화</span>
                <span>수</span>
                <span>목</span>
                <span>금</span>
                <span className="text-blue-500">토</span>
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 dark:divide-slate-800">
                {Array.from({ length: 30 }, (_, i) => i + 1).map((day) => {
                  const isToday = day === 11;
                  const eventBadge =
                    day === 5
                      ? { label: "영유아검진", color: "bg-emerald-500 text-white" }
                      : day === 10
                      ? { label: "첫뒤집기🎉", color: "bg-amber-500 text-white" }
                      : day === 11
                      ? { label: `${currentBaby.name} 기록`, color: "bg-[#0d8a72] text-white" }
                      : day === 18
                      ? { label: "폐렴구균접종", color: "bg-blue-500 text-white" }
                      : day === 25
                      ? { label: "이유식시작", color: "bg-purple-500 text-white" }
                      : null;

                  return (
                    <div
                      key={day}
                      className={`min-h-[76px] p-1.5 flex flex-col justify-between ${
                        isToday
                          ? "bg-emerald-50/70 dark:bg-emerald-950/30 ring-2 ring-inset ring-[#0d8a72]"
                          : ""
                      }`}
                    >
                      <span
                        className={`text-xs font-bold ${
                          isToday
                            ? "text-[#0d8a72] dark:text-emerald-400"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {day}
                      </span>

                      {eventBadge && (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate ${eventBadge.color}`}
                        >
                          {eventBadge.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            [탭 3] Sprout Track 스타일 월간 리포트 & 성장 백분위 (ReportingMobile1/2 스타일)
        =================================================================== */}
        {activeTab === "REPORTS" && (
          <div className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold">
                  {currentBaby.name}의 월간 리포트
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  출생일: {currentBaby.birthDate} · 생후 {ageInfo.months}개월 ({ageInfo.diffDays}일)
                </p>
              </div>
              <button
                onClick={() => setShowGrowthModal(true)}
                className="px-3 py-2 rounded-xl bg-[#0d8a72] text-white text-xs font-bold shadow-xs"
              >
                + 신체 측정 입력
              </button>
            </div>

            {/* 2x2 신체 발달 & 성장 속도 카드 그리드 */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-[#1e293b] border border-slate-200/70 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">몸무게 (Weight)</p>
                <p className="text-xl font-extrabold mt-1">
                  {growthRecords[growthRecords.length - 1]?.weightKg} kg
                </p>
                <p className="text-xs font-bold text-[#10b981] mt-1">
                  상위 68% 백분위 →
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-[#1e293b] border border-slate-200/70 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">키 / 신장 (Length)</p>
                <p className="text-xl font-extrabold mt-1">
                  {growthRecords[growthRecords.length - 1]?.heightCm} cm
                </p>
                <p className="text-xs font-bold text-[#10b981] mt-1">
                  상위 72% 백분위 →
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-[#1e293b] border border-slate-200/70 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">머리둘레 (Head circ.)</p>
                <p className="text-xl font-extrabold mt-1">
                  {growthRecords[growthRecords.length - 1]?.headCm} cm
                </p>
                <p className="text-xs font-bold text-[#10b981] mt-1">
                  상위 55% 백분위 →
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-100/90 dark:bg-[#1e293b] border border-slate-200/70 dark:border-slate-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">월간 성장 속도</p>
                <p className="text-xl font-extrabold mt-1">+0.9 kg</p>
                <p className="text-xs text-slate-400 mt-1">지난달 대비 증가량</p>
              </div>
            </div>

            {/* 몸무게 / 키 / 머리둘레 탭 스위치 */}
            <div className="flex gap-2">
              {(
                [
                  ["WEIGHT", "⚖️ 몸무게"],
                  ["HEIGHT", "📏 키 (신장)"],
                  ["HEAD", "👶 머리둘레"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setGrowthChartMetric(key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                    growthChartMetric === key
                      ? "border-[#10b981] bg-[#10b981]/10 text-[#0d8a72] dark:text-[#10b981]"
                      : "border-slate-200 dark:border-slate-700 text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* WHO / 질병관리청 표준 성장 백분위 곡선 SVG 차트 */}
            <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-[#1e293b] border border-slate-200/70 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  연령별 표준 성장 곡선 (WHO / 질병관리청)
                </span>
                <span className="text-[11px] font-bold text-orange-500">
                  ● 우리 아이 측정치
                </span>
              </div>

              <svg viewBox="0 0 320 150" className="w-full h-36 overflow-visible">
                {/* 그리드 점선 */}
                <line x1="30" y1="25" x2="300" y2="25" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeDasharray="3 3" />
                <line x1="30" y1="75" x2="300" y2="75" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeDasharray="3 3" />
                <line x1="30" y1="125" x2="300" y2="125" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeDasharray="3 3" />

                {/* 90th 백분위 점선 */}
                <path
                  d="M 30 115 Q 140 65, 300 20"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* 50th 표준 중앙선 (에메랄드) */}
                <path
                  d="M 30 122 Q 140 80, 300 42"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                />
                {/* 10th 백분위 점선 */}
                <path
                  d="M 30 130 Q 140 96, 300 65"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* 우리 아이 성장 곡선 (오렌지 포인트) */}
                <path
                  d="M 30 121 L 115 95 L 205 66 L 285 36"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2.5"
                />
                {[
                  { cx: 30, cy: 121, label: "출생" },
                  { cx: 115, cy: 95, label: "1개월" },
                  { cx: 205, cy: 66, label: "2개월" },
                  { cx: 285, cy: 36, label: "3개월" },
                ].map((pt, i) => (
                  <g key={i}>
                    <circle cx={pt.cx} cy={pt.cy} r="4.5" fill="#f97316" stroke="#fff" strokeWidth="1.5" />
                    <text
                      x={pt.cx}
                      y="144"
                      textAnchor="middle"
                      className="fill-slate-400 text-[9px]"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>

            {/* 수유 비율 분석 바 (Feeding breakdown - ReportingMobile2 스타일) */}
            <div className="p-4 rounded-2xl bg-slate-100/90 dark:bg-[#1e293b] border border-slate-200/70 dark:border-slate-800 space-y-2.5">
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                수유 유형별 비율 (Feeding Breakdown)
              </p>
              <div className="h-3.5 w-full rounded-full overflow-hidden flex">
                <div style={{ width: "45%" }} className="bg-sky-400 h-full" />
                <div style={{ width: "40%" }} className="bg-[#10b981] h-full" />
                <div style={{ width: "15%" }} className="bg-amber-400 h-full" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <i className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                  분유 45%
                </span>
                <span className="flex items-center gap-1">
                  <i className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block" />
                  모유 40%
                </span>
                <span className="flex items-center gap-1">
                  <i className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                  이유식 15%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            [탭 4] Sprout Track 시그니처 수유방 모드 (NurseryMode.png 풀스크린 대형 타일)
        =================================================================== */}
        {activeTab === "NURSERY" && (
          <div
            style={{
              backgroundColor: `hsl(${nurseryHue}, 58%, ${Math.max(12, 34 - Math.round(nurseryDim / 3))}%)`,
            }}
            className="rounded-3xl p-5 text-white shadow-xl space-y-5 transition-colors relative overflow-hidden"
          >
            {/* 대형 디지털 시계 & 날짜 */}
            <div className="text-center space-y-1 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-black/25 text-[10px] font-bold tracking-wider uppercase">
                <Lock className="w-3 h-3 text-emerald-300" />
                <span>수유방 모드 (Nursery Mode) · 화면 꺼짐 방지 {wakeLockActive ? "켜짐" : "꺼짐"}</span>
              </div>
              <p className="text-5xl font-serif font-light tracking-tight pt-1">
                {String(new Date(nowMs).getHours()).padStart(2, "0")}:
                {String(new Date(nowMs).getMinutes()).padStart(2, "0")}
              </p>
              <p className="text-xs tracking-widest uppercase text-white/75">
                2026년 11월 11일 수요일 · {currentBaby.name}
              </p>
            </div>

            {/* 대형 원탭 타일 그리드 (새벽 3시에 눈부심 없이 한 손으로 누르는 버튼) */}
            <div className="grid grid-cols-1 gap-3.5">
              {/* 수유 타일 */}
              <div className="p-4 rounded-2xl bg-black/20 border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">🍼 수유 (Feed)</span>
                  <span className="text-xs text-white/75">
                    마지막:{" "}
                    {dailySummary.lastFeeding
                      ? formatElapsedKo(dailySummary.lastFeeding.startedAt, nowMs)
                      : "기록 없음"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() =>
                      handleNurseryQuickTap(
                        "FEEDING",
                        "분유 수유 160ml",
                        "수유방 모드 원탭 기록",
                        160
                      )
                    }
                    className="py-3.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-extrabold border border-white/20 transition"
                  >
                    분유 (160ml)
                  </button>
                  <button
                    onClick={() =>
                      handleStartTimer("FEEDING_LEFT", "모유 수유 (왼쪽)")
                    }
                    className="py-3.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-extrabold border border-white/20 transition"
                  >
                    모유 (왼쪽)
                  </button>
                  <button
                    onClick={() =>
                      handleStartTimer("FEEDING_RIGHT", "모유 수유 (오른쪽)")
                    }
                    className="py-3.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-extrabold border border-white/20 transition"
                  >
                    모유 (오른쪽)
                  </button>
                </div>
              </div>

              {/* 기저귀 타일 */}
              <div className="p-4 rounded-2xl bg-black/20 border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold">🧷 기저귀 (Diaper)</span>
                  <span className="text-xs text-white/75">
                    마지막:{" "}
                    {dailySummary.lastDiaper
                      ? formatElapsedKo(dailySummary.lastDiaper.startedAt, nowMs)
                      : "기록 없음"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() =>
                      handleNurseryQuickTap(
                        "DIAPER",
                        "소변 (Wet)",
                        "수유방 모드 원탭 기록",
                        undefined,
                        "WET"
                      )
                    }
                    className="py-3.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-extrabold border border-white/20 transition"
                  >
                    💧 소변 (Wet)
                  </button>
                  <button
                    onClick={() =>
                      handleNurseryQuickTap(
                        "DIAPER",
                        "대변 (Dirty)",
                        "황금변 · 수유방 모드 기록",
                        undefined,
                        "SOLID"
                      )
                    }
                    className="py-3.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-extrabold border border-white/20 transition"
                  >
                    💩 대변 (Dirty)
                  </button>
                  <button
                    onClick={() =>
                      handleNurseryQuickTap(
                        "DIAPER",
                        "대소변 혼합 (Both)",
                        "수유방 모드 원탭 기록",
                        undefined,
                        "BOTH"
                      )
                    }
                    className="py-3.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-xs font-extrabold border border-white/20 transition"
                  >
                    ✨ 혼합 (Both)
                  </button>
                </div>
              </div>

              {/* 수면 & 유축 타일 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-black/20 border border-white/15 space-y-2.5">
                  <span className="text-sm font-bold block">🌙 수면 (Sleep)</span>
                  <button
                    onClick={() => handleStartTimer("SLEEP", "수면 타이머")}
                    className="w-full py-3 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold border border-white/20"
                  >
                    수면 타이머 시작
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-black/20 border border-white/15 space-y-2.5">
                  <span className="text-sm font-bold block">🍶 유축 (Pump)</span>
                  <button
                    onClick={() => handleStartTimer("PUMPING", "양쪽 유축 타이머")}
                    className="w-full py-3 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-extrabold border border-white/20"
                  >
                    유축 타이머 시작
                  </button>
                </div>
              </div>
            </div>

            {/* Nursery Mode 배경 색상(Hue) 및 눈부심 방지 밝기(Dim) 슬라이더 */}
            <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">🎨 수유방 배경 색상 (Hue: {nurseryHue}°)</span>
                <button
                  onClick={() => setWakeLockActive((v) => !v)}
                  className="px-2.5 py-1 rounded-lg bg-white/15 text-[11px] font-semibold"
                >
                  화면 켜짐 유지: {wakeLockActive ? "ON" : "OFF"}
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={nurseryHue}
                onChange={(e) => setNurseryHue(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-bold">🌙 새벽 눈부심 방지 어둡기 (Dim: {nurseryDim}%)</span>
              </div>
              <input
                type="range"
                min={0}
                max={65}
                value={nurseryDim}
                onChange={(e) => setNurseryDim(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ===================================================================
            [탭 5] 감성 육아일기 & 가족/OCI 인프라 상태 (DIARY & SETTINGS)
        =================================================================== */}
        {activeTab === "DIARY" && (
          <div className="space-y-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold">
                  📖 {currentBaby.name} 성장 스토리 & 일기
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  사진과 함께 그날의 수유·수면 요약이 자동으로 남습니다.
                </p>
              </div>
              <button
                onClick={() => setShowDiaryModal(true)}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-[#0d8a72] text-white text-xs font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>일기 작성</span>
              </button>
            </div>

            {diaries.map((entry) => (
              <article
                key={entry.id}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200/80 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{entry.mood}</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-400">
                          {entry.diaryDate}
                        </span>
                        {entry.isMilestone && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300">
                            🏆 발달 이정표
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold">{entry.title}</h3>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg bg-white dark:bg-slate-800 font-semibold">
                    {entry.author}
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-line">
                  {entry.content}
                </p>

                <div className="flex flex-wrap gap-1.5">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-lg bg-emerald-500/10 text-[#0d8a72] dark:text-emerald-300 font-semibold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}

            {/* OCI + Coolify 인프라 요약 카드 */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#1e293b] border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-[#0d8a72]" />
                  <span>OCI + Coolify 셀프 호스팅 상태</span>
                </span>
                <span className="text-[11px] font-bold text-[#10b981] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> 정상 가동중
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                가족 초대코드 <strong className="font-mono">BEBE-2026</strong> · PostgreSQL 16 + OCI Object Storage 연동
              </p>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          4. 원형 타일 클릭 시 열리는 한국어 상세 기록 바텀 시트
      ===================================================================== */}
      {sheetCategory && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end justify-center">
          <div className="w-full max-w-[480px] bg-white dark:bg-[#1e293b] rounded-t-3xl p-5 space-y-4 shadow-2xl border-t border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">
                {sheetCategory === "FEEDING" && "🍼 수유 기록하기"}
                {sheetCategory === "DIAPER" && "🧷 기저귀 교체 기록하기"}
                {sheetCategory === "SLEEP" && "🌙 수면 시간 기록하기"}
                {sheetCategory === "NOTE" && "📝 육아 메모 남기기"}
                {sheetCategory === "BATH" && "🛁 목욕 기록하기"}
                {sheetCategory === "PUMPING" && "🍶 모유 유축 기록하기"}
                {sheetCategory === "MEDICATION" && "💊 비타민 / 투약 기록하기"}
                {sheetCategory === "TUMMY_TIME" && "👶 터미타임(배밀이) 기록하기"}
              </h3>
              <button
                onClick={() => setSheetCategory(null)}
                className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
              >
                닫기
              </button>
            </div>

            {sheetCategory === "FEEDING" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["FORMULA", "분유 (ml)"],
                      ["BREAST", "모유 수유"],
                      ["SOLID_FOOD", "이유식 (g)"],
                    ] as const
                  ).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => setFeedingType(type)}
                      className={`py-2.5 rounded-xl text-xs font-bold border ${
                        feedingType === type
                          ? "bg-[#0d8a72] text-white border-[#0d8a72]"
                          : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {feedingType !== "BREAST" ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">수유량 선택</span>
                      <span className="text-lg font-extrabold text-[#0d8a72] dark:text-emerald-400">
                        {formulaMl} ml
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[80, 120, 160, 180, 200].map((ml) => (
                        <button
                          key={ml}
                          onClick={() => setFormulaMl(ml)}
                          className={`py-2 rounded-xl text-xs font-bold ${
                            formulaMl === ml
                              ? "bg-emerald-100 text-[#0d8a72] border border-[#0d8a72]"
                              : "bg-slate-100 dark:bg-slate-800"
                          }`}
                        >
                          {ml}ml
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ["LEFT", "왼쪽 (Left)"],
                          ["RIGHT", "오른쪽 (Right)"],
                          ["BOTH", "양쪽 모두"],
                        ] as const
                      ).map(([side, label]) => (
                        <button
                          key={side}
                          onClick={() => setBreastSide(side)}
                          className={`py-2 rounded-xl text-xs font-bold ${
                            breastSide === side
                              ? "bg-emerald-100 text-[#0d8a72] border border-[#0d8a72]"
                              : "bg-slate-100 dark:bg-slate-800"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">수유 시간(분)</span>
                      <div className="flex gap-1.5">
                        {[10, 13, 15, 20].map((m) => (
                          <button
                            key={m}
                            onClick={() => setBreastMinutes(m)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                              breastMinutes === m
                                ? "bg-[#0d8a72] text-white"
                                : "bg-slate-100 dark:bg-slate-800"
                            }`}
                          >
                            {m}분
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {sheetCategory === "DIAPER" && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["WET", "💧 소변 (Wet)"],
                      ["SOLID", "💩 대변 (Dirty)"],
                      ["BOTH", "✨ 혼합 (Both)"],
                    ] as const
                  ).map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => setDiaperType(t)}
                      className={`py-2.5 rounded-xl text-xs font-bold border ${
                        diaperType === t
                          ? "bg-[#0d8a72] text-white border-[#0d8a72]"
                          : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sheetCategory === "SLEEP" && (
              <div className="grid grid-cols-4 gap-2">
                {[45, 80, 120, 180].map((m) => (
                  <button
                    key={m}
                    onClick={() => setSleepMinutes(m)}
                    className={`py-2.5 rounded-xl text-xs font-bold ${
                      sleepMinutes === m
                        ? "bg-[#0d8a72] text-white"
                        : "bg-slate-100 dark:bg-slate-800"
                    }`}
                  >
                    {m}분
                  </button>
                ))}
              </div>
            )}

            <input
              type="text"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="메모 입력 (선택사항)"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />

            <button
              onClick={handleSaveQuickActivity}
              className="w-full py-3.5 rounded-2xl bg-[#0d8a72] hover:bg-[#0a725e] text-white font-extrabold text-sm shadow-md transition"
            >
              {currentCaregiver} 이름으로 기록 저장
            </button>
          </div>
        </div>
      )}

      {/* 감성 육아일기 작성 모달 */}
      {showDiaryModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end justify-center">
          <form
            onSubmit={handleSaveDiary}
            className="w-full max-w-[480px] bg-white dark:bg-[#1e293b] rounded-t-3xl p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">📖 성장 육아일기 작성</h3>
              <button
                type="button"
                onClick={() => setShowDiaryModal(false)}
                className="text-xs text-slate-400"
              >
                닫기
              </button>
            </div>
            <input
              type="text"
              required
              value={diaryTitle}
              onChange={(e) => setDiaryTitle(e.target.value)}
              placeholder="일기 제목을 입력하세요"
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800"
            />
            <textarea
              rows={4}
              required
              value={diaryContent}
              onChange={(e) => setDiaryContent(e.target.value)}
              placeholder="오늘 아이의 특별한 순간을 기록해 보세요."
              className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800"
            />
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#0d8a72] text-white font-extrabold text-sm"
            >
              일기 저장하기
            </button>
          </form>
        </div>
      )}

      {/* 성장 측정 입력 모달 */}
      {showGrowthModal && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-end justify-center">
          <form
            onSubmit={handleSaveGrowth}
            className="w-full max-w-[480px] bg-white dark:bg-[#1e293b] rounded-t-3xl p-5 space-y-3.5 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold">📏 신체 발달 측정값 기록</h3>
              <button
                type="button"
                onClick={() => setShowGrowthModal(false)}
                className="text-xs text-slate-400"
              >
                닫기
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] text-slate-400">몸무게(kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">키(cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newHeight}
                  onChange={(e) => setNewHeight(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">머리둘레(cm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newHead}
                  onChange={(e) => setNewHead(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-[#0d8a72] text-white font-extrabold text-sm"
            >
              측정 기록 저장
            </button>
          </form>
        </div>
      )}

      {/* 오프라인 및 삭제 실행 취소(Undo) 토스트 */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-16 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-40 px-4 py-2.5 rounded-2xl bg-amber-500 text-white text-xs font-bold shadow-lg"
        >
          ⚡ 오프라인 상태입니다. 작성한 기록은 연결 복구 시 동기화됩니다.
        </div>
      )}

      {deletedActivityBackup && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[92%] max-w-[440px] z-40 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs shadow-xl flex items-center justify-between gap-3"
        >
          <span className="truncate">
            🗑️ <strong>{deletedActivityBackup.summaryTitle}</strong> 삭제됨
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndoDelete}
              className="px-3 py-1.5 rounded-xl bg-[#10b981] text-white font-bold"
            >
              실행 취소
            </button>
            <button
              onClick={() => setDeletedActivityBackup(null)}
              className="px-2 py-1 text-slate-400"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. 하단 모바일 네비게이션 바 (Sprout Track 5대 핵심 뷰)
      ===================================================================== */}
      <nav
        aria-label="하단 메인 네비게이션"
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40 bg-white/95 dark:bg-[#111827]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-1.5"
      >
        <div className="grid grid-cols-5 items-center">
          <button
            onClick={() => setActiveTab("HOME")}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] ${
              activeTab === "HOME"
                ? "text-[#0d8a72] dark:text-[#10b981] font-extrabold"
                : "text-slate-400 font-medium"
            }`}
          >
            <StickyNote className="w-5 h-5" />
            <span>기록장</span>
          </button>

          <button
            onClick={() => setActiveTab("CALENDAR")}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] ${
              activeTab === "CALENDAR"
                ? "text-[#0d8a72] dark:text-[#10b981] font-extrabold"
                : "text-slate-400 font-medium"
            }`}
          >
            <CalendarIcon className="w-5 h-5" />
            <span>캘린더</span>
          </button>

          <button
            onClick={() => setActiveTab("NURSERY")}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] ${
              activeTab === "NURSERY"
                ? "text-[#0d8a72] dark:text-[#10b981] font-extrabold"
                : "text-slate-400 font-medium"
            }`}
          >
            <div className="-mt-4 w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#0d8a72] to-[#10b981] text-white shadow-md flex items-center justify-center">
              <MonitorSmartphone className="w-5 h-5" />
            </div>
            <span className="mt-0.5">수유방모드</span>
          </button>

          <button
            onClick={() => setActiveTab("REPORTS")}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] ${
              activeTab === "REPORTS"
                ? "text-[#0d8a72] dark:text-[#10b981] font-extrabold"
                : "text-slate-400 font-medium"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>리포트</span>
          </button>

          <button
            onClick={() => setActiveTab("DIARY")}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[48px] text-[11px] ${
              activeTab === "DIARY"
                ? "text-[#0d8a72] dark:text-[#10b981] font-extrabold"
                : "text-slate-400 font-medium"
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>육아일기</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
