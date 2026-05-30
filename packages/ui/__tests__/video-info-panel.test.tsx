import React from "react";
import { render, screen } from "@testing-library/react";
import type { VideoMetadata } from "@lightbird/core";
import { VideoInfoPanel } from "../src/video-info-panel";

function makeMetadata(overrides: Partial<VideoMetadata> = {}): VideoMetadata {
  return {
    filename: "stream.m3u8",
    fileSize: null,
    duration: 120,
    container: "HLS",
    width: 1920,
    height: 1080,
    frameRate: null,
    videoBitrate: 5_000_000,
    videoCodec: "H.264 (AVC)",
    colorSpace: null,
    audioTracks: [],
    subtitleTracks: [],
    ...overrides,
  };
}

describe("VideoInfoPanel", () => {
  it("renders nothing when metadata is null", () => {
    const { container } = render(<VideoInfoPanel metadata={null} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a Stream Renditions row with the level count for HLS streams", () => {
    render(
      <VideoInfoPanel metadata={makeMetadata({ streamRenditions: 4 })} onClose={() => {}} />
    );
    const row = screen.getByText("Stream Renditions").closest("tr");
    expect(row).not.toBeNull();
    expect(row).toHaveTextContent("4 levels");
  });

  it("omits the Stream Renditions row when there are no renditions", () => {
    render(<VideoInfoPanel metadata={makeMetadata({ streamRenditions: null })} onClose={() => {}} />);
    expect(screen.queryByText("Stream Renditions")).toBeNull();
  });

  it("omits the Stream Renditions row when streamRenditions is absent (native files)", () => {
    render(<VideoInfoPanel metadata={makeMetadata()} onClose={() => {}} />);
    expect(screen.queryByText("Stream Renditions")).toBeNull();
  });
});
