export const MOTION_STYLES = {
  skate: {
    label: "Skate route",
    stroke: "#0B1A33",
    width: 1.6,
    dash: "",
    marker: "arrow",
    pattern: "solid",
  },
  pass: {
    label: "Pass lane",
    stroke: "#0B1A33",
    width: 1.6,
    dash: "4 3",
    marker: "arrow",
    pattern: "dotted",
  },
  shot: {
    label: "Shot lane",
    stroke: "#0B1A33",
    width: 2.8,
    dash: "",
    marker: "arrow",
    pattern: "thick",
  },
  blocked: {
    label: "Covered lane",
    stroke: "#6B7280",
    width: 2,
    dash: "2 2",
    marker: "none",
    pattern: "striped",
  },
  freeze: {
    label: "Read point",
    stroke: "#C9A24B",
    width: 1.8,
    dash: "3 2",
    marker: "none",
    pattern: "numbered-ring",
  },
  target: {
    label: "Open target",
    stroke: "#C9A24B",
    width: 1.8,
    dash: "3 2",
    marker: "none",
    pattern: "ring",
  },
};

export function motionStyle(kind = "skate") {
  return MOTION_STYLES[kind] || MOTION_STYLES.skate;
}

