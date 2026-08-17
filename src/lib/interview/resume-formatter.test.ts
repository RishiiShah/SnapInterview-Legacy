import { describe, expect, it } from "vitest";
import { parseResumeDocument } from "./resume-formatter";

describe("parseResumeDocument", () => {
  it("handles empty or blank string gracefully", () => {
    const doc = parseResumeDocument("", "Alex Rivera");
    expect(doc.name).toBe("Alex Rivera");
    expect(doc.sections).toHaveLength(0);
    expect(doc.wordCount).toBe(0);
    expect(doc.charCount).toBe(0);
  });

  it("parses real resume accurately matching projects, experience, and achievements", () => {
    const raw = `Hitanshu R. Oza
New Brunswick, NJ | hitanshu.oza@rutgers.edu | +1 (820)-208-7960 | linkedin.com/in/hitanshu | github.com/hitanshu

EDUCATION
Rutgers University – New Brunswick, New Jersey, USA September 2025 –Present
Master of Science (MS) in Computer Science, CGPA: 3.83/4.0

Atharva College of Engineering – University of Mumbai, Mumbai, India August 2020 – May 2024
Bachelor of Engineering (BE) in Information Technology, CGPA: 9.5/10.0

TECHNICAL SKILLS
● Programming Languages: Python, PHP, C, C++, Java, Dart, Verilog.
● Web and Database Tech: HTML, CSS, JavaScript, TypeScript, Laravel, SQL, MongoDB, Node.js, React.js, Angular, Django, Flask, REST.
● Others: AWS, Docker, Android, Spark, Unity, Vuforia, Unix, Bash, IOT, CoppeliaSim, GIT, CI/CD.

EXPERIENCE
Office of Information Technology, Rutgers University, New Brunswick, New Jersey September 2025 – Present
App Developer - Student Worker (Flutter)
● Working on handling access management for various user roles for the university's mobile application.
● Improving UI and data consistency for different widgets.

PROJECTS
Agency Kinetics – MongoDB, Express, React, Node
● Built a client portal software for digital agencies using the MERN stack and Material UI, enhancing client management.
● Implemented role-based access with tailored dashboards for admins, superadmins, assignees, and project managers.
● Enabled creation and management of services, orders, and tasks with customizable statuses and priorities.
● Developed features for generating invoices, raising support tickets, and inviting users with designated roles.
● Integrated Stripe for invoice and subscription payments and connecting accounts.

Pharma Bot - Python, OpenCV, Robotics, Simulation, RaspberryPi.
● Developed a Pharma Bot as part of the e-Yantra Robotics Competition 2022–23 (IIT Bombay), simulating a smart city environment with shops containing up to four medicines of different colors, along with traffic signals and barricades.
● Programmed the bot to activate, scan, and deactivate QR codes at shops to retrieve medicine details such as color, shape, and drop-off destination, enabling autonomous decision-making.
● Implemented line following and A* path-planning for navigation, integrated LED indicators for medicine pickup and drop-off status, and used an overhead camera with ArUco marker detection to visualize the bot's execution in CoppeliaSim.

ACHIEVEMENTS / EXTRA CURRICULAR ACTIVITIES
● Semester 6 (2022-23): Ranked first in Information Technology Department with 10/10 SGPA.
● Machine Learning Lead - Google Developer Students Club (GDSC ACE 2022-23): Lead Speaker in GDSC ACE Tech Week's Machine Learning Session.
● Judge - ACE Hacks 1.0 (2024): Invited as a Judge in ACE Hacks 1.0 24 hour hackathon.
● Code Astra 2023 - IIT Bombay: Ranked 5th position in coding hackathon.
● e-Yantra Robotics Competition (eYRC 2022-23): Ranked in top 15 for the Pharma Bot Theme.
● Technical Volunteer - IEEE Techithon (2021): Created AR Education app which allows interaction with human anatomy for medical study.
-- 1 of 2 --
-- 2 of 2 --
`;

    const doc = parseResumeDocument(raw, "Candidate");
    expect(doc.name).toBe("Hitanshu R. Oza");
    expect(doc.contactLines.length).toBeGreaterThan(0);
    expect(doc.contactLines[0]).toContain("hitanshu.oza@rutgers.edu");

    // Sections
    const sectionTitles = doc.sections.map((s) => s.title);
    expect(sectionTitles).toContain("EDUCATION");
    expect(sectionTitles).toContain("TECHNICAL SKILLS");
    expect(sectionTitles).toContain("EXPERIENCE");
    expect(sectionTitles).toContain("PROJECTS");
    expect(sectionTitles).toContain("ACHIEVEMENTS / EXTRA CURRICULAR ACTIVITIES");

    // Projects: Must have exactly 2 distinct project items
    const projSec = doc.sections.find((s) => s.title === "PROJECTS");
    expect(projSec?.items.length).toBe(2);

    const proj1 = projSec?.items[0];
    expect(proj1?.heading).toBe("Agency Kinetics");
    expect(proj1?.subtitle).toBe("MongoDB, Express, React, Node");
    expect(proj1?.bullets.length).toBe(5);
    expect(proj1?.bullets[4]).toBe("Integrated Stripe for invoice and subscription payments and connecting accounts.");
    expect(proj1?.bullets[4]).not.toContain("Pharma Bot");

    const proj2 = projSec?.items[1];
    expect(proj2?.heading).toBe("Pharma Bot");
    expect(proj2?.subtitle).toBe("Python, OpenCV, Robotics, Simulation, RaspberryPi.");
    expect(proj2?.bullets.length).toBe(3);
    expect(proj2?.bullets[0]).toContain("Developed a Pharma Bot");

    // Achievements: Flat bullet list without corrupted dates
    const achSec = doc.sections.find((s) => s.title === "ACHIEVEMENTS / EXTRA CURRICULAR ACTIVITIES");
    expect(achSec?.items.length).toBe(1);
    expect(achSec?.items[0]?.bullets.length).toBe(6);
    expect(achSec?.items[0]?.bullets[0]).toBe("Semester 6 (2022-23): Ranked first in Information Technology Department with 10/10 SGPA.");
    expect(achSec?.items[0]?.bullets[0]).not.toContain("(-23)");
    expect(achSec?.items[0]?.bullets[2]).toContain("Judge - ACE Hacks 1.0 (2024)");
    expect(achSec?.items[0]?.bullets[2]).not.toContain("()");
  });
});
