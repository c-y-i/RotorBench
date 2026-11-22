const DEFAULT_INSET = 10;

export function revealFocusedTrackControl(event) {
  const track = event?.currentTarget;
  const control = event?.target;
  if (
    !track
    || !control
    || typeof track.getBoundingClientRect !== "function"
    || typeof control.getBoundingClientRect !== "function"
    || track.scrollWidth <= track.clientWidth
  ) {
    return;
  }

  const trackRect = track.getBoundingClientRect();
  const controlRect = control.getBoundingClientRect();
  if (controlRect.left < trackRect.left + DEFAULT_INSET) {
    track.scrollLeft += controlRect.left - trackRect.left - DEFAULT_INSET;
  } else if (controlRect.right > trackRect.right - DEFAULT_INSET) {
    track.scrollLeft += controlRect.right - trackRect.right + DEFAULT_INSET;
  }
}
