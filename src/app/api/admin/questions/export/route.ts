import { NextResponse } from "next/server";

import { getAdminSessionOrNull } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | null | undefined) {
  let safe = String(value ?? "");
  // Neutralize spreadsheet formula injection: a leading =, +, -, @, or control
  // character can make Excel/Sheets execute the cell as a formula on open.
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes('"') || safe.includes(",") || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export async function GET(request: Request) {
  const session = await getAdminSessionOrNull();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";

  const questions = await prisma.practiceQuestion.findMany({
    orderBy: { id: "asc" },
    select: {
      slug: true,
      text: true,
      category: true,
      difficulty: true,
      estimatedTime: true,
      tags: true,
      hint: true,
      sampleAnswer: true,
      updatedAt: true,
    },
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify(questions, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="practice-questions-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  const header = [
    "slug",
    "text",
    "category",
    "difficulty",
    "estimatedTime",
    "tags",
    "hint",
    "sampleAnswer",
    "updatedAt",
  ];

  const rows = questions.map((q) =>
    [
      q.slug,
      q.text,
      q.category,
      q.difficulty,
      q.estimatedTime ?? "",
      q.tags.join(", "),
      q.hint ?? "",
      q.sampleAnswer ?? "",
      q.updatedAt.toISOString(),
    ]
      .map((value) => csvCell(value))
      .join(","),
  );

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="practice-questions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

