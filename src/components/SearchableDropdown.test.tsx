// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SearchableDropdown from "./SearchableDropdown";

describe("SearchableDropdown", () => {
  afterEach(cleanup);

  it("offers a request action without accepting an unlisted value", () => {
    const onChange = vi.fn();
    const onRequestOption = vi.fn();

    render(
      <SearchableDropdown
        label="Company"
        value=""
        onChange={onChange}
        options={["General", "Google"]}
        allowCustomValue={false}
        onRequestOption={onRequestOption}
      />,
    );

    fireEvent.focus(screen.getByRole("textbox"));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Acme" } });
    fireEvent.click(screen.getByRole("button", { name: /request acme/i }));

    expect(onRequestOption).toHaveBeenCalledWith("Acme");
    expect(onChange).not.toHaveBeenCalled();
  });
});
