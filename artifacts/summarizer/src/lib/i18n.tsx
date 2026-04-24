import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "km" | "en";

type Dict = {
  brand: string;
  heroTitleA: string;
  heroTitleB: string;
  heroSubtitle: string;
  sourceText: string;
  charsOf: (n: string, max: string) => string;
  placeholder: string;
  clear: string;
  words: (n: string) => string;
  needAtLeast: (n: number) => string;
  tooLong: string;
  model: string;
  modelMt5: string;
  modelMt5Desc: string;
  modelGemma: string;
  modelGemmaDesc: string;
  format: string;
  paragraph: string;
  bullets: string;
  numBeams: string;
  numBeamsHint: string;
  maxNewTokens: string;
  maxNewTokensHint: string;
  maxLength: string;
  maxLengthHint: string;
  summarize: string;
  distilling: string;
  failed: string;
  summary: string;
  copy: string;
  copied: string;
  copiedDesc: string;
  awaitingTitle: string;
  awaitingDesc: string;
  compressed: (pct: string) => string;
  wordsArrow: (a: number, b: number) => string;
  seconds: (s: string) => string;
  textTooShortTitle: string;
  textTooShortDesc: (n: number) => string;
  textTooLongTitle: string;
  textTooLongDesc: (n: number) => string;
  useCasesTitle: string;
  research: string;
  researchDesc: string;
  meeting: string;
  meetingDesc: string;
  articles: string;
  articlesDesc: string;
  footerTagline: string;
  switchLang: string;
  htmlTitle: string;
  htmlDesc: string;
};

const km: Dict = {
  brand: "Distill",
  heroTitleA: "ការគិតច្បាស់លាស់",
  heroTitleB: "ពីការសរសេរស្មុគស្មាញ",
  heroSubtitle:
    "ឧបករណ៍ផ្តោតសម្រាប់និពន្ធករ អ្នកស្រាវជ្រាវ និងអ្នកសរសេរ។ បិទភ្ជាប់អត្ថបទវែងរបស់អ្នក ហើយបំបែកវាទៅជាអត្ថន័យសំខាន់។",
  sourceText: "អត្ថបទដើម",
  charsOf: (n, max) => `${n} / ${max} តួអក្សរ`,
  placeholder: "បិទភ្ជាប់អត្ថបទ ការស្រាវជ្រាវ ឬកំណត់ត្រាប្រជុំរបស់អ្នកនៅទីនេះ...",
  clear: "សម្អាត",
  words: (n) => `${n} ពាក្យ`,
  needAtLeast: (n) => `ត្រូវការយ៉ាងតិច ${n} តួអក្សរ`,
  tooLong: "អត្ថបទវែងពេក",
  model: "ម៉ូដែល",
  modelMt5: "mT5-base",
  modelMt5Desc: "លឿន · គុណភាពល្អ",
  modelGemma: "Gemma-4-4B",
  modelGemmaDesc: "យឺត · គុណភាពខ្ពស់",
  format: "ទម្រង់",
  paragraph: "កថាខណ្ឌ",
  bullets: "ចំណុច",
  numBeams: "កម្រិត Beam",
  numBeamsHint: "ខ្ពស់ = គុណភាពល្អ យឺតជាង",
  maxNewTokens: "ប្រវែងអតិបរមា",
  maxNewTokensHint: "ចំនួន token អតិបរមាក្នុងការសង្ខេប",
  maxLength: "ប្រវែងអតិបរមា",
  maxLengthHint: "ចំនួន token អតិបរមាក្នុងការសង្ខេប",
  summarize: "សង្ខេប",
  distilling: "កំពុងបំបែក...",
  failed: "បរាជ័យក្នុងការសង្ខេប។ សូមព្យាយាមម្តងទៀត។",
  summary: "ការសង្ខេប",
  copy: "ចម្លង",
  copied: "បានចម្លង",
  copiedDesc: "ការសង្ខេបត្រូវបានចម្លងទៅឃ្លីបបត។",
  awaitingTitle: "កំពុងរង់ចាំអត្ថបទ",
  awaitingDesc:
    "បិទភ្ជាប់អត្ថបទរបស់អ្នក កំណត់ការកំណត់ ហើយចុចសង្ខេបដើម្បីបង្កើតកំណែសង្ខេប។",
  compressed: (pct) => `បង្រួម ${pct}%`,
  wordsArrow: (a, b) => `${a} → ${b} ពាក្យ`,
  seconds: (s) => `${s} វិនាទី`,
  textTooShortTitle: "អត្ថបទខ្លីពេក",
  textTooShortDesc: (n) => `សូមបញ្ចូលយ៉ាងតិច ${n} តួអក្សរ។`,
  textTooLongTitle: "អត្ថបទវែងពេក",
  textTooLongDesc: (n) => `សូមកំណត់អត្ថបទត្រឹម ${n} តួអក្សរ។`,
  useCasesTitle: "ល្អឥតខ្ចោះសម្រាប់ការសរសេរប្រចាំថ្ងៃ",
  research: "ឯកសារស្រាវជ្រាវ",
  researchDesc:
    "បំបែកអត្ថបទសិក្សាអរូបីទៅជាសេចក្តីសង្ខេបងាយស្រួលសម្រាប់ការពិនិត្យរហ័ស។",
  meeting: "កំណត់ត្រាប្រជុំ",
  meetingDesc: "បំលែងកំណត់ហេតុប្រជុំវែងទៅជាចំណុចសកម្មភាពច្បាស់លាស់។",
  articles: "អត្ថបទវែង",
  articlesDesc: "ទទួលបានចំណុចសំខាន់នៃសារព័ត៌មានវែងមុនពេលចំណាយពេលអានពេញ។",
  footerTagline: "ការសរសេរច្បាស់លាស់សម្រាប់មនុស្សគ្រប់រូប។",
  switchLang: "English",
  htmlTitle: "Distill — សង្ខេបអត្ថបទច្បាស់លាស់",
  htmlDesc:
    "ឧបករណ៍ស្អាតផ្តោតសម្រាប់ប្រែការសរសេរវែងទៅជាការសង្ខេបច្បាស់លាស់។",
};

const en: Dict = {
  brand: "Distill",
  heroTitleA: "Clear thoughts from",
  heroTitleB: "complex writing.",
  heroSubtitle:
    "A focused tool for editors, researchers, and writers. Paste your long-form text and distill it into its essential meaning.",
  sourceText: "Source text",
  charsOf: (n, max) => `${n} / ${max} chars`,
  placeholder: "Paste your article, research paper, or meeting notes here...",
  clear: "Clear",
  words: (n) => `${n} words`,
  needAtLeast: (n) => `Need at least ${n} characters`,
  tooLong: "Text is too long",
  model: "Model",
  modelMt5: "mT5-base",
  modelMt5Desc: "Fast · Good quality",
  modelGemma: "Gemma-4-4B",
  modelGemmaDesc: "Slow · High quality",
  format: "Format",
  paragraph: "Paragraph",
  bullets: "Bullets",
  numBeams: "Beam width",
  numBeamsHint: "Higher = better quality, slower",
  maxNewTokens: "Max length",
  maxNewTokensHint: "Maximum tokens in summary",
  maxLength: "Max length",
  maxLengthHint: "Maximum tokens in summary",
  summarize: "Summarize",
  distilling: "Distilling...",
  failed: "Failed to summarize. Please try again.",
  summary: "Summary",
  copy: "Copy",
  copied: "Copied to clipboard",
  copiedDesc: "The summary has been copied to your clipboard.",
  awaitingTitle: "Awaiting text",
  awaitingDesc:
    "Paste your text, configure the settings, and hit summarize to generate a distilled version.",
  compressed: (pct) => `${pct}% compressed`,
  wordsArrow: (a, b) => `${a} → ${b} words`,
  seconds: (s) => `${s}s`,
  textTooShortTitle: "Text too short",
  textTooShortDesc: (n) => `Please enter at least ${n} characters.`,
  textTooLongTitle: "Text too long",
  textTooLongDesc: (n) => `Please limit text to ${n} characters.`,
  useCasesTitle: "Perfect for everyday writing",
  research: "Research Papers",
  researchDesc:
    "Distill abstract academic prose into accessible summaries for quick review.",
  meeting: "Meeting Notes",
  meetingDesc: "Convert rambling meeting transcripts into actionable bullet points.",
  articles: "Long Articles",
  articlesDesc: "Get the gist of long-form journalism before committing to the full read.",
  footerTagline: "Clear writing for everyone.",
  switchLang: "ខ្មែរ",
  htmlTitle: "Distill — Clear, focused text summarization",
  htmlDesc: "A clean, focused tool for turning long writing into clear summaries.",
};

const dicts: Record<Locale, Dict> = { km, en };

const STORAGE_KEY = "distill.locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return "km";
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "km" ? (stored as Locale) : "km";
  });

  useEffect(() => {
    const html = document.documentElement;
    html.lang = locale;
    html.setAttribute("data-locale", locale);
    document.title = dicts[locale].htmlTitle;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", dicts[locale].htmlDesc);
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  const setLocale = (l: Locale) => setLocaleState(l);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t: dicts[locale] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
