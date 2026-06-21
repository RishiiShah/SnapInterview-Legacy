export type CodingChallengeTestCase = {
  input: string;
  expectedOutput: string;
  isHidden: boolean;
};

export type CodingChallenge = {
  starterCode: Record<string, string>;
  testCases: CodingChallengeTestCase[];
};

type ParseResult = {
  challenge: CodingChallenge;
  displayText: string;
};

const FENCE_RE = /```coding-challenge\n([\s\S]*?)\n```/;

export function parseCodingChallenge(text: string): ParseResult | null {
  const match = FENCE_RE.exec(text);
  if (!match) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("starterCode" in parsed) ||
    !("testCases" in parsed)
  ) {
    return null;
  }

  const { starterCode, testCases } = parsed as {
    starterCode: unknown;
    testCases: unknown;
  };

  if (
    typeof starterCode !== "object" ||
    starterCode === null ||
    !Array.isArray(testCases)
  ) {
    return null;
  }

  const displayText = text.replace(FENCE_RE, "").trim();

  return {
    challenge: {
      starterCode: starterCode as Record<string, string>,
      testCases: testCases as CodingChallengeTestCase[],
    },
    displayText,
  };
}
