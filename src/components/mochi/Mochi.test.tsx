import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Mochi } from "./Mochi";

afterEach(() => cleanup());

describe("Mochi SVG component", () => {
  it("mounts and renders the root SVG node", () => {
    const { container } = render(<Mochi mood="happy" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("viewBox")).toBeTruthy();
  });

  it("renders multiple animated <g> groups (motion.g compiles to <g>)", () => {
    const { container } = render(<Mochi mood="happy" />);
    const groups = container.querySelectorAll("svg g");
    // We expect at least the head/body/eyes groupings to be present.
    expect(groups.length).toBeGreaterThanOrEqual(3);
  });

  it("renders eye sclera circles for eye-tracking", () => {
    const { container } = render(<Mochi mood="happy" />);
    const circles = container.querySelectorAll("svg circle");
    expect(circles.length).toBeGreaterThan(0);
  });

  it("renders without crashing across all moods", () => {
    for (const mood of ["happy", "sad", "sleepy", "excited", "idle", "hungry"] as const) {
      const { container, unmount } = render(<Mochi mood={mood} />);
      expect(container.querySelector("svg")).not.toBeNull();
      unmount();
    }
  });

  it("renders in eating state", () => {
    const { container } = render(<Mochi mood="happy" eating />);
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("renders both visual themes (cute + premium)", () => {
    const cute = render(<Mochi mood="happy" theme="cute" />);
    expect(cute.container.querySelector("svg")).not.toBeNull();
    cute.unmount();

    const premium = render(<Mochi mood="happy" theme="premium" />);
    expect(premium.container.querySelector("svg")).not.toBeNull();
    premium.unmount();
  });
});
