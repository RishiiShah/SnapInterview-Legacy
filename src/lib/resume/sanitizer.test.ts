import { describe, expect, it } from "vitest";
import { sanitizeResumeText, stripBulletMarkers, matchSectionHeader, isTitleOrHeadingLine } from "./sanitizer";

describe("Resume Sanitizer", () => {
  it("strips bullet markers and unicode glyphs", () => {
    expect(stripBulletMarkers("●  Developed React components")).toBe("Developed React components");
    expect(stripBulletMarkers("•  ● Built a CRUD UI")).toBe("Built a CRUD UI");
    expect(stripBulletMarkers("- ▪ Others: AWS, Docker")).toBe("Others: AWS, Docker");
    expect(stripBulletMarkers("◆  Engineered real-time audio pipeline")).toBe("Engineered real-time audio pipeline");
    expect(stripBulletMarkers("►  Managed Kubernetes cluster")).toBe("Managed Kubernetes cluster");
  });

  it("identifies known section headers", () => {
    expect(matchSectionHeader("EDUCATION")).toBe("EDUCATION");
    expect(matchSectionHeader("## TECHNICAL SKILLS")).toBe("TECHNICAL SKILLS");
    expect(matchSectionHeader("EXPERIENCE")).toBe("EXPERIENCE");
    expect(matchSectionHeader("PROJECTS")).toBe("PROJECTS");
    expect(matchSectionHeader("ACHIEVEMENTS / EXTRA CURRICULAR ACTIVITIES")).toBe("ACHIEVEMENTS / EXTRA CURRICULAR ACTIVITIES");
    expect(matchSectionHeader("AWARDS & HONORS")).toBe("AWARDS & HONORS");
    expect(matchSectionHeader("CERTIFICATIONS")).toBe("CERTIFICATIONS");
  });

  it("recognizes title and heading lines accurately", () => {
    expect(isTitleOrHeadingLine("Agency Kinetics – MongoDB, Express, React, Node")).toBe(true);
    expect(isTitleOrHeadingLine("Pharma Bot - Python, OpenCV, Robotics, Simulation, RaspberryPi.")).toBe(true);
    expect(isTitleOrHeadingLine("Rutgers University – New Brunswick, NJ September 2025 – Present")).toBe(true);
    expect(isTitleOrHeadingLine("Developed a Pharma Bot as part of the competition")).toBe(false);
    expect(isTitleOrHeadingLine("Built a full-stack web application")).toBe(false);
  });

  it("never stitches project headings into previous punctuated sentences", () => {
    const raw = `PROJECTS
Agency Kinetics – MongoDB, Express, React, Node
- Integrated Stripe for invoice and subscription payments and connecting accounts.
Pharma Bot - Python, OpenCV, Robotics, Simulation, RaspberryPi.
- Developed a Pharma Bot as part of the competition.
`;
    const sanitized = sanitizeResumeText(raw);
    expect(sanitized).toContain("Integrated Stripe for invoice and subscription payments and connecting accounts.");
    expect(sanitized).toContain("Pharma Bot - Python, OpenCV, Robotics, Simulation, RaspberryPi.");
    expect(sanitized).not.toContain("connecting accounts. Pharma Bot");
  });

  it("removes page numbers and stitches broken continuation lines", () => {
    const raw = `Hitanshu R. Oza
hitanshu@example.com

EDUCATION
Rutgers University – New Brunswick
Master of Science (MS) in Computer Science

EXPERIENCE
Media.net Software Services
Web Application Developer
● Built a CRUD-based UI for customer feature mapping, enabling fine-grained permissions and role-based access control across the publisher-
side system for media service using AngularJS.
● Improved the login and access management flow by redesigning session control mechanisms and restructuring the underlying logic
following object-oriented programming (OOP) principles built in PHP-Laravel.
-- 1 of 2 --
-- 2 of 2 --
`;

    const sanitized = sanitizeResumeText(raw);
    expect(sanitized).not.toContain("●");
    expect(sanitized).not.toContain("-- 1 of 2 --");
    expect(sanitized).not.toContain("-- 2 of 2 --");
    expect(sanitized).toContain("publisher-side system for media service using AngularJS.");
    expect(sanitized).toContain("following object-oriented programming (OOP) principles built in PHP-Laravel.");
  });
});
