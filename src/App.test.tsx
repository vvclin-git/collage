import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { createPhotoAssets } from "./lib/photoAssets";
import { useCollageStore } from "./store/useCollageStore";

vi.mock("./lib/photoAssets", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./lib/photoAssets")>();
  return { ...actual, createPhotoAssets: vi.fn() };
});
vi.mock("./components/LayoutEditor", () => ({ LayoutEditor: () => <div>Manual editor</div> }));
vi.mock("./components/CollageEditor", () => ({ CollageEditor: () => <div>Fine tune editor</div> }));

const mockedCreatePhotoAssets = vi.mocked(createPhotoAssets);
const photo = { id: "photo-1", src: "blob:one", fileName: "one.jpg", width: 800, height: 600, mimeType: "image/jpeg" };

describe("App workflow", () => {
  beforeEach(() => {
    useCollageStore.setState({
      workflowStep: "start",
      photos: [],
      placements: {},
      selectedCellId: undefined,
      selectedSplitId: undefined,
      selectedLayoutLeafIds: [],
    });
    mockedCreatePhotoAssets.mockReset();
  });

  it("routes solely from workflowStep", () => {
    const { rerender } = render(<App />);
    expect(screen.getByRole("button", { name: "Import photos" })).toBeInTheDocument();
    useCollageStore.setState({ workflowStep: "manual-layout" });
    rerender(<App />);
    expect(screen.getByText("Manual editor")).toBeInTheDocument();
    useCollageStore.setState({ workflowStep: "edit-collage" });
    rerender(<App />);
    expect(screen.getByText("Fine tune editor")).toBeInTheDocument();
  });

  it("imports valid files from a mixed batch and announces rejected files", async () => {
    mockedCreatePhotoAssets.mockResolvedValue({
      assets: [photo],
      rejections: [{ file: new File(["bad"], "bad.gif", { type: "image/gif" }), reason: "unsupported-type" }],
    });
    render(<App />);
    const input = screen.getByLabelText("Choose photos");
    const files = [new File(["ok"], "one.jpg", { type: "image/jpeg" }), new File(["bad"], "bad.gif", { type: "image/gif" })];
    fireEvent.change(input, { target: { files } });

    await waitFor(() => expect(useCollageStore.getState().photos).toEqual([photo]));
    expect(useCollageStore.getState().workflowStep).toBe("choose-layout");
    expect(screen.getByRole("alert")).toHaveTextContent("bad.gif");
  });

  it("does not mutate workflow state when every file fails", async () => {
    useCollageStore.setState({ workflowStep: "edit-collage", photos: [photo], placements: { root: { photoId: photo.id, scale: 1, offsetX: 0, offsetY: 0 } } });
    mockedCreatePhotoAssets.mockResolvedValue({
      assets: [],
      rejections: [{ file: new File(["bad"], "broken.png", { type: "image/png" }), reason: "decode-failed" }],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText("Choose photos"), { target: { files: [new File(["bad"], "broken.png", { type: "image/png" })] } });

    await screen.findByRole("alert");
    expect(useCollageStore.getState()).toMatchObject({ workflowStep: "edit-collage", photos: [photo], placements: { root: { photoId: photo.id } } });
  });
});
