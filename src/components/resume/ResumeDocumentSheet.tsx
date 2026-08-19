import type { FormattedResumeDocument } from "@/lib/interview/resume-formatter";

type ResumeDocumentSheetProps = {
  doc: FormattedResumeDocument;
  className?: string;
};

export default function ResumeDocumentSheet({ doc, className = "" }: ResumeDocumentSheetProps) {
  return (
    <div
      id="resume-document-sheet"
      className={`mx-auto w-full max-w-4xl rounded-xl border border-zinc-200 bg-white px-6 py-5 sm:px-10 sm:py-6 text-zinc-800 shadow-xl transition-all ${className}`}
    >
      {/* Document Header */}
      <div className="text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl md:text-4xl">
          {doc.name}
        </h1>
        {doc.contactLines.length > 0 ? (
          <p className="mt-1 text-xs font-normal text-zinc-600 sm:text-[13px]">
            {doc.contactLines.join("  |  ")}
          </p>
        ) : null}
      </div>

      {/* Summary if present */}
      {doc.summary ? (
        <div className="mt-3">
          <h3 className="border-b border-zinc-200 pb-0.5 text-xs font-bold uppercase tracking-[0.08em] text-zinc-900">
            Professional Summary
          </h3>
          <p className="mt-1.5 text-xs leading-snug text-zinc-700 sm:text-[13px]">
            {doc.summary}
          </p>
        </div>
      ) : null}

      {/* Parsed Sections */}
      {doc.sections.length > 0 ? (
        <div className="mt-3 space-y-2">
          {doc.sections.map((sec, secIdx) => (
            <section key={`${sec.title}-${secIdx}`}>
              <h3 className="border-b border-zinc-200 pb-0.5 text-xs font-bold uppercase tracking-[0.08em] text-zinc-900">
                {sec.title}
              </h3>

              {/* Specialized view for Skill Categories */}
              {sec.skillCategories && sec.skillCategories.length > 0 ? (
                <div className="mt-1.5 space-y-0.5 text-xs sm:text-[13px]">
                  {sec.skillCategories.map((cat, catIdx) => (
                    <div key={catIdx} className="leading-snug">
                      <span className="font-semibold text-zinc-900">{cat.category}: </span>
                      <span className="text-zinc-700">{cat.skills}</span>
                    </div>
                  ))}
                </div>
              ) : null}

              {sec.items.length > 0 ? (
                <div className="mt-1.5 space-y-1.5">
                  {sec.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="text-xs sm:text-[13px]">
                      {item.heading || item.date ? (
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          {item.heading ? (
                            <p className="font-semibold text-zinc-950">{item.heading}</p>
                          ) : null}
                          {item.date ? (
                            <span className="text-xs font-medium text-zinc-500">{item.date}</span>
                          ) : null}
                        </div>
                      ) : null}
                      {item.subtitle ? (
                        <p className="mt-0 italic text-zinc-600">{item.subtitle}</p>
                      ) : null}
                      {item.text ? (
                        <p className="mt-0.5 text-zinc-700">{item.text}</p>
                      ) : null}
                      {item.bullets.length > 0 ? (
                        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-zinc-700">
                          {item.bullets.map((bullet, bIdx) => (
                            <li key={bIdx} className="leading-snug">
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      ) : (
        /* Fallback if sections were not recognized */
        <div className="mt-5 whitespace-pre-wrap text-xs leading-relaxed text-zinc-700 sm:text-[13px]">
          {doc.plainText || doc.rawText}
        </div>
      )}
    </div>
  );
}
