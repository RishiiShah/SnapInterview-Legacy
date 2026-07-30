/**
 * LandingAtmosphere — static full-page ambient color field.
 * Uses only radial CSS gradients (no SVG waves) to avoid
 * z-index bleed that can interfere with text legibility.
 */
export default function LandingAtmosphere() {
  return (
    <div
      className="landing-atmosphere pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Primary deep navy base — handled by page bg-[#020B21] */}

      {/* Top-left: indigo/violet nebula */}
      <div className="absolute -left-[10%] -top-[5%] h-[55%] w-[55%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.14)_0%,transparent_70%)] blur-[80px]" />

      {/* Top-right: cyan accent */}
      <div className="absolute -right-[8%] top-0 h-[45%] w-[45%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,0.10)_0%,transparent_70%)] blur-[90px]" />

      {/* Mid-page subtle violet */}
      <div className="absolute left-[30%] top-[35%] h-[40%] w-[45%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.07)_0%,transparent_70%)] blur-[100px]" />

      {/* Lower section: blue depth */}
      <div className="absolute bottom-[5%] left-[10%] h-[35%] w-[50%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)] blur-[90px]" />

      {/* Very subtle grain texture overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  );
}
