import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { useSummarizeText } from "@workspace/api-client-react";
import { SummarizeRequestModel, SummarizeRequestFormat } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Trash2, ArrowRight, Loader2, Type, AlignLeft, Sparkles, Clock, HardDrive, FileText, SplitSquareHorizontal, Cpu, Zap, Download, Share2, Gem } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { InputSource, type InputMode } from "@/components/input-source";
import { HistoryPanel } from "@/components/history-panel";
import { useHistory, type HistoryItem } from "@/lib/history";

const MIN_CHARS = 50;
const MAX_CHARS = 50000;

export default function Home() {
  const { toast } = useToast();
  const { t } = useI18n();

  const [text, setText] = useState("");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [model, setModel] = useState<SummarizeRequestModel>("mt5-base");
  const [format, setFormat] = useState<SummarizeRequestFormat>("paragraph");
  const [length, setLength] = useState<"short" | "long">("short");
  const [summarizeType, setSummarizeType] = useState<"general" | "meeting-minutes">("general");
  const [numBeams, setNumBeams] = useState<number>(4);
  const [maxNewTokens, setMaxNewTokens] = useState<number>(256);
  const [maxLength, setMaxLength] = useState<number>(512);

  const { mutate: summarize, data: result, isPending, error } = useSummarizeText();
  const { add: addHistory } = useHistory();
  const lastSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!result?.summary) return;
    const key = `${result.summary}-${result.model}-${result.durationMs}`;
    if (lastSavedRef.current === key) return;
    lastSavedRef.current = key;
    addHistory({
      sourceText: text,
      summary: result.summary,
      format: result.format,
      model: result.model,
      sourceWordCount: result.sourceWordCount,
      summaryWordCount: result.summaryWordCount,
      compressionRatio: result.compressionRatio,
      durationMs: result.durationMs,
    });
  }, [result, addHistory, text]);

  const handleSummarize = () => {
    if (text.length < MIN_CHARS) {
      toast({
        title: t.textTooShortTitle,
        description: t.textTooShortDesc(MIN_CHARS),
        variant: "destructive",
      });
      return;
    }
    if (text.length > MAX_CHARS) {
      toast({
        title: t.textTooLongTitle,
        description: t.textTooLongDesc(MAX_CHARS),
        variant: "destructive",
      });
      return;
    }

    if (model === "mt5-base") {
      summarize({ data: { text, model, format, numBeams, maxNewTokens } });
    } else if (model === "gemma-4-4b") {
      summarize({ data: { text, model, format, length, summarizeType, maxLength } });
    } else {
      summarize({ data: { text, model, format, length, summarizeType } });
    }
  };

  const handleCopy = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      toast({ title: t.copied, description: t.copiedDesc });
    }
  };

  const handleDownload = () => {
    if (!result?.summary) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const blob = new Blob([result.summary], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khlim-summary-${stamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: t.downloaded, description: t.downloadedDesc });
  };

  const handleShare = async () => {
    if (!result?.summary) return;
    const data = { title: t.shareTitle, text: result.summary };
    try {
      if (typeof navigator !== "undefined" && "share" in navigator && (navigator as Navigator).canShare?.(data) !== false) {
        await (navigator as Navigator).share(data);
        toast({ title: t.shared, description: t.sharedDesc });
        return;
      }
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(result.summary);
      toast({ title: t.copied, description: t.copiedDesc });
    } catch {
      toast({ title: t.failed, variant: "destructive" });
    }
  };

  const handleRestore = (item: HistoryItem) => {
    setText(item.sourceText);
    setInputMode("text");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleClear = () => setText("");

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isOverLimit = charCount > MAX_CHARS;
  const isUnderLimit = charCount > 0 && charCount < MIN_CHARS;

  const formatLabels: Record<SummarizeRequestFormat, string> = {
    paragraph: t.paragraph, bullets: t.bullets,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <SplitSquareHorizontal className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-serif font-semibold tracking-tight">{t.brand}</h1>
          </div>
          <div className="flex items-center gap-1">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl flex flex-col gap-8">
        <div className="flex flex-col items-center text-center space-y-4 py-8 md:py-12">
          <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground max-w-3xl leading-tight">
            {t.heroTitleA} <br className="hidden md:inline"/> {t.heroTitleB}
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            {t.heroSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-8 items-start">
          <div className="flex flex-col gap-4">
            <InputSource
              mode={inputMode}
              onModeChange={setInputMode}
              onTextExtracted={(extracted) => setText(extracted)}
            />

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground flex justify-between">
                <span>{t.sourceText}</span>
                <span className={`text-xs ${isOverLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                  {t.charsOf(charCount.toLocaleString(), MAX_CHARS.toLocaleString())}
                </span>
              </label>
              <div className="relative group">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t.placeholder}
                  className={`min-h-[360px] lg:min-h-[440px] resize-y p-6 text-base leading-relaxed bg-card text-card-foreground shadow-sm transition-all border ${isOverLimit ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
                />
                {text.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title={t.clear}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
              <span>{t.words(wordCount.toLocaleString())}</span>
              {isUnderLimit && <span className="text-destructive">{t.needAtLeast(MIN_CHARS)}</span>}
              {isOverLimit && <span className="text-destructive">{t.tooLong}</span>}
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:pt-10 lg:w-[260px]">
            <Card className="p-5 flex flex-col gap-6 shadow-sm border-border">
              {/* Model */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> {t.model}
                </label>
                <div className="flex flex-col gap-1.5">
                  {([
                    { id: "mt5-base", label: t.modelMt5, desc: t.modelMt5Desc, icon: <Zap className="w-3.5 h-3.5" /> },
                    { id: "gemma-4-4b", label: t.modelGemma, desc: t.modelGemmaDesc, icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { id: "gemini", label: t.modelGemini, desc: t.modelGeminiDesc, icon: <Gem className="w-3.5 h-3.5" /> },
                  ] as const).map(({ id, label, desc, icon }) => {
                    const active = model === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setModel(id)}
                        className={`text-left p-2.5 rounded-md border transition-all ${active ? 'bg-primary/5 border-primary text-foreground' : 'bg-background border-border hover:border-foreground/20'}`}
                      >
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <span className={active ? 'text-primary' : 'text-muted-foreground'}>{icon}</span>
                          <span>{label}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 ml-5">{desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Format — all models */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> {t.format}
                </label>
                <div className="flex bg-muted/50 p-1 rounded-md border border-border/50">
                  {(["paragraph", "bullets"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFormat(opt)}
                      className={`flex-1 text-xs py-1.5 px-2 rounded font-medium transition-all ${format === opt ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    >
                      {formatLabels[opt]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Length + Type — Gemma & Gemini */}
              {(model === "gemma-4-4b" || model === "gemini") && (
                <>
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5" /> {t.length}
                    </label>
                    <div className="flex bg-muted/50 p-1 rounded-md border border-border/50">
                      {(["short", "long"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setLength(opt)}
                          className={`flex-1 text-xs py-1.5 px-2 rounded font-medium transition-all ${length === opt ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        >
                          {opt === "short" ? t.lengthShort : t.lengthLong}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> {t.summarizeType}
                    </label>
                    <div className="flex bg-muted/50 p-1 rounded-md border border-border/50">
                      {(["general", "meeting-minutes"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSummarizeType(opt)}
                          className={`flex-1 text-xs py-1.5 px-2 rounded font-medium transition-all ${summarizeType === opt ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                        >
                          {opt === "general" ? t.typeGeneral : t.typeMeeting}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* mT5-only params */}
              {model === "mt5-base" && (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <AlignLeft className="w-3.5 h-3.5" /> {t.numBeams}
                      </span>
                      <span className="text-foreground font-mono normal-case tracking-normal">{numBeams}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={8}
                      step={1}
                      value={numBeams}
                      onChange={(e) => setNumBeams(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <p className="text-[11px] text-muted-foreground leading-tight">{t.numBeamsHint}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between gap-1.5">
                      <span className="flex items-center gap-1.5">
                        <AlignLeft className="w-3.5 h-3.5" /> {t.maxNewTokens}
                      </span>
                      <span className="text-foreground font-mono normal-case tracking-normal">{maxNewTokens}</span>
                    </label>
                    <input
                      type="range"
                      min={32}
                      max={1024}
                      step={32}
                      value={maxNewTokens}
                      onChange={(e) => setMaxNewTokens(Number(e.target.value))}
                      className="w-full accent-primary"
                    />
                    <p className="text-[11px] text-muted-foreground leading-tight">{t.maxNewTokensHint}</p>
                  </div>
                </>
              )}

              {/* Gemma-only params */}
              {model === "gemma-4-4b" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between gap-1.5">
                    <span className="flex items-center gap-1.5">
                      <AlignLeft className="w-3.5 h-3.5" /> {t.maxLength}
                    </span>
                    <span className="text-foreground font-mono normal-case tracking-normal">{maxLength}</span>
                  </label>
                  <input
                    type="range"
                    min={64}
                    max={1024}
                    step={32}
                    value={maxLength}
                    onChange={(e) => setMaxLength(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-[11px] text-muted-foreground leading-tight">{t.maxLengthHint}</p>
                </div>
              )}
            </Card>

            <Button
              size="lg"
              className="w-full shadow-md text-base h-12 font-medium"
              onClick={handleSummarize}
              disabled={isPending || charCount < MIN_CHARS || charCount > MAX_CHARS}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.distilling}
                </>
              ) : (
                <>
                  {t.summarize} <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                {t.failed}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">{t.summary}</label>
              {result && !isPending && (
                <div className="flex items-center gap-0.5">
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleCopy} title={t.copy}>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium hidden sm:inline">{t.copy}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleDownload} title={t.download}>
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium hidden sm:inline">{t.download}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleShare} title={t.share}>
                    <Share2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium hidden sm:inline">{t.share}</span>
                  </Button>
                </div>
              )}
            </div>

            <div className="relative flex-1 min-h-[400px] lg:min-h-[500px]">
              <AnimatePresence mode="wait">
                {isPending ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-card rounded-md border border-border shadow-sm p-6 overflow-hidden flex flex-col gap-4"
                  >
                    <Skeleton className="h-6 w-3/4 rounded-sm" />
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-5/6 rounded-sm" />
                    <div className="mt-4 flex flex-col gap-4">
                      <Skeleton className="h-4 w-full rounded-sm" />
                      <Skeleton className="h-4 w-4/5 rounded-sm" />
                    </div>
                  </motion.div>
                ) : result ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute inset-0 bg-card rounded-md border border-border shadow-sm flex flex-col"
                  >
                    <div className="p-6 flex-1 overflow-y-auto prose dark:prose-invert prose-p:leading-relaxed prose-li:leading-relaxed max-w-none text-card-foreground">
                      {result.format === "bullets" ? (
                        <ul className="space-y-2 mt-0">
                          {result.summary.split('\n').filter(line => line.trim()).map((line, i) => (
                            <li key={i}>{line.replace(/^[-*•]\s*/, '')}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="whitespace-pre-wrap mt-0 text-base">{result.summary}</p>
                      )}
                    </div>

                    <div className="p-4 border-t border-border/50 bg-muted/20 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground rounded-b-md">
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>{t.compressed((result.compressionRatio * 100).toFixed(0))}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{t.wordsArrow(result.sourceWordCount, result.summaryWordCount)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{t.seconds((result.durationMs / 1000).toFixed(1))}</span>
                      </div>
                      <div className="ml-auto font-mono text-[10px] bg-background border border-border px-2 py-0.5 rounded text-muted-foreground">
                        {result.model}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-card/50 rounded-md border border-dashed border-border/60 flex items-center justify-center p-8 text-center"
                  >
                    <div className="flex flex-col items-center gap-4 max-w-xs text-muted-foreground">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-muted-foreground/70" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">{t.awaitingTitle}</p>
                        <p className="text-sm leading-relaxed">{t.awaitingDesc}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <HistoryPanel onRestore={handleRestore} />

        <section className="mt-12 py-12 border-t border-border/40">
          <div className="max-w-3xl mx-auto">
            <h3 className="font-serif text-2xl font-semibold mb-8 text-center">{t.useCasesTitle}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2 p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-medium">{t.research}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.researchDesc}</p>
              </div>
              <div className="space-y-2 p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                <div className="w-8 h-8 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <h4 className="font-medium">{t.meeting}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.meetingDesc}</p>
              </div>
              <div className="space-y-2 p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                <div className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <Type className="w-4 h-4" />
                </div>
                <h4 className="font-medium">{t.articles}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.articlesDesc}</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t border-border/40 bg-card/30">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <SplitSquareHorizontal className="w-4 h-4" />
            <span className="font-medium">{t.brand}</span>
          </div>
          <p>© {new Date().getFullYear()} {t.brand}. {t.footerTagline}</p>
        </div>
      </footer>
    </div>
  );
}
