// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchableDropdown from "./SearchableDropdown";

describe("SearchableDropdown", () => {
  afterEach(cleanup);

  it("uses a native select when only listed values are accepted", () => {
    const onChange = vi.fn();

    render(
      <SearchableDropdown
        label="Company"
        value=""
        onChange={onChange}
        options={["General", "Google"]}
        allowCustomValue={false}
      />,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Company" }), {
      target: { value: "Google" },
    });

    expect(onChange).toHaveBeenCalledWith("Google");
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
