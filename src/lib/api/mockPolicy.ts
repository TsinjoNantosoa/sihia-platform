export type MockEnv = {
  PROD?: boolean;
  VITE_USE_MOCKS?: string;
};

export const DEFAULT_API_URL = "http://localhost:8000";

export const shouldUseMocks = (env: MockEnv = import.meta.env): boolean => {
  const isProd = Boolean(env.PROD);
  const mockFlag = env.VITE_USE_MOCKS === "true";

  if (isProd && mockFlag) {
    console.warn("[MOCKS] VITE_USE_MOCKS est ignore en production.");
    return false;
  }

  return mockFlag;
};