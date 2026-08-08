/**
 * LandingAtmosphere — continuous atmospheric midnight glow & starry ambient field.
 * Matches the painterly starry night theme of the hero section across the full page scroll.
 */
export default function LandingAtmosphere() {
  return (
    <div
      className="landing-atmosphere pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Top-left midnight indigo nebula wash */}
      <div className="absolute -left-[15%] top-[10%] h-[800px] w-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(37,99,235,0.08)_0%,transparent_70%)] blur-[120px]" />

      {/* Mid-page cyan moonlight glow */}
      <div className="absolute -right-[15%] top-[35%] h-[900px] w-[900px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.06)_0%,transparent_70%)] blur-[140px]" />

      {/* Lower section deep purple & blue ambient glow */}
      <div className="absolute left-[20%] top-[65%] h-[850px] w-[850px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.06)_0%,transparent_70%)] blur-[130px]" />

      {/* Bottom section starlight wash */}
      <div className="absolute -right-[10%] top-[85%] h-[750px] w-[750px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.07)_0%,transparent_70%)] blur-[120px]" />

      {/* Subtle starlight grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  );
}
