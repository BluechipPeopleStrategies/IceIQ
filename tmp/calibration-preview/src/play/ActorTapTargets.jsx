const HIT_RADIUS = 8;
const SELECTED_RADIUS = 6.5;

export function ActorTapTargets({
  options = [],
  positions = {},
  picked = null,
  disabled = false,
  onChoose,
}) {
  return options.map((option, index) => {
    const point = positions[option.actorId];
    if (!point) return null;

    const activate = () => {
      if (!disabled) onChoose?.(option, index);
    };

    return (
      <g
        key={option.id}
        data-actor-id={option.actorId}
        transform={`translate(${point[0]},${point[1]})`}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={option.t}
        onClick={activate}
        onKeyDown={(event) => {
          const key = event.key;
          if (key === "Enter" || key === " ") {
            event.preventDefault();
            activate();
          }
        }}
        style={{ cursor: disabled ? "default" : "pointer", outline: "none" }}
      >
        <circle r={HIT_RADIUS} fill="transparent" pointerEvents="all" />
        {picked === index && (
          <circle
            r={SELECTED_RADIUS}
            fill="none"
            stroke="#C9A24B"
            strokeWidth="1.4"
            pointerEvents="none"
          />
        )}
      </g>
    );
  });
}
