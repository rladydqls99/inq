// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PwaInstallPrompt } from "../src/components/PwaInstallPrompt";

describe("PwaInstallPrompt", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the browser install action when the PWA becomes installable", async () => {
    mockNavigator("Mozilla/5.0 (Linux; Android 15) AppleWebKit Mobile");
    mockDisplayMode(false);
    const prompt = vi.fn(() => Promise.resolve());
    const event = Object.assign(new Event("beforeinstallprompt"), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
    });

    render(<PwaInstallPrompt />);
    act(() => window.dispatchEvent(event));

    expect(await screen.findByText("inq 앱을 설치하세요")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "앱 설치" }));

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("inq 앱을 설치하세요")).toBeNull();
  });

  it("shows home-screen instructions on iOS", async () => {
    mockNavigator(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit Mobile Safari",
    );
    mockDisplayMode(false);

    render(<PwaInstallPrompt />);

    expect(await screen.findByText("inq를 홈 화면에 추가하세요")).toBeTruthy();
    expect(
      screen.getByText("브라우저의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요."),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "앱 설치" })).toBeNull();
  });

  it("shows browser-menu instructions on mobile when a direct prompt is unavailable", async () => {
    mockNavigator("Mozilla/5.0 (Linux; Android 15) AppleWebKit Mobile");
    mockDisplayMode(false);

    render(<PwaInstallPrompt />);

    expect(await screen.findByText("inq를 홈 화면에 추가하세요")).toBeTruthy();
    expect(
      screen.getByText(
        "브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요.",
      ),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "앱 설치" })).toBeNull();
  });

  it("stays hidden when the app is already running standalone", () => {
    mockNavigator("Mozilla/5.0 (Linux; Android 15) AppleWebKit Mobile");
    mockDisplayMode(true);

    render(<PwaInstallPrompt />);
    act(() =>
      window.dispatchEvent(
        Object.assign(new Event("beforeinstallprompt"), {
          prompt: vi.fn(),
          userChoice: Promise.resolve({ outcome: "accepted", platform: "web" }),
        }),
      ),
    );

    expect(screen.queryByText("inq 앱을 설치하세요")).toBeNull();
  });
});

function mockNavigator(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    configurable: true,
    value: userAgent,
  });
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: userAgent.includes("iPhone") ? "iPhone" : "Linux armv8l",
  });
}

function mockDisplayMode(standalone: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: query === "(display-mode: standalone)" ? standalone : true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}
