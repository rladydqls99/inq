import { Download, Share2, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallChoice = {
  outcome: "accepted" | "dismissed";
  platform: string;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

type InstallMethod = "browser" | "ios" | "manual";

export function PwaInstallPrompt() {
  const [installMethod, setInstallMethod] = useState<InstallMethod | null>(
    null,
  );
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isMobileDevice()) {
      return;
    }

    setInstallMethod(isIosDevice() ? "ios" : "manual");

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setInstallMethod("browser");
    }

    function handleAppInstalled() {
      setInstallPrompt(null);
      setInstallMethod(null);
      setDismissed(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;

      setInstallMethod(null);
      setDismissed(true);
    } catch {
      setInstallMethod("manual");
    }

    setInstallPrompt(null);
  }

  if (!installMethod || dismissed) {
    return null;
  }

  const isIos = installMethod === "ios";
  const canInstallDirectly = installMethod === "browser";

  return (
    <aside
      className="pwa-install-prompt"
      aria-labelledby="pwa-install-prompt-title"
      aria-live="polite"
    >
      <div className="pwa-install-prompt__icon" aria-hidden="true">
        {isIos ? <Share2 size={22} /> : <Download size={22} />}
      </div>
      <div className="pwa-install-prompt__content">
        <strong id="pwa-install-prompt-title">
          {canInstallDirectly
            ? "inq 앱을 설치하세요"
            : "inq를 홈 화면에 추가하세요"}
        </strong>
        <p>
          {isIos
            ? "브라우저의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요."
            : canInstallDirectly
              ? "홈 화면에서 바로 열고 더 넓은 화면으로 학습할 수 있어요."
              : "브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요."}
        </p>
        {canInstallDirectly ? (
          <button
            className="pwa-install-prompt__install-button"
            type="button"
            onClick={() => void installApp()}
          >
            앱 설치
          </button>
        ) : null}
      </div>
      <button
        className="pwa-install-prompt__close-button"
        type="button"
        aria-label="설치 안내 닫기"
        onClick={() => setDismissed(true)}
      >
        <X aria-hidden="true" size={20} />
      </button>
    </aside>
  );
}

function isStandalone() {
  const navigatorWithStandalone = navigator as NavigatorWithStandalone;

  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    navigatorWithStandalone.standalone === true
  );
}

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isMobileDevice() {
  return (
    isIosDevice() ||
    /Android|Mobile/.test(navigator.userAgent) ||
    window.matchMedia?.("(pointer: coarse)").matches === true
  );
}
