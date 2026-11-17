"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { CircleAlert, CircleCheck, CloudOff, Plus, RefreshCw, X } from "lucide-react";
import {
  ActivityCategory,
  ActivityRecord,
  BabyProfile,
  BASE_NOW_MS,
  DiaryItem,
  DiaryPhoto,
  GrowthItem,
  INITIAL_ACTIVITIES,
  INITIAL_BABIES,
  INITIAL_DIARIES,
  INITIAL_GROWTH_RECORDS,
  RunningTimer,
} from "@/lib/mock-data";
import { addDaysToKey, calculateAgeInfo, toDateKey } from "@/lib/format";
import {
  buildDaySlots,
  computeDailySummary,
  computeTimerSeconds,
  findLatestByCategory,
  getFeedingKind,
  groupActivitiesByPeriod,
} from "@/lib/summary";
import {
  DEFAULT_QUICK_FORM,
  buildQuickActivity,
  buildTimerActivity,
  isLocalId,
  newLocalId,
  type QuickActivityForm,
} from "@/lib/activity-builders";
import { useWakeLock } from "@/hooks/useWakeLock";
import { AuthGate } from "@/components/AuthGate";
import { OnboardingSetup } from "@/components/OnboardingSetup";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav, TAB_TITLES, type ActiveTab } from "@/components/BottomNav";
import { HomeTab } from "@/components/tabs/HomeTab";
import { CalendarTab } from "@/components/tabs/CalendarTab";
import { ReportsTab } from "@/components/tabs/ReportsTab";
import { NurseryTab } from "@/components/tabs/NurseryTab";
import { DiaryTab } from "@/components/tabs/DiaryTab";
import { ActivitySheet } from "@/components/sheets/ActivitySheet";
import { DiarySheet, type DiaryFormValues } from "@/components/sheets/DiarySheet";
import { GrowthSheet, type GrowthFormValues } from "@/components/sheets/GrowthSheet";
import { AddBabySheet, type NewBabyValues } from "@/components/sheets/AddBabySheet";
import { AccountSheet, type AuthUserInfo, type HouseholdInfo } from "@/components/sheets/AccountSheet";

type AuthPhase = "LOADING" | "UNAUTHENTICATED" | "ONBOARDING" | "READY" | "DEMO";

type Sheet =
  | { type: "activity"; category: ActivityCategory | null }
  | { type: "diary" }
  | { type: "growth" }
  | { type: "addBaby" }
  | { type: "account" }
  | null;

interface Toast {
  id: number;
  tone: "success" | "error";
  message: string;
  action?: { label: string; run: () => void };
}

// 가족 기기 간 동기화 주기
const TIMER_POLL_MS = 10_000;
const DATA_REFRESH_MS = 60_000;
const TOAST_MS = 6_000;

const readPref = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writePref = (key: string, value: string) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 사생활 보호 모드 등에서는 저장하지 않는다
  }
};

export default function BebeLogApp() {
  // 인증 및 초기 데이터 상태
  const [authPhase, setAuthPhase] = useState<AuthPhase>("LOADING");
  const [googleConfigured, setGoogleConfigured] = useState(false);
  const [mediaConfigured, setMediaConfigured] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUserInfo | null>(null);
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);

  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("HOME");
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const [babies, setBabies] = useState<BabyProfile[]>(INITIAL_BABIES);
  const [selectedBabyId, setSelectedBabyId] = useState<string>(INITIAL_BABIES[0].id);
  const [currentCaregiver, setCurrentCaregiver] = useState("엄마");

  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [diaries, setDiaries] = useState<DiaryItem[]>([]);
  const [growthRecords, setGrowthRecords] = useState<GrowthItem[]>([]);
  const [uploadingDiaryIds, setUploadingDiaryIds] = useState<ReadonlySet<string>>(new Set());

  // SSR/CSR 초기 Hydration 일치를 위해 고정 시각으로 시작한 뒤 마운트 시 동기화
  const [nowMs, setNowMs] = useState<number>(BASE_NOW_MS);
  const [runningTimer, setRunningTimer] = useState<RunningTimer | null>(null);
  // null이면 항상 "오늘"을 따라간다
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // 수유방 모드 화면 설정
  const [nurseryHue, setNurseryHue] = useState(178);
  const [nurseryDim, setNurseryDim] = useState(15);
  const [keepAwake, setKeepAwake] = useState(true);

  // 비동기 콜백에서 최신 값을 읽기 위한 ref
  const authPhaseRef = useRef(authPhase);
  authPhaseRef.current = authPhase;
  const selectedBabyIdRef = useRef(selectedBabyId);
  selectedBabyIdRef.current = selectedBabyId;
  const activitiesRef = useRef(activities);
  activitiesRef.current = activities;
  const runningTimerRef = useRef(runningTimer);
  runningTimerRef.current = runningTimer;
  const syncingIdsRef = useRef(new Set<string>());
  const discardedLocalIdsRef = useRef(new Set<string>());
  const lastTimerMutationRef = useRef(0);
  const lastRefreshRef = useRef(0);
  const toastSeqRef = useRef(0);

  const showToast = useCallback((next: Omit<Toast, "id">) => {
    toastSeqRef.current += 1;
    setToast({ ...next, id: toastSeqRef.current });
  }, []);

  // 토스트 자동 닫힘
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast((t) => (t?.id === toast.id ? null : t)), TOAST_MS);
    return () => clearTimeout(timeout);
  }, [toast]);

  // 화면 설정 복원 (다크 모드는 시스템 설정을 기본값으로)
  useEffect(() => {
    const savedTheme = readPref("bebelog-theme");
    setDarkMode(
      savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    const hue = Number(readPref("bebelog-nursery-hue"));
    const dim = Number(readPref("bebelog-nursery-dim"));
    if (readPref("bebelog-nursery-hue") !== null && Number.isFinite(hue)) setNurseryHue(hue);
    if (readPref("bebelog-nursery-dim") !== null && Number.isFinite(dim)) setNurseryDim(dim);
    if (readPref("bebelog-keep-awake") === "off") setKeepAwake(false);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // 시계 갱신: 타이머가 돌 때만 1초 주기, 그 외에는 15초 주기로 리렌더를 줄인다
  const timerTicking = runningTimer !== null && !runningTimer.isPaused;
  useEffect(() => {
    setNowMs(Date.now());
    const interval = setInterval(() => setNowMs(Date.now()), timerTicking ? 1000 : 15_000);
    return () => clearInterval(interval);
  }, [timerTicking]);

  // ---------------------------------------------------------------------
  // 서버 데이터 로드
  // ---------------------------------------------------------------------
  const loadBootstrap = useCallback(
    async (babyIdParam?: string, options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      try {
        const url = babyIdParam
          ? `/api/bootstrap?babyId=${encodeURIComponent(babyIdParam)}`
          : "/api/bootstrap";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          // 백그라운드 새로고침 실패(오프라인 등)로 로그인 화면으로 튕기지 않게 한다
          if (!silent) setAuthPhase("UNAUTHENTICATED");
          return;
        }
        const data = await res.json();
        setGoogleConfigured(Boolean(data.googleConfigured));

        if (!data.authenticated) {
          setAuthPhase("UNAUTHENTICATED");
          return;
        }

        setAuthUser(data.user);
        if (data.needsOnboarding) {
          setAuthPhase("ONBOARDING");
          return;
        }

        // 백그라운드 새로고침 도중 사용자가 다른 아이로 전환했다면 결과를 버린다
        if (silent && babyIdParam && selectedBabyIdRef.current !== babyIdParam) return;

        const activeBabyId: string = data.activeBabyId || data.babies?.[0]?.id;
        setHousehold(data.household);
        setMediaConfigured(Boolean(data.mediaConfigured));
        if (data.household?.myRelationLabel) {
          setCurrentCaregiver(data.household.myRelationLabel);
        }
        if (Array.isArray(data.babies) && data.babies.length > 0) {
          setBabies(data.babies);
          setSelectedBabyId(activeBabyId);
        }
        // 아직 서버에 올라가지 않은 로컬 기록은 유지한다
        const serverActivities: ActivityRecord[] = data.activities || [];
        setActivities((prev) => [
          ...prev.filter((a) => isLocalId(a.id) && a.babyId === activeBabyId),
          ...serverActivities,
        ]);
        setGrowthRecords(data.growthRecords || []);
        setDiaries(data.diaryEntries || []);
        if (Date.now() - lastTimerMutationRef.current > 4000) {
          setRunningTimer(data.activeTimer || null);
        }
        lastRefreshRef.current = Date.now();
        setAuthPhase("READY");
      } catch {
        if (!silent) setAuthPhase("UNAUTHENTICATED");
      }
    },
    []
  );

  useEffect(() => {
    void loadBootstrap();
  }, [loadBootstrap]);

  // ---------------------------------------------------------------------
  // 활동 기록 저장 / 오프라인 재전송
  // ---------------------------------------------------------------------
  const sendActivity = useCallback(
    async (record: ActivityRecord) => {
      if (syncingIdsRef.current.has(record.id)) return;
      syncingIdsRef.current.add(record.id);
      try {
        const res = await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            babyId: record.babyId,
            category: record.category,
            startedAt: record.startedAt,
            endedAt: record.endedAt,
            durationSec: record.durationSec,
            amountMl: record.amountMl,
            valueNum: record.valueNum,
            details: record.details,
            note: record.note,
            summaryTitle: record.summaryTitle,
            subDetail: record.subDetail,
            recordedByLabel: record.recordedBy,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const saved: ActivityRecord | undefined = json.data;
          if (!saved) return;
          if (discardedLocalIdsRef.current.delete(record.id)) {
            // 전송 중에 사용자가 삭제한 기록은 서버에서도 지운다
            void fetch(`/api/activities/${encodeURIComponent(saved.id)}`, { method: "DELETE" }).catch(() => {});
            return;
          }
          setActivities((prev) => prev.map((item) => (item.id === record.id ? saved : item)));
          return;
        }

        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          // 다시 보내도 실패하는 요청: 화면에서 내리고 알린다
          setActivities((prev) => prev.filter((item) => item.id !== record.id));
          showToast({
            tone: "error",
            message:
              res.status === 401
                ? "로그인이 만료되어 저장하지 못했습니다. 다시 로그인해 주세요."
                : `'${record.summaryTitle}' 기록을 저장하지 못했습니다.`,
          });
        }
        // 5xx는 대기 상태로 두고 다음 동기화 때 다시 보낸다
      } catch {
        // 네트워크 오류: 대기 상태 유지
      } finally {
        syncingIdsRef.current.delete(record.id);
      }
    },
    [showToast]
  );

  const syncPending = useCallback(() => {
    if (authPhaseRef.current !== "READY") return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    activitiesRef.current.filter((a) => isLocalId(a.id)).forEach((a) => void sendActivity(a));
  }, [sendActivity]);

  const persistActivity = useCallback(
    (record: ActivityRecord) => {
      setActivities((prev) => [record, ...prev]);
      if (authPhaseRef.current === "READY") void sendActivity(record);
    },
    [sendActivity]
  );

  const removeActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
    if (isLocalId(id)) {
      if (syncingIdsRef.current.has(id)) discardedLocalIdsRef.current.add(id);
      return;
    }
    if (authPhaseRef.current === "READY") {
      fetch(`/api/activities/${encodeURIComponent(id)}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok && res.status !== 404) throw new Error(String(res.status));
        })
        .catch(() => {
          showToast({ tone: "error", message: "기록을 삭제하지 못했습니다. 연결 상태를 확인해 주세요." });
          void loadBootstrap(selectedBabyIdRef.current, { silent: true });
        });
    }
  }, [loadBootstrap, showToast]);

  // 온라인/오프라인 감지, 화면 복귀 시 최신 데이터로 갱신
  useEffect(() => {
    const refresh = () => {
      if (authPhaseRef.current !== "READY") return;
      syncPending();
      if (Date.now() - lastRefreshRef.current < 5000) return;
      lastRefreshRef.current = Date.now();
      void loadBootstrap(selectedBabyIdRef.current, { silent: true });
    };
    const handleOnline = () => {
      setIsOffline(false);
      refresh();
    };
    const handleOffline = () => setIsOffline(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setNowMs(Date.now());
        refresh();
      }
    };

    setIsOffline(navigator.onLine === false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine !== false) refresh();
    }, DATA_REFRESH_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(interval);
    };
  }, [loadBootstrap, syncPending]);

  // 가족이 다른 기기에서 시작/종료한 타이머를 주기적으로 가져온다
  useEffect(() => {
    if (authPhase !== "READY") return;
    const babyId = selectedBabyId;
    let cancelled = false;

    const poll = async () => {
      if (document.visibilityState !== "visible" || navigator.onLine === false) return;
      const requestedAt = Date.now();
      try {
        const res = await fetch(`/api/timers?babyId=${encodeURIComponent(babyId)}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled || selectedBabyIdRef.current !== babyId) return;
        // 방금 이 기기에서 조작한 내용이 서버 응답보다 우선한다
        if (lastTimerMutationRef.current > requestedAt - 4000) return;

        const remote: RunningTimer | null = json.data ?? null;
        const local = runningTimerRef.current;
        const same =
          (!remote && !local) ||
          (remote !== null &&
            local !== null &&
            remote.category === local.category &&
            remote.isPaused === local.isPaused &&
            remote.startedAt === local.startedAt &&
            remote.accumulatedSec === local.accumulatedSec);
        if (same) return;

        setRunningTimer(remote);
        if (local && !remote) {
          // 다른 가족이 타이머를 종료·저장했으므로 타임라인도 갱신한다
          void loadBootstrap(babyId, { silent: true });
        }
      } catch {
        // 일시적인 네트워크 오류는 다음 주기에 다시 시도
      }
    };

    const interval = setInterval(poll, TIMER_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [authPhase, selectedBabyId, loadBootstrap]);

  // ---------------------------------------------------------------------
  // 파생 데이터
  // ---------------------------------------------------------------------
  const currentBaby = useMemo(
    () => babies.find((b) => b.id === selectedBabyId) ?? babies[0],
    [babies, selectedBabyId]
  );
  const todayKey = toDateKey(nowMs);
  const dayKey = selectedDay && selectedDay < todayKey ? selectedDay : todayKey;
  // 분 단위로만 바뀌는 값에 의존해 1초마다 재계산되지 않게 한다
  const nowMinuteMs = Math.floor(nowMs / 60_000) * 60_000;

  const ageInfo = useMemo(
    () => calculateAgeInfo(currentBaby.birthDate, currentBaby.dueDate, nowMinuteMs),
    [currentBaby, nowMinuteMs]
  );

  const babyActivities = useMemo(
    () => activities.filter((a) => a.babyId === currentBaby.id),
    [activities, currentBaby.id]
  );
  const babyDiaries = useMemo(
    () => diaries.filter((d) => d.babyId === currentBaby.id),
    [diaries, currentBaby.id]
  );

  const daySummary = useMemo(
    () => computeDailySummary(babyActivities, dayKey, nowMinuteMs),
    [babyActivities, dayKey, nowMinuteMs]
  );
  const todaySummary = useMemo(
    () => computeDailySummary(babyActivities, todayKey, nowMinuteMs),
    [babyActivities, todayKey, nowMinuteMs]
  );
  const dayGroups = useMemo(() => groupActivitiesByPeriod(babyActivities, dayKey), [babyActivities, dayKey]);
  const daySlots = useMemo(() => buildDaySlots(babyActivities, dayKey), [babyActivities, dayKey]);

  const lastFeeding = useMemo(() => findLatestByCategory(babyActivities, "FEEDING"), [babyActivities]);
  const lastDiaper = useMemo(() => findLatestByCategory(babyActivities, "DIAPER"), [babyActivities]);
  const lastSleep = useMemo(() => findLatestByCategory(babyActivities, "SLEEP"), [babyActivities]);
  const lastFormulaMl = useMemo(() => {
    let latest: ActivityRecord | undefined;
    for (const a of babyActivities) {
      if (a.category !== "FEEDING" || getFeedingKind(a) !== "FORMULA" || !a.amountMl) continue;
      if (!latest || a.startedAt > latest.startedAt) latest = a;
    }
    return latest?.amountMl ?? DEFAULT_QUICK_FORM.formulaMl;
  }, [babyActivities]);

  const recentActivities = useMemo(() => {
    const since = nowMinuteMs - 7 * 24 * 60 * 60 * 1000;
    return babyActivities.filter((a) => new Date(a.startedAt).getTime() >= since);
  }, [babyActivities, nowMinuteMs]);

  const pendingCount = authPhase === "READY" ? activities.filter((a) => isLocalId(a.id)).length : 0;
  const timerSeconds = computeTimerSeconds(runningTimer, nowMs);
  const wakeLockStatus = useWakeLock(
    activeTab === "NURSERY" && keepAwake && (authPhase === "READY" || authPhase === "DEMO")
  );

  // ---------------------------------------------------------------------
  // 타이머
  // ---------------------------------------------------------------------
  const pushTimer = useCallback(
    (body: Record<string, unknown>) => {
      if (authPhaseRef.current !== "READY") return;
      fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
        })
        .catch(() => {
          showToast({
            tone: "error",
            message: "타이머를 가족과 공유하지 못했습니다. 이 기기에서는 계속 진행됩니다.",
          });
        });
    },
    [showToast]
  );

  const handleStartTimer = (category: RunningTimer["category"], label: string) => {
    if (runningTimerRef.current) return;
    const startedAt = Date.now();
    lastTimerMutationRef.current = startedAt;
    setRunningTimer({
      id: newLocalId(startedAt),
      category,
      label,
      startedAt,
      startedBy: currentCaregiver,
      isPaused: false,
      accumulatedSec: 0,
    });
    setNowMs(startedAt);
    pushTimer({ babyId: currentBaby.id, category, label, status: "RUNNING", startedAt, accumulatedSec: 0 });
  };

  const handleTogglePauseTimer = () => {
    const timer = runningTimerRef.current;
    if (!timer) return;
    const now = Date.now();
    lastTimerMutationRef.current = now;
    const next: RunningTimer = timer.isPaused
      ? { ...timer, startedAt: now, isPaused: false }
      : { ...timer, isPaused: true, accumulatedSec: computeTimerSeconds(timer, now) };
    setRunningTimer(next);
    setNowMs(now);
    pushTimer({
      babyId: currentBaby.id,
      category: next.category,
      label: next.label,
      status: next.isPaused ? "PAUSED" : "RUNNING",
      startedAt: next.startedAt,
      accumulatedSec: next.accumulatedSec,
    });
  };

  const handleStopAndSaveTimer = () => {
    const timer = runningTimerRef.current;
    if (!timer) return;
    const now = Date.now();
    lastTimerMutationRef.current = now;
    const record = buildTimerActivity(timer, computeTimerSeconds(timer, now), {
      id: newLocalId(now),
      babyId: currentBaby.id,
      caregiver: currentCaregiver,
      nowMs: now,
    });

    if (authPhaseRef.current === "READY") {
      fetch(`/api/timers?babyId=${encodeURIComponent(currentBaby.id)}`, { method: "DELETE" }).catch(() => {});
    }
    setRunningTimer(null);
    persistActivity(record);
    showToast({ tone: "success", message: `${record.summaryTitle} 기록을 저장했습니다.` });
  };

  // ---------------------------------------------------------------------
  // 기록 추가 / 삭제
  // ---------------------------------------------------------------------
  const addActivityFromForm = (form: QuickActivityForm, options: { undoable?: boolean } = {}) => {
    const now = Date.now();
    const record = buildQuickActivity(form, {
      id: newLocalId(now),
      babyId: currentBaby.id,
      caregiver: currentCaregiver,
      nowMs: now,
    });
    persistActivity(record);
    showToast({
      tone: "success",
      message: `${record.summaryTitle} 기록을 저장했습니다.`,
      action: options.undoable
        ? {
            label: "취소",
            run: () => {
              // 저장 후 서버 ID로 바뀌었을 수 있으므로 내용으로 다시 찾는다
              const current = activitiesRef.current.find(
                (a) => a.id === record.id || (a.startedAt === record.startedAt && a.summaryTitle === record.summaryTitle && a.babyId === record.babyId)
              );
              if (current) removeActivity(current.id);
              setToast(null);
            },
          }
        : undefined,
    });
  };

  const handleSaveSheetActivity = (form: QuickActivityForm) => {
    setSheet(null);
    addActivityFromForm(form);
    // 지난 날짜를 보고 있었다면 방금 기록이 보이도록 오늘로 돌아온다
    setSelectedDay(null);
  };

  const handleDeleteActivity = (id: string) => {
    const target = activitiesRef.current.find((a) => a.id === id);
    if (!target) return;
    removeActivity(id);
    showToast({
      tone: "success",
      message: `'${target.summaryTitle}' 기록을 삭제했습니다.`,
      action: {
        label: "실행 취소",
        run: () => {
          persistActivity({ ...target, id: newLocalId() });
          setToast(null);
        },
      },
    });
  };

  // ---------------------------------------------------------------------
  // 육아일기 (사진 업로드 포함)
  // ---------------------------------------------------------------------
  const uploadDiaryMedia = async (diaryId: string, files: File[]) => {
    setUploadingDiaryIds((prev) => new Set(prev).add(diaryId));
    let failed = 0;
    let firstError: string | undefined;
    for (const file of files) {
      try {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch(`/api/diary/${encodeURIComponent(diaryId)}/media`, { method: "POST", body });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.data) {
          failed += 1;
          firstError = firstError ?? json?.message;
          continue;
        }
        const photo: DiaryPhoto = json.data;
        setDiaries((prev) =>
          prev.map((d) => (d.id === diaryId ? { ...d, photos: [...d.photos, photo] } : d))
        );
      } catch {
        failed += 1;
      }
    }
    setUploadingDiaryIds((prev) => {
      const next = new Set(prev);
      next.delete(diaryId);
      return next;
    });
    if (failed > 0) {
      showToast({
        tone: "error",
        message: firstError
          ? `사진 ${failed}개를 올리지 못했습니다. ${firstError}`
          : `사진 ${failed}개를 올리지 못했습니다. 일기 글은 저장되었습니다.`,
      });
    }
  };

  // 실패하면 시트에 표시할 메시지를 반환한다 (작성한 글을 잃지 않도록 시트를 닫지 않음)
  const handleSaveDiary = async (values: DiaryFormValues): Promise<string | null> => {
    const summary = {
      totalFeedingMl: todaySummary.formulaMl,
      totalSleepHours: Math.round((todaySummary.totalSleepMin / 60) * 10) / 10,
      diaperCount: todaySummary.wetCount + todaySummary.poopCount,
    };
    const title = values.title || "오늘의 육아일기";

    if (authPhaseRef.current !== "READY") {
      const local: DiaryItem = {
        id: newLocalId(),
        babyId: currentBaby.id,
        diaryDate: todayKey,
        title,
        content: values.content,
        mood: values.mood,
        author: currentCaregiver,
        tags: values.tags,
        isMilestone: values.isMilestone,
        photos: values.files.map((file, i) => ({
          id: `${newLocalId()}-${i}`,
          url: URL.createObjectURL(file),
          type: file.type.startsWith("video/") ? "VIDEO" : "IMAGE",
        })),
        dailySummary: summary,
      };
      setDiaries((prev) => [local, ...prev]);
      setSheet(null);
      showToast({ tone: "success", message: "일기를 추가했습니다. (샘플 모드에서는 저장되지 않습니다)" });
      return null;
    }

    try {
      const res = await fetch("/api/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId: currentBaby.id,
          diaryDate: todayKey,
          title,
          content: values.content,
          mood: values.mood,
          tags: values.tags,
          isMilestone: values.isMilestone,
          dailySummary: summary,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) {
        return json?.message || "일기를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      }
      const saved: DiaryItem = json.data;
      setDiaries((prev) => [saved, ...prev]);
      setSheet(null);
      showToast({ tone: "success", message: "일기를 저장했습니다." });
      if (values.files.length > 0) void uploadDiaryMedia(saved.id, values.files);
      return null;
    } catch {
      return "네트워크에 연결할 수 없어 일기를 저장하지 못했습니다. 연결 후 다시 시도해 주세요.";
    }
  };

  // ---------------------------------------------------------------------
  // 성장 측정 / 아기 추가
  // ---------------------------------------------------------------------
  const handleSaveGrowth = async (values: GrowthFormValues) => {
    const measured = new Date(`${values.date}T00:00:00.000Z`).getTime();
    const birth = new Date(`${currentBaby.birthDate}T00:00:00.000Z`).getTime();
    const local: GrowthItem = {
      id: newLocalId(),
      date: values.date,
      ageDays: Math.max(1, Math.floor((measured - birth) / 86_400_000) + 1),
      weightKg: values.weightKg ?? 0,
      heightCm: values.heightCm ?? 0,
      headCm: values.headCm ?? 0,
      note: values.note || undefined,
    };
    setGrowthRecords((prev) => [...prev, local]);
    setSheet(null);

    if (authPhaseRef.current !== "READY") {
      showToast({ tone: "success", message: "측정 기록을 추가했습니다." });
      return;
    }

    try {
      const res = await fetch("/api/growth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babyId: currentBaby.id,
          measuredDate: values.date,
          weightKg: values.weightKg,
          heightCm: values.heightCm,
          headCm: values.headCm,
          note: values.note || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data) throw new Error(String(res.status));
      setGrowthRecords((prev) => prev.map((g) => (g.id === local.id ? json.data : g)));
      showToast({ tone: "success", message: "측정 기록을 저장했습니다." });
    } catch {
      setGrowthRecords((prev) => prev.filter((g) => g.id !== local.id));
      showToast({ tone: "error", message: "측정 기록을 저장하지 못했습니다. 다시 시도해 주세요." });
    }
  };

  const handleAddBaby = async (values: NewBabyValues): Promise<string | null> => {
    if (authPhaseRef.current !== "READY") {
      const local: BabyProfile = {
        id: newLocalId(),
        name: values.name,
        nickname: values.name,
        birthDate: values.birthDate,
        dueDate: values.dueDate,
        gender: values.gender === "F" ? "F" : "M",
        bloodType: "미정",
        weightKg: 0,
        heightCm: 0,
        headCm: 0,
      };
      setBabies((prev) => [...prev, local]);
      setSelectedBabyId(local.id);
      setSheet(null);
      showToast({ tone: "success", message: `${values.name} 프로필을 추가했습니다.` });
      return null;
    }

    try {
      const res = await fetch("/api/babies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.data?.id) {
        return json?.message || "아기 프로필을 추가하지 못했습니다.";
      }
      setSelectedBabyId(json.data.id);
      setSelectedDay(null);
      await loadBootstrap(json.data.id, { silent: true });
      setSheet(null);
      showToast({ tone: "success", message: `${values.name} 프로필을 추가했습니다.` });
      return null;
    } catch {
      return "네트워크에 연결할 수 없습니다. 연결 후 다시 시도해 주세요.";
    }
  };

  const handleSelectBaby = (id: string) => {
    setSelectedBabyId(id);
    setSelectedDay(null);
    if (authPhaseRef.current === "READY") {
      lastTimerMutationRef.current = 0;
      setRunningTimer(null);
      void loadBootstrap(id, { silent: true });
    }
  };

  const handleChangeTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0 });
  };

  const enterDemoMode = () => {
    // 샘플 기록이 "방금 전" 기준으로 보이도록 현재 시각에 맞춰 옮긴다
    const shift = Date.now() - BASE_NOW_MS;
    const shiftIso = (iso: string | undefined) =>
      iso ? new Date(new Date(iso).getTime() + shift).toISOString() : undefined;
    setBabies(INITIAL_BABIES);
    setSelectedBabyId(INITIAL_BABIES[0].id);
    setActivities(
      INITIAL_ACTIVITIES.map((a) => ({
        ...a,
        startedAt: shiftIso(a.startedAt)!,
        endedAt: shiftIso(a.endedAt),
      }))
    );
    setDiaries(INITIAL_DIARIES);
    setGrowthRecords(INITIAL_GROWTH_RECORDS);
    setRunningTimer(null);
    setAuthPhase("DEMO");
  };

  // ---------------------------------------------------------------------
  // 화면
  // ---------------------------------------------------------------------
  if (authPhase === "LOADING") {
    return (
      <div
        role="status"
        className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#fdfcf8] text-slate-700 dark:bg-night-900 dark:text-slate-200"
      >
        <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-sprout-100 dark:bg-sprout-900">
          <img src="/sprout-128.png" alt="" className="h-9 w-9 object-contain" />
        </div>
        <p className="text-sm font-bold">기록을 불러오는 중…</p>
      </div>
    );
  }

  if (authPhase === "UNAUTHENTICATED") {
    return <AuthGate googleConfigured={googleConfigured} onEnterDemoMode={enterDemoMode} />;
  }

  if (authPhase === "ONBOARDING" && authUser) {
    return (
      <OnboardingSetup
        user={authUser}
        onComplete={async () => {
          await loadBootstrap();
        }}
      />
    );
  }

  const isDemo = authPhase !== "READY";

  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900 transition-colors dark:bg-night-900 dark:text-slate-100">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-sprout-700"
      >
        본문으로 건너뛰기
      </a>

      <AppHeader
        householdName={household?.name || "우리 가족"}
        caregiver={currentCaregiver}
        tabTitle={TAB_TITLES[activeTab]}
        babies={babies}
        currentBaby={currentBaby}
        nowMs={nowMs}
        onSelectBaby={handleSelectBaby}
        onAddBaby={() => setSheet({ type: "addBaby" })}
        onOpenSettings={() => setSheet({ type: "account" })}
        runningTimer={runningTimer}
        timerSeconds={timerSeconds}
        onTogglePause={handleTogglePauseTimer}
        onStopTimer={handleStopAndSaveTimer}
        showTiles={activeTab === "HOME"}
        latestAt={{
          FEEDING: lastFeeding?.startedAt,
          DIAPER: lastDiaper?.startedAt,
          SLEEP: lastSleep?.endedAt ?? lastSleep?.startedAt,
        }}
        onTile={(category) => setSheet({ type: "activity", category })}
      />

      {/* 연결 상태 / 저장 대기 안내 (본문 흐름 안에 두어 내용을 가리지 않는다) */}
      <div aria-live="polite">
        {isOffline ? (
          <p className="flex items-start gap-2 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
            <CloudOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              오프라인입니다.{" "}
              {isDemo
                ? "연결되면 다시 이용할 수 있습니다."
                : "새 기록은 이 기기에 보관했다가 연결되면 자동으로 전송합니다."}
            </span>
          </p>
        ) : pendingCount > 0 ? (
          <div className="flex items-center justify-between gap-3 bg-amber-100 px-4 py-1.5 text-sm font-semibold text-amber-950 dark:bg-amber-900/60 dark:text-amber-100">
            <span>저장 대기 중인 기록 {pendingCount}건</span>
            <button type="button" onClick={syncPending} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 font-bold underline underline-offset-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              지금 전송
            </button>
          </div>
        ) : null}
      </div>

      {isDemo && (
        <div className="flex items-center justify-between gap-3 bg-slate-100 px-4 py-1.5 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <span>샘플 미리보기 · 기록이 저장되지 않습니다</span>
          <button
            type="button"
            onClick={() => setAuthPhase("UNAUTHENTICATED")}
            className="min-h-11 shrink-0 rounded-xl px-2 font-bold text-sprout-700 underline underline-offset-2 dark:text-sprout-300"
          >
            로그인
          </button>
        </div>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 space-y-4 px-4 pb-[calc(10rem+env(safe-area-inset-bottom))] pt-4 outline-none"
      >
        {activeTab === "HOME" && (
          <HomeTab
            babyName={currentBaby.name}
            dayKey={dayKey}
            todayKey={todayKey}
            onShiftDay={(delta) => {
              const next = addDaysToKey(dayKey, delta);
              setSelectedDay(next >= todayKey ? null : next);
            }}
            onGoToday={() => setSelectedDay(null)}
            summary={daySummary}
            daySlots={daySlots}
            groups={dayGroups}
            hasRunningTimer={runningTimer !== null}
            showPending={!isDemo}
            onStartTimer={handleStartTimer}
            onAdd={(category) => setSheet({ type: "activity", category })}
            onDelete={handleDeleteActivity}
          />
        )}

        {activeTab === "CALENDAR" && (
          <CalendarTab
            babyName={currentBaby.name}
            activities={babyActivities}
            diaries={babyDiaries}
            growthRecords={growthRecords}
            todayKey={todayKey}
            nowMs={nowMinuteMs}
            onOpenDay={(key) => {
              setSelectedDay(key >= todayKey ? null : key);
              handleChangeTab("HOME");
            }}
          />
        )}

        {activeTab === "REPORTS" && (
          <ReportsTab
            babyName={currentBaby.name}
            birthDate={currentBaby.birthDate}
            ageDays={ageInfo.diffDays}
            ageMonths={ageInfo.months}
            growthRecords={growthRecords}
            recentActivities={recentActivities}
            onAddGrowth={() => setSheet({ type: "growth" })}
          />
        )}

        {activeTab === "NURSERY" && (
          <NurseryTab
            babyName={currentBaby.name}
            nowMs={nowMs}
            todayKey={todayKey}
            lastFeeding={lastFeeding}
            lastDiaper={lastDiaper}
            formulaMl={lastFormulaMl}
            runningTimer={runningTimer}
            hue={nurseryHue}
            dim={nurseryDim}
            onChangeHue={(v) => {
              setNurseryHue(v);
              writePref("bebelog-nursery-hue", String(v));
            }}
            onChangeDim={(v) => {
              setNurseryDim(v);
              writePref("bebelog-nursery-dim", String(v));
            }}
            keepAwake={keepAwake}
            onToggleKeepAwake={() =>
              setKeepAwake((v) => {
                writePref("bebelog-keep-awake", v ? "off" : "on");
                return !v;
              })
            }
            wakeLockStatus={wakeLockStatus}
            onQuickFormula={() =>
              addActivityFromForm(
                { ...DEFAULT_QUICK_FORM, category: "FEEDING", feedingType: "FORMULA", formulaMl: lastFormulaMl },
                { undoable: true }
              )
            }
            onQuickDiaper={(kind) =>
              addActivityFromForm(
                { ...DEFAULT_QUICK_FORM, category: "DIAPER", diaperType: kind },
                { undoable: true }
              )
            }
            onStartTimer={handleStartTimer}
          />
        )}

        {activeTab === "DIARY" && (
          <DiaryTab
            babyName={currentBaby.name}
            diaries={babyDiaries}
            uploadingIds={uploadingDiaryIds}
            onWrite={() => setSheet({ type: "diary" })}
          />
        )}
      </main>

      {/* 엄지 영역: 알림 토스트와 빠른 기록 버튼 */}
      <div className="pointer-events-none fixed bottom-[calc(60px+0.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex w-full max-w-[480px] -translate-x-1/2 flex-col items-end gap-3 px-4">
        <div aria-live="polite" className="w-full">
          {toast && (
            <div
              key={toast.id}
              role={toast.tone === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex w-full animate-toast-in items-center gap-2 rounded-2xl py-1.5 pl-4 pr-1.5 text-sm font-semibold text-white shadow-xl ${
                toast.tone === "error" ? "bg-rose-700" : "bg-slate-900 dark:bg-slate-700"
              }`}
            >
              {toast.tone === "error" ? (
                <CircleAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
              ) : (
                <CircleCheck className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 py-1.5">{toast.message}</span>
              {toast.action && (
                <button
                  type="button"
                  onClick={toast.action.run}
                  className="min-h-11 shrink-0 rounded-xl bg-white/15 px-3.5 font-extrabold text-emerald-200 active:bg-white/30"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="알림 닫기"
                className="icon-btn shrink-0 text-white/80 active:bg-white/20"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>

        {activeTab === "HOME" && sheet === null && (
          <button
            type="button"
            onClick={() => setSheet({ type: "activity", category: null })}
            aria-label="기록 추가"
            className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full bg-sprout-600 text-white shadow-lg shadow-sprout-900/30 transition-colors duration-150 hover:bg-sprout-700 active:bg-sprout-800"
          >
            <Plus className="h-7 w-7" aria-hidden="true" />
          </button>
        )}
      </div>

      <BottomNav activeTab={activeTab} onChange={handleChangeTab} />

      {sheet?.type === "activity" && (
        <ActivitySheet
          initialCategory={sheet.category}
          caregiver={currentCaregiver}
          lastFormulaMl={lastFormulaMl}
          onSave={handleSaveSheetActivity}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === "diary" && (
        <DiarySheet
          babyName={currentBaby.name}
          attachMode={isDemo ? "preview-only" : mediaConfigured ? "enabled" : "unavailable"}
          onSave={handleSaveDiary}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === "growth" && (
        <GrowthSheet
          babyName={currentBaby.name}
          todayKey={todayKey}
          birthDate={currentBaby.birthDate}
          onSave={handleSaveGrowth}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === "addBaby" && (
        <AddBabySheet todayKey={todayKey} onSubmit={handleAddBaby} onClose={() => setSheet(null)} />
      )}
      {sheet?.type === "account" && (
        <AccountSheet
          authUser={authUser}
          household={household}
          isDemo={isDemo}
          darkMode={darkMode}
          onToggleDarkMode={() =>
            setDarkMode((d) => {
              writePref("bebelog-theme", d ? "light" : "dark");
              return !d;
            })
          }
          caregiver={currentCaregiver}
          onChangeCaregiver={setCurrentCaregiver}
          onSignOut={() => signOut({ callbackUrl: "/" })}
          onGoToLogin={() => {
            setSheet(null);
            setAuthPhase("UNAUTHENTICATED");
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
