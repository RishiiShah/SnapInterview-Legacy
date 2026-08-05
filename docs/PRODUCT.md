# SnapInterview product reference

## Purpose

SnapInterview helps people prepare for interviews through realistic rehearsal and focused practice. It combines a configurable AI interview, voice and video capture, recordings, transcripts, automated feedback, question practice, and progress-oriented dashboard views.

## People and moment of use

The product serves candidates preparing for software, product, design, data, and related roles. They typically use it before a specific hiring loop or as a repeatable practice habit. They may provide a resume and job description to make the practice session more relevant.

## Current capabilities

- Create mock interviews across recruiter-screen, behavioral/leadership, coding/algorithms, system-design, domain/role-specific, take-home, hiring-manager, and bar-raiser formats.
- Adjust role, company, difficulty, interviewer persona, and session length; use resume and job-description context when supplied.
- Speak with a streamed AI interviewer, with browser speech recognition where supported and browser-first speech synthesis with a server fallback.
- Record a session, review its transcript and evaluation, manage recordings, and create revocable share links.
- Practice behavioral, technical, system-design, and leadership questions outside a full interview. A separate Coding concepts section presents read-only JavaScript previews and public sample cases; execution, grading, submission, and solved progress are not part of this demo.
- Track activity through dashboard analytics, use search, manage account and notification preferences, and complete onboarding.
- Provide separate administrative surfaces for Q&A questions, conceptual coding content, and interview operations.

## Product boundaries

- SnapInterview is practice software, not a hiring system and not a claim of job placement.
- Web Speech API availability and behavior depend on the browser. Do not imply universal speech recognition support or fully local transcription.
- Evaluation is automated guidance, not a hiring verdict or a promise of accuracy.
- Recordings are uploaded to configured private S3 storage through signed browser requests.
- Do not invent testimonials, customers, performance statistics, pricing, or capabilities that are not present in the product.

## Product principles

- Make the first path to practice obvious.
- Make interview context specific enough to feel relevant to a candidate's target role.
- Let candidates improve both answer content and on-camera delivery through replay.
- Keep focused practice and complete mock interviews part of the same preparation journey.
- Use direct, supportive language and show the real product rather than unsupported claims.
- Preserve accessible keyboard navigation, visible focus treatment, readable contrast, and reduced-motion behavior.

## Experience map

```text
Landing → sign up or sign in → onboarding → dashboard
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
          Start an interview    Practice questions     Review progress
                 │                    │                    │
                 ▼                    ▼                    ▼
          Voice/video session   Answer or preview     Analytics/recordings
                 │
                 ▼
          Transcript, evaluation, replay, optional share link
```

## Content and brand guardrails

Use the SnapInterview name and the established logo asset. The product voice is clear, credible, calm, and encouraging. Marketing and interface copy should describe actual practice, recordings, feedback, and preparation rather than promising outcomes.
