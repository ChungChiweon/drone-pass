export type GraphActivationStep =
  | "IDLE"
  | "CLICK_RECEIVED"
  | "PRECHECK_RUNNING"
  | "ACTIVATING"
  | "BENCHMARK_RUNNING"
  | "ROLLING_BACK"
  | "REACTIVATING"
  | "COMPLETED"
  | "FAILED";

export type GraphActivationPreflight = {
  ok: boolean;
  checkedAt: string;
  reasons: string[];
  canActivate: boolean;
};

export type GraphActivationViewState = {
  clickReceivedAt: string | null;
  currentStep: GraphActivationStep;
  isRunning: boolean;
  lastError: string | null;
  lastResult: string | null;
  preflight: GraphActivationPreflight | null;
};

export const INITIAL_GRAPH_ACTIVATION_VIEW_STATE: GraphActivationViewState = {
  clickReceivedAt: null,
  currentStep: "IDLE",
  isRunning: false,
  lastError: null,
  lastResult: null,
  preflight: null
};

export function startGraphActivationClick(now: string): GraphActivationViewState {
  return {
    ...INITIAL_GRAPH_ACTIVATION_VIEW_STATE,
    clickReceivedAt: now,
    currentStep: "CLICK_RECEIVED",
    isRunning: true
  };
}

export function graphActivationStep(
  state: GraphActivationViewState,
  currentStep: GraphActivationStep
): GraphActivationViewState {
  return { ...state, currentStep };
}

export function graphActivationSucceeded(
  state: GraphActivationViewState,
  lastResult: string,
  preflight?: GraphActivationPreflight
): GraphActivationViewState {
  return {
    ...state,
    currentStep: "COMPLETED",
    isRunning: false,
    lastError: null,
    lastResult,
    preflight: preflight ?? state.preflight
  };
}

export function graphActivationFailed(
  state: GraphActivationViewState,
  error: unknown,
  preflight?: GraphActivationPreflight
): GraphActivationViewState {
  return {
    ...state,
    currentStep: "FAILED",
    isRunning: false,
    lastError: normalizeActivationError(error),
    preflight: preflight ?? state.preflight
  };
}

export function canRunGraphActivation(preflight: GraphActivationPreflight | null) {
  return Boolean(preflight?.ok && preflight.canActivate);
}

export function normalizeActivationError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}
