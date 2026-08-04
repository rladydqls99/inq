import { useState } from "react";

import { useLock } from "@/entities/auth/api";
import { PageHeader } from "@/shared/ui/PageHeader";
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

  function updateVehicleControl(enabled: boolean) {
    setVehicleControlEnabledState(enabled);
    setVehicleControlEnabled(enabled);
  }

  function updateVoiceAnswer(enabled: boolean) {
    setVoiceAnswerEnabledState(enabled);
    setVoiceAnswerEnabled(enabled);
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
      <div className="settings-sections">
        <section className="settings-section">
          <h2>차량 제어</h2>
          <label className="settings-toggle">
            <span className="settings-toggle__copy">
              <strong>학습 차량 제어</strong>
              <span id="vehicle-control-description">
                덱·챌린지 학습 중 차량의 이전·다음 버튼으로 카드를 이동합니다.
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
        <section className="settings-section">
          <h2>음성 정답 판정</h2>
          <label className="settings-toggle">
            <span className="settings-toggle__copy">
              <strong>음성으로 정답 확인</strong>
              <span id="voice-answer-description">
                덱 학습 중 마이크 음성이 Soniox로 전송되어 정답을 판정합니다.
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
        <section className="settings-section">
          <h2>백업</h2>
          <BackupExportButton />
        </section>
        <section className="settings-section">
          <h2>잠금</h2>
          <div className="settings-action">
            <button type="button" onClick={() => void lock()}>
              잠그기
            </button>
            {lockError ? <span>잠금 처리에 실패했습니다.</span> : null}
          </div>
        </section>
      </div>
    </section>
  );
}
