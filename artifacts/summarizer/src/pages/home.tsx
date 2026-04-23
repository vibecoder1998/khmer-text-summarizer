import { useState, useRef, useEffect } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSummarizeText } from "@workspace/api-client-react";
import { SummarizeRequestLength, SummarizeRequestFormat, SummarizeRequestTone } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Trash2, ArrowRight, Loader2, CheckCircle2, ChevronRight, Type, AlignLeft, Sparkles, Clock, HardDrive, FileText, SplitSquareHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MIN_CHARS = 50;
const MAX_CHARS = 50000;

export default function Home() {
  const { toast } = useToast();
  
  const [text, setText] = useState("");
  const [length, setLength] = useState<SummarizeRequestLength>("medium");
  const [format, setFormat] = useState<SummarizeRequestFormat>("paragraph");
  const [tone, setTone] = useState<SummarizeRequestTone>("neutral");
  
  const { mutate: summarize, data: result, isPending, error } = useSummarizeText();

  const handleSummarize = () => {
    if (text.length < MIN_CHARS) {
      toast({
        title: "Text too short",
        description: `Please enter at least ${MIN_CHARS} characters.`,
        variant: "destructive",
      });
      return;
    }
    if (text.length > MAX_CHARS) {
      toast({
        title: "Text too long",
        description: `Please limit text to ${MAX_CHARS} characters.`,
        variant: "destructive",
      });
      return;
    }
    
    summarize({ data: { text, length, format, tone } });
  };

  const handleCopy = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      toast({
        title: "Copied to clipboard",
        description: "The summary has been copied to your clipboard.",
      });
    }
  };

  const handleClear = () => {
    setText("");
  };

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  
  const isOverLimit = charCount > MAX_CHARS;
  const isUnderLimit = charCount > 0 && charCount < MIN_CHARS;
  
  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary selection:text-primary-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
              <SplitSquareHorizontal className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-serif font-semibold tracking-tight">Distill</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl flex flex-col gap-8">
        
        {/* Hero Section */}
        <div className="flex flex-col items-center text-center space-y-4 py-8 md:py-12">
          <h2 className="text-4xl md:text-5xl font-serif font-bold tracking-tight text-foreground max-w-2xl">
            Clear thoughts from <br className="hidden md:inline"/> complex writing.
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            A focused tool for editors, researchers, and writers. Paste your long-form text and distill it into its essential meaning.
          </p>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-8 items-start">
          
          {/* Input Pane */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground flex justify-between">
                <span>Source text</span>
                <span className={`text-xs ${isOverLimit ? 'text-destructive font-bold' : isUnderLimit ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} chars
                </span>
              </label>
              <div className="relative group">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your article, research paper, or meeting notes here..."
                  className={`min-h-[400px] lg:min-h-[500px] resize-y p-6 text-base leading-relaxed bg-card text-card-foreground shadow-sm transition-all border ${isOverLimit ? 'border-destructive focus-visible:ring-destructive' : 'focus-visible:ring-primary'}`}
                />
                {text.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClear}
                    className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Clear text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {/* Input Footer */}
            <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
              <span>{wordCount.toLocaleString()} words</span>
              {isUnderLimit && <span className="text-destructive">Need at least {MIN_CHARS} characters</span>}
              {isOverLimit && <span className="text-destructive">Text is too long</span>}
            </div>
          </div>

          {/* Controls - Middle Column on Desktop, Stacked on Mobile */}
          <div className="flex flex-col gap-6 lg:pt-10 lg:w-[220px]">
            {/* Controls Card */}
            <Card className="p-5 flex flex-col gap-6 shadow-sm border-border">
              
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5" /> Length
                </label>
                <div className="flex bg-muted/50 p-1 rounded-md border border-border/50">
                  {(["short", "medium", "long"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setLength(opt)}
                      className={`flex-1 text-xs py-1.5 px-2 rounded capitalize font-medium transition-all ${length === opt ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5" /> Format
                </label>
                <div className="flex bg-muted/50 p-1 rounded-md border border-border/50">
                  {(["paragraph", "bullets"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFormat(opt)}
                      className={`flex-1 text-xs py-1.5 px-2 rounded capitalize font-medium transition-all ${format === opt ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Tone
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(["neutral", "formal", "casual", "academic"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setTone(opt)}
                      className={`text-xs py-1.5 px-3 rounded-full capitalize font-medium transition-all border ${tone === opt ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

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
                  Distilling...
                </>
              ) : (
                <>
                  Summarize <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                Failed to summarize. Please try again.
              </div>
            )}
          </div>

          {/* Output Pane */}
          <div className="flex flex-col gap-4 h-full">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-foreground">Summary</label>
              {result && !isPending && (
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleCopy}>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Copy</span>
                </Button>
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
                    
                    {/* Metadata Footer */}
                    <div className="p-4 border-t border-border/50 bg-muted/20 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground rounded-b-md">
                      <div className="flex items-center gap-1.5" title="Compression ratio">
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>{(result.compressionRatio * 100).toFixed(0)}% compressed</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Word count reduction">
                        <FileText className="w-3.5 h-3.5" />
                        <span>{result.sourceWordCount} &rarr; {result.summaryWordCount} words</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Time taken">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{(result.durationMs / 1000).toFixed(1)}s</span>
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
                        <p className="font-medium text-foreground mb-1">Awaiting text</p>
                        <p className="text-sm leading-relaxed">
                          Paste your text, configure the settings, and hit summarize to generate a distilled version.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Use Cases Section */}
        <section className="mt-12 py-12 border-t border-border/40">
          <div className="max-w-3xl mx-auto">
            <h3 className="font-serif text-2xl font-semibold mb-8 text-center">Perfect for everyday writing</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2 p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="font-medium">Research Papers</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">Distill abstract academic prose into accessible summaries for quick review.</p>
              </div>
              <div className="space-y-2 p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                <div className="w-8 h-8 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <h4 className="font-medium">Meeting Notes</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">Convert rambling meeting transcripts into actionable bullet points.</p>
              </div>
              <div className="space-y-2 p-4 rounded-lg bg-card border border-border/50 shadow-sm">
                <div className="w-8 h-8 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                  <Type className="w-4 h-4" />
                </div>
                <h4 className="font-medium">Long Articles</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">Get the gist of long-form journalism before committing to the full read.</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-border/40 bg-card/30">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <SplitSquareHorizontal className="w-4 h-4" />
            <span className="font-medium">Distill</span>
          </div>
          <p>© {new Date().getFullYear()} Distill. Clear writing for everyone.</p>
        </div>
      </footer>
    </div>
  );
}
