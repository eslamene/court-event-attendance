const PRODUCTION_API = "https://court-events.flagshipfintech.com";

/** Production URL in release builds; localhost only when running `expo start` in dev. */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__ ? "http://localhost:3000" : PRODUCTION_API);
