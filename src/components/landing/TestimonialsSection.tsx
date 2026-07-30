import { ShieldCheck, Star, Trophy, Users, Zap } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "SnapInterview's AI follow-up questions felt so close to my actual Meta system design loop that I didn't get caught off guard once.",
    author: "Alex Rivera",
    role: "Senior Software Engineer",
    company: "L5 Offer @ Meta",
    avatar: "AR",
    rating: 5,
  },
  {
    quote: "Being able to watch my video replay next to the exact transcript opened my eyes to how often I rambled under pressure. Worth every second.",
    author: "Priya Sharma",
    role: "Product Manager",
    company: "Offer @ Stripe",
    avatar: "PS",
    rating: 5,
  },
  {
    quote: "The rubric scores on technical depth gave me objective numbers to target instead of just guessing if my answers were good enough.",
    author: "David Chen",
    role: "Staff Infrastructure Engineer",
    company: "Offer @ Google",
    avatar: "DC",
    rating: 5,
  },
];

const METRICS = [
  { value: "10,000+", label: "Mock Sessions Completed", icon: Zap },
  { value: "94%", label: "Candidate Confidence Increase", icon: Trophy },
  { value: "28+", label: "Specialized Career Tracks", icon: Users },
  { value: "4.9 / 5", label: "Average Candidate Rating", icon: Star },
];

export default function TestimonialsSection() {
  return (
    <section className="landing-section py-24 relative z-10">
      <div className="landing-container">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#60A5FA]">
            <Trophy className="h-3.5 w-3.5 text-blue-400" />
            Candidate Success Stories
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            Tested by candidates at top tech companies
          </h2>
          <p className="mt-3.5 max-w-xl text-base leading-relaxed text-[#94A3B8]">
            Hear from engineers and product managers who used SnapInterview to turn anxiety into quiet confidence.
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-16">
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="rounded-2xl border border-white/10 bg-[#0B0D18]/60 p-6 backdrop-blur-2xl text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="block text-3xl font-black text-white">{m.value}</span>
                <span className="block text-xs font-medium text-[#94A3B8] mt-1">{m.label}</span>
              </div>
            );
          })}
        </div>

        {/* Testimonials Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div
              key={t.author}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-[#0B0D18]/60 p-7 backdrop-blur-2xl transition-all duration-300 hover:border-white/20 hover:bg-[#0B0D18]"
            >
              <div>
                <div className="flex gap-1 text-amber-400 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-[#CBD5E1] italic">
                  "{t.quote}"
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-white/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-xs text-white">
                  {t.avatar}
                </div>
                <div>
                  <span className="block text-sm font-bold text-white">{t.author}</span>
                  <span className="block text-xs text-[#94A3B8]">{t.role}</span>
                  <span className="block text-[0.7rem] font-medium text-emerald-400 mt-0.5">{t.company}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
