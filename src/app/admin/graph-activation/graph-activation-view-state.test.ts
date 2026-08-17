import { describe, expect, it } from "vitest";
import {
  canRunGraphActivation,
  graphActivationFailed,
  graphActivationStep,
  graphActivationSucceeded,
  INITIAL_GRAPH_ACTIVATION_VIEW_STATE,
  normalizeActivationError,
  startGraphActivationClick
} from "./graph-activation-view-state";

describe("graph activation UI state", () => {
  it("records CLICK_RECEIVED immediately", () => {
    const state = startGraphActivationClick("2026-08-01T00:00:00.000Z");

    expect(state.clickReceivedAt).toBe("2026-08-01T00:00:00.000Z");
    expect(state.currentStep).toBe("CLICK_RECEIVED");
    expect(state.isRunning).toBe(true);
  });

  it("records step transitions and releases running on success", () => {
    const running = graphActivationStep(startGraphActivationClick("now"), "PRECHECK_RUNNING");
    const done = graphActivationSucceeded(running, "preflight passed", {
      ok: true,
      checkedAt: "now",
      reasons: [],
      canActivate: true
    });

    expect(running.currentStep).toBe("PRECHECK_RUNNING");
    expect(done.currentStep).toBe("COMPLETED");
    expect(done.isRunning).toBe(false);
    expect(done.lastResult).toBe("preflight passed");
  });

  it("normalizes errors and releases running on failure", () => {
    const failed = graphActivationFailed(startGraphActivationClick("now"), { code: "LOCAL_STORAGE_UNAVAILABLE" });

    expect(failed.currentStep).toBe("FAILED");
    expect(failed.isRunning).toBe(false);
    expect(failed.lastError).toContain("LOCAL_STORAGE_UNAVAILABLE");
  });

  it("enables activation only after passing preflight", () => {
    expect(canRunGraphActivation(null)).toBe(false);
    expect(canRunGraphActivation({ ok: false, checkedAt: "now", reasons: ["Pack missing"], canActivate: false })).toBe(false);
    expect(canRunGraphActivation({ ok: true, checkedAt: "now", reasons: [], canActivate: true })).toBe(true);
  });

  it("keeps unknown thrown values visible", () => {
    expect(normalizeActivationError("boom")).toBe("boom");
    expect(normalizeActivationError(new Error("typed"))).toBe("typed");
    expect(INITIAL_GRAPH_ACTIVATION_VIEW_STATE.currentStep).toBe("IDLE");
  });
});
