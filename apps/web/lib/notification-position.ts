export type NotificationPosition = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
};

type TriggerRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const VIEWPORT_MARGIN = 12;
const TRIGGER_GAP = 8;
const DESKTOP_WIDTH = 380;
const MOBILE_BREAKPOINT = 640;
const MIN_USEFUL_HEIGHT = 160;

export function calculateNotificationPosition({
  trigger,
  panelHeight,
  viewportWidth,
  viewportHeight,
}: {
  trigger: TriggerRect;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}): NotificationPosition {
  const width = Math.min(DESKTOP_WIDTH, Math.max(0, viewportWidth - (VIEWPORT_MARGIN * 2)));
  const boundedPanelHeight = Math.min(panelHeight, Math.max(0, viewportHeight - (VIEWPORT_MARGIN * 2)));

  if (viewportWidth < MOBILE_BREAKPOINT) {
    const top = clamp(trigger.bottom + TRIGGER_GAP, VIEWPORT_MARGIN, viewportHeight - VIEWPORT_MARGIN);
    return {
      left: VIEWPORT_MARGIN,
      top,
      width,
      maxHeight: Math.max(MIN_USEFUL_HEIGHT, viewportHeight - top - VIEWPORT_MARGIN),
    };
  }

  const rightOpeningLeft = trigger.right + TRIGGER_GAP;
  const canOpenRight = rightOpeningLeft + width <= viewportWidth - VIEWPORT_MARGIN;
  const left = canOpenRight
    ? rightOpeningLeft
    : clamp(trigger.right - width, VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN);

  const belowTop = trigger.bottom + TRIGGER_GAP;
  const availableBelow = viewportHeight - VIEWPORT_MARGIN - belowTop;
  const availableAbove = trigger.top - TRIGGER_GAP - VIEWPORT_MARGIN;
  const shouldOpenBelow =
    availableBelow >= Math.min(boundedPanelHeight, 320) || availableBelow >= availableAbove;
  const preferredTop = shouldOpenBelow
    ? belowTop
    : trigger.top - TRIGGER_GAP - boundedPanelHeight;
  const top = clamp(
    preferredTop,
    VIEWPORT_MARGIN,
    Math.max(VIEWPORT_MARGIN, viewportHeight - boundedPanelHeight - VIEWPORT_MARGIN),
  );

  return {
    left,
    top,
    width,
    maxHeight: Math.max(MIN_USEFUL_HEIGHT, viewportHeight - top - VIEWPORT_MARGIN),
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
