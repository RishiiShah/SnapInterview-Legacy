import { Code2, Mic, FileText, BarChart3, Sparkles, Video, CheckCircle2 } from "lucide-react";

const STRENGTHS = [
  {
    badge: "Voice-First AI",
    title: "Real-time voice dialogue that listens & probes",
    desc: "Speak your answers out loud naturally. SnapInterview analyzes your spoken logic and asks adaptive follow-ups on your complexity, trade-offs, and edge cases.",
    icon: Mic,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10 border-blue-500/20",
    highlightText: "Simulates real interviewer pushback",
  },
  {
    badge: "In-Browser IDE",
    title: "Code execution with live unit test validation",
    desc: "Write solution code in JavaScript, Python, or Java with syntax highlighting, run test cases directly in your browser, and verify time complexity on the fly.",
    icon: Code2,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
    highlightText: "Instant execution & memory profiling",
  },
  {
    badge: "Video & Audio Sync",
    title: "Full recording with searchable speech transcript",
    desc: "Every mock run records your camera video and audio. Play back your session alongside an automated, word-for-word transcript to spot hesitation or filler words.",
    icon: Video,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10 border-violet-500/20",
    highlightText: "Time-synced playback & transcript",
  },
  {
    badge: "Personalized Scenarios",
    title: "Customized to your resume & target job description",
    desc: "Paste the exact job description of your upcoming interview or upload your resume to generate tailored questions matching the exact company and level.",
    icon: FileText,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    highlightText: "Targeted question generation",
  },
];

export default function ProductStrengthsSection() {
  return (
    <section id="features" className="landing-section py-24 relative z-10 bg-[#090A0F]">
      <div className="landing-container">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#60A5FA]">
            Product Strengths
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Built for realistic interview execution
          </h2>
          <p className="mt-3.5 max-w-xl text-base leading-relaxed text-[#94A3B8]">
            No static flashcards or multiple-choice quizzes. SnapInterview mirrors the actual environment of technical and behavioral interview loops.
          </p>
        </div>

        {/* 2x2 Grid of Product Strengths */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {STRENGTHS.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0C0E18]/80 p-8 backdrop-blur-2xl transition-all duration-300 hover:border-white/20 hover:bg-[#0E101D]"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`inline-flex items-center gap-2 rounded-lg border ${item.bgColor} px-3 py-1.5 text-xs font-semibold ${item.color}`}>
                      <Icon className="h-4 w-4" />
                      {item.badge}
                    </div>
                    <span className="flex items-center gap-1.5 text-[0.7rem] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {item.highlightText}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-white leading-snug">
                    {item.title}
                  </h3>

                  <p className="mt-3.5 text-sm leading-relaxed text-[#94A3B8]">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#64748B]">
                  <span>SnapInterview Core Engine</span>
                  <span className="font-mono text-blue-400">v2.4 Active</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
