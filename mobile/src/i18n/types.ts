import type { ar } from "./translations/ar";

export type TranslationTree = {
  [K in keyof typeof ar]: {
    [P in keyof (typeof ar)[K]]: (typeof ar)[K][P] extends string
      ? string
      : (typeof ar)[K][P] extends Record<string, string>
        ? Record<string, string>
        : string;
  };
};

export type Locale = "ar" | "en";

export type TranslationParams = Record<string, string | number>;
