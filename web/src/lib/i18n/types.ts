export type Dictionary = Record<string, string>;

export type LocaleInfo = {
  id: string;
  code: string;
  name: string;
  direction: "rtl" | "ltr";
  isDefault: boolean;
};

export type I18nContextValue = {
  locale: string;
  direction: "rtl" | "ltr";
  dict: Dictionary;
  t: (key: string, vars?: Record<string, string | number>) => string;
};
