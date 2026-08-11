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
      className="fixed right-[max(16px,calc((100vw-720px)/2+16px))] bottom-[calc(var(--bottom-tab-height)+env(safe-area-inset-bottom,0px)+12px)] left-[max(16px,calc((100vw-720px)/2+16px))] z-30 grid grid-cols-[44px_minmax(0,1fr)_44px] items-start gap-3 rounded-xl bg-inq-surface p-4 text-inq-ink shadow-[0_4px_8px_rgb(13_22_15_/_18%)]"
      aria-labelledby="pwa-install-prompt-title"
      aria-live="polite"
    >
      <div
        className="grid size-11 place-items-center rounded-lg bg-inq-highlight text-inq-on-highlight"
        aria-hidden="true"
      >
        {isIos ? <Share2 size={22} /> : <Download size={22} />}
      </div>
      <div className="grid min-w-0 gap-1.5">
        <strong
          id="pwa-install-prompt-title"
          className="text-xl font-bold leading-[1.35] tracking-[-0.015em] text-balance"
        >
          {canInstallDirectly
            ? "inq 앱을 설치하세요"
            : "inq를 홈 화면에 추가하세요"}
        </strong>
        <p className="m-0 text-sm font-medium leading-[1.4] text-inq-ink-soft text-pretty">
          {isIos
            ? "브라우저의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요."
            : canInstallDirectly
              ? "홈 화면에서 바로 열고 더 넓은 화면으로 학습할 수 있어요."
              : "브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요."}
        </p>
        {canInstallDirectly ? (
          <button
            className="mt-1.5 min-h-12 cursor-pointer rounded-lg border-0 bg-inq-ink px-[18px] py-3 text-sm font-bold leading-[1.4] text-inq-canvas active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2"
            type="button"
            onClick={() => void installApp()}
          >
            앱 설치
          </button>
        ) : null}
      </div>
      <button
        className="grid size-11 cursor-pointer place-items-center rounded-lg border-0 bg-transparent p-0 text-inq-ink-soft focus-visible:outline-3 focus-visible:outline-inq-highlight-strong focus-visible:outline-offset-2"
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
