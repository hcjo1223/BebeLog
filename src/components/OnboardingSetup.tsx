"use client";

import React, { useState } from "react";
import { signOut } from "next-auth/react";
import { Baby, Users, LogOut, Check, Sparkles } from "lucide-react";

interface OnboardingSetupProps {
  user: {
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
  onComplete: () => Promise<void>;
}

export function OnboardingSetup({ user, onComplete }: OnboardingSetupProps) {
  const [mode, setMode] = useState<"CREATE" | "JOIN">("CREATE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 새 가족 & 아기 등록 폼
  const [householdName, setHouseholdName] = useState(`${user.name}네 가족`);
  const [relationLabel, setRelationLabel] = useState("엄마");
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "UNKNOWN">("M");
  const [bloodType, setBloodType] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");

  // 초대 코드 합류 폼
  const [inviteCode, setInviteCode] = useState("");
  const [joinRelation, setJoinRelation] = useState("아빠");

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!babyName.trim()) {
      setErrorMsg("아기 이름 또는 태명을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          householdName,
          relationLabel,
          babyName,
          birthDate,
          dueDate: dueDate || undefined,
          gender,
          bloodType: bloodType || undefined,
          weightKg: weightKg ? parseFloat(weightKg) : undefined,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.message || "초기 세팅 저장에 실패했습니다.");
        setIsSubmitting(false);
        return;
      }
      await onComplete();
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!inviteCode.trim()) {
      setErrorMsg("가족 초대 코드를 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: inviteCode.trim().toUpperCase(),
          relationLabel: joinRelation,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorMsg(json.message || "초대 코드를 확인할 수 없습니다.");
        setIsSubmitting(false);
        return;
      }
      await onComplete();
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#fdfcf8] dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* 상단 인사 헤더 */}
      <div className="bg-[#0d8a72] text-white px-5 pt-8 pb-7 rounded-b-[2rem] shadow-md">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full border-2 border-white/60 object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold">
                {user.name[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs text-emerald-100 truncate">{user.email}</p>
              <p className="text-sm font-bold truncate">{user.name}님 환영합니다!</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            className="min-h-[38px] px-3 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold flex items-center gap-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>

        <h1 className="text-xl font-extrabold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-300" />
          우리 아기 처음 세팅하기
        </h1>
        <p className="text-xs text-emerald-50/90 mt-1">
          아기 프로필을 새로 만들거나, 배우자가 공유한 초대 코드로 바로 합류하세요.
        </p>
      </div>

      {/* 모드 전환 탭 */}
      <div className="px-5 pt-5">
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode("CREATE");
              setErrorMsg(null);
            }}
            className={`min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === "CREATE"
                ? "bg-white dark:bg-slate-900 text-[#0d8a72] shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Baby className="w-4 h-4" />
            새 아기 등록하기
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("JOIN");
              setErrorMsg(null);
            }}
            className={`min-h-[44px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === "JOIN"
                ? "bg-white dark:bg-slate-900 text-[#0d8a72] shadow-sm"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <Users className="w-4 h-4" />
            초대 코드로 합류
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* 폼 영역 */}
      <div className="flex-1 px-5 py-5">
        {mode === "CREATE" ? (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  가족 공간 이름
                </label>
                <input
                  type="text"
                  required
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="예: 튼튼이네 가족"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8a72]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  나의 양육자 호칭
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["엄마", "아빠", "할머니", "돌봄이"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setRelationLabel(label)}
                      className={`min-h-[40px] rounded-xl text-xs font-bold border transition-colors ${
                        relationLabel === label
                          ? "bg-[#0d8a72] text-white border-[#0d8a72]"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  아기 이름 또는 태명 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="예: 김하준 (튼튼이)"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8a72]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    생년월일 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8a72]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    성별
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setGender("M")}
                      className={`min-h-[44px] rounded-xl text-xs font-bold border ${
                        gender === "M"
                          ? "bg-sky-500 text-white border-sky-500"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      남아 👦
                    </button>
                    <button
                      type="button"
                      onClick={() => setGender("F")}
                      className={`min-h-[44px] rounded-xl text-xs font-bold border ${
                        gender === "F"
                          ? "bg-rose-400 text-white border-rose-400"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      여아 👧
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    출산예정일 (선택)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8a72]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    혈액형 (선택)
                  </label>
                  <input
                    type="text"
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    placeholder="예: A+"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8a72]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    현재 몸무게 (kg, 선택)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="예: 3.4"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8a72]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    현재 키 (cm, 선택)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="예: 50.5"
                    className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d8a72]"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[52px] rounded-2xl bg-[#0d8a72] hover:bg-[#0b7460] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Check className="w-5 h-5" />
              {isSubmitting ? "DB에 저장하는 중..." : "세팅 완료하고 베베로그 시작하기"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 space-y-4 shadow-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  가족 초대 코드 (6자리)
                </label>
                <input
                  type="text"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="예: A7K9P2"
                  maxLength={12}
                  className="w-full min-h-[48px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-base font-mono font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-[#0d8a72]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                  나의 양육자 호칭
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["아빠", "엄마", "할머니", "돌봄이"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setJoinRelation(label)}
                      className={`min-h-[40px] rounded-xl text-xs font-bold border transition-colors ${
                        joinRelation === label
                          ? "bg-[#0d8a72] text-white border-[#0d8a72]"
                          : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[52px] rounded-2xl bg-[#0d8a72] hover:bg-[#0b7460] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Users className="w-5 h-5" />
              {isSubmitting ? "가족 공간에 연결 중..." : "초대 코드로 합류하기"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
