import { useState } from "react";

import { useLock } from "@/entities/auth/api";
import { PageHeader } from "@/shared/ui/PageHeader";
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@/shared/theme";
import { BackupExportButton } from "./BackupExportButton";
import {
  isVehicleControlEnabled,
  setVehicleControlEnabled,
} from "@/widgets/vehicleControlSettings";
import {
  isVoiceAnswerEnabled,
  setVoiceAnswerEnabled,
} from "@/widgets/voiceAnswerSettings";

export function SettingsPage() {
  const [lockError, setLockError] = useState(false);
  const lockMutation = useLock();
  const [vehicleControlEnabled, setVehicleControlEnabledState] = useState(
    isVehicleControlEnabled,
  );
  const [voiceAnswerEnabled, setVoiceAnswerEnabledState] =
    useState(isVoiceAnswerEnabled);
  const [theme, setTheme] = useState(getThemePreference);

  function updateVehicleControl(enabled: boolean) {
    setVehicleControlEnabledState(enabled);
    setVehicleControlEnabled(enabled);
  }

  function updateVoiceAnswer(enabled: boolean) {
    setVoiceAnswerEnabledState(enabled);
    setVoiceAnswerEnabled(enabled);
  }

  function updateTheme(preference: ThemePreference) {
    setTheme(preference);
    setThemePreference(preference);
  }

  async function lock() {
    try {
      await lockMutation.mutateAsync();
      setLockError(false);
      window.dispatchEvent(new Event("inq:locked"));
    } catch {
      setLockError(true);
    }
  }

  return (
    <section className="page">
      <PageHeader title="설정" />
      <div className="mt-[18px] grid gap-[18px] [&_h2]:m-0 [&_h2]:text-[15px] [&_h2]:font-extrabold">
        <section className="grid gap-2.5">
          <h2>화면 테마</h2>
          <p
            id="theme-description"
            className="m-0 text-[13px] leading-[1.45] text-inq-ink-soft"
          >
            기본값은 다크 모드입니다. 시스템 설정을 따르도록 바꿀 수 있습니다.
          </p>
          <div
            aria-describedby="theme-description"
            aria-label="화면 테마"
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
          >
            {(["dark", "light", "system"] as const).map((preference) => (
              <label
                key={preference}
                className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-2 text-center text-sm font-bold transition-colors focus-within:outline-3 focus-within:outline-inq-highlight-strong focus-within:outline-offset-2 motion-reduce:transition-none ${
                  theme === preference
                    ? "border-inq-highlight bg-inq-highlight text-inq-on-highlight"
                    : "border-inq-line bg-inq-surface text-inq-ink"
                }`}
              >
                <input
                  checked={theme === preference}
                  className="sr-only"
                  name="theme"
                  type="radio"
                  value={preference}
                  onChange={() => updateTheme(preference)}
                />
                {preference === "dark"
                  ? "다크"
                  : preference === "light"
                    ? "라이트"
                    : "시스템"}
              </label>
            ))}
          </div>
        </section>
        <section className="grid gap-2.5">
          <h2>차량 제어</h2>
          <label className="settings-toggle">
            <span className="settings-toggle__copy">
              <strong>학습 차량 제어</strong>
              <span id="vehicle-control-description">
                덱 학습 중 차량의 이전·다음 버튼으로 카드를 이동합니다.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={vehicleControlEnabled}
              aria-describedby="vehicle-control-description"
              onChange={(event) => updateVehicleControl(event.target.checked)}
            />
          </label>
        </section>
        <section className="grid gap-2.5">
          <h2>음성 정답 판정</h2>
          <label className="settings-toggle">
            <span className="settings-toggle__copy">
              <strong>음성으로 정답 확인</strong>
              <span id="voice-answer-description">
                챌린지 학습 중 마이크 음성이 Soniox로 전송되어 정답을
                판정합니다.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={voiceAnswerEnabled}
              aria-describedby="voice-answer-description"
              onChange={(event) => updateVoiceAnswer(event.target.checked)}
            />
          </label>
        </section>
        <section className="grid gap-2.5">
          <h2>백업</h2>
          <BackupExportButton />
        </section>
        <section className="grid gap-2.5">
          <h2>잠금</h2>
          <div className="flex items-center gap-2.5">
            <button
              className="min-h-10 cursor-pointer rounded-lg border border-inq-line bg-inq-canvas px-3 font-bold text-inq-ink"
              type="button"
              onClick={() => void lock()}
            >
              잠그기
            </button>
            {lockError ? (
              <span className="text-[13px] font-extrabold text-inq-error">
                잠금 처리에 실패했습니다.
              </span>
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}
