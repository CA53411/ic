import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

type Lang = "zh" | "en";

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
}

const LangContext = createContext<LangContextValue>({
  lang: "zh",
  setLang: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh");
  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

/* Decorative labels – not wired to actual i18n */
export const labels: Record<string, Record<Lang, string>> = {
  appName: { zh: "PLATONIC", en: "PLATONIC" },
  tagline: {
    zh: "A HEARTBEAT IN THE DIGITAL VOID",
    en: "A HEARTBEAT IN THE DIGITAL VOID",
  },
  subtitle: {
    zh: "一个懂你呼吸频率的存在",
    en: "A presence that knows your breathing rhythm",
  },
};
