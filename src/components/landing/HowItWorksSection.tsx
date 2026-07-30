const steps = [
  {
    n: "01",
    title: "Tell it who you are.",
    desc: "Pick a role and level. Paste in a job description if you have one. Add your resume if you want questions that feel personal. Takes two minutes.",
  },
  {
    n: "02",
    title: "Talk. Don't type.",
    desc: "Answer on camera with your mic open. The AI listens to what you actually say and asks follow-ups accordingly. Think of it as a panel that never gets tired.",
  },
  {
    n: "03",
    title: "Find out where you lost them.",
    desc: "Watch the replay, read the transcript, check the scores. Then go again — tighter this time.",
  },
];

export default function SocialProofSection() {
  return (
    <section id="how-it-works" className="landing-section">
      <div className="landing-container">

        {/* Section header */}
        <div className="flex items-baseline gap-5 border-b border-white/[0.07] pb-6">
          <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#3D4F73]">
            02 / Process
          </span>
          <h2 className="text-[clamp(1.4rem,2.5vw,1.9rem)] font-bold tracking-tight text-[#F5F7FF]">
            Three steps. No fluff.
          </h2>
        </div>

        <div className="mt-0 grid grid-cols-1 lg:grid-cols-3">
          {steps.map((step, index) => (
            <div
              key={step.n}
              className={`group flex flex-col gap-5 p-8 ${
                index < steps.length - 1
                  ? "border-b border-white/[0.07] lg:border-b-0 lg:border-r"
                  : ""
              }`}
            >
              {/* Step number — large, decorative */}
              <span className="font-black text-[4.5rem] leading-none tracking-tighter bg-gradient-to-br from-[#4A5568] to-[#1E2A3A] bg-clip-text text-transparent select-none">
                {step.n}
              </span>

              <div>
                <h3 className="text-[1.1rem] font-bold tracking-tight text-[#F5F7FF]">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[0.9rem] leading-[1.75] text-[#6B7A96]">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* What you get — a quiet inset strip */}
        <div className="mt-2 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.07] sm:grid-cols-4">
          {[
            ["Video", "Full recording with playback"],
            ["Transcript", "Word-for-word, searchable"],
            ["Score", "3-axis automated rubric"],
            ["Next steps", "Coaching notes on what to fix"],
          ].map(([label, detail]) => (
            <div key={label} className="flex flex-col gap-1 bg-[#020B21] px-5 py-4">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-[#3D4F73]">
                {label}
              </span>
              <span className="text-[0.82rem] text-[#8E97AB]">{detail}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
