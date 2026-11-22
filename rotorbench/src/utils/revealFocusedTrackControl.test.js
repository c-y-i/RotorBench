import { revealFocusedTrackControl } from "./revealFocusedTrackControl";

function trackWith({ scrollLeft = 0, trackLeft = 0, trackWidth = 200 }) {
  return {
    scrollLeft,
    scrollWidth: 500,
    clientWidth: trackWidth,
    getBoundingClientRect: () => ({
      left: trackLeft,
      right: trackLeft + trackWidth,
    }),
  };
}

function controlWith({ left, right }) {
  return {
    getBoundingClientRect: () => ({
      left,
      right,
    }),
  };
}

test("reveals a clipped keyboard target inside a horizontal control track", () => {
  const track = trackWith({ scrollLeft: 40 });
  revealFocusedTrackControl({
    currentTarget: track,
    target: controlWith({ left: 228, right: 320 }),
  });

  expect(track.scrollLeft).toBe(170);
});

test("reveals a leading target without moving an already visible track target", () => {
  const leadingTrack = trackWith({ scrollLeft: 80 });
  revealFocusedTrackControl({
    currentTarget: leadingTrack,
    target: controlWith({ left: -55, right: 20 }),
  });
  expect(leadingTrack.scrollLeft).toBe(15);

  const visibleTrack = trackWith({ scrollLeft: 40 });
  revealFocusedTrackControl({
    currentTarget: visibleTrack,
    target: controlWith({ left: 60, right: 140 }),
  });
  expect(visibleTrack.scrollLeft).toBe(40);
});
