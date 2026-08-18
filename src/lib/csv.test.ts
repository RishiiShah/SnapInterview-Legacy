import { describe, expect, it } from "vitest";

import { parseCsvRecords } from "./csv";

describe("parseCsvRecords", () => {
  it("parses quoted commas, multiline fields, escaped quotes, and CRLF", () => {
    expect(
      parseCsvRecords(
        "name,answer\r\n"
          + '"Smith, Jane","line one\nline two"\r\n'
          + '"He said ""hello""",done\r\n',
      ),
    ).toEqual([
      ["name", "answer"],
      ["Smith, Jane", "line one\nline two"],
      ['He said "hello"', "done"],
    ]);
  });

  it("drops all-blank records and retains a final record without a newline", () => {
    expect(parseCsvRecords("a,b\n\n,,\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns no records for empty or blank input", () => {
    expect(parseCsvRecords("")).toEqual([]);
    expect(parseCsvRecords("\n\r\n")).toEqual([]);
    expect(parseCsvRecords("  , \t")).toEqual([]);
  });

  it("preserves field whitespace", () => {
    expect(parseCsvRecords(" left ,\tright \n")).toEqual([[" left ", "\tright "]]);
  });

  it("tolerates an unterminated quoted field", () => {
    expect(parseCsvRecords('name,answer\nquestion,"unfinished\nanswer')).toEqual([
      ["name", "answer"],
      ["question", "unfinished\nanswer"],
    ]);
  });
});
