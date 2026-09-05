import React from "react";
import { Canvas } from "@react-three/fiber";
import { PCFShadowMap } from "three";

class WebglBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onFailure?.(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Shared layered surface: the existing 2D canvas remains rendered underneath
// as a no-regression fallback; the WebGL layer owns input only when requested;
// the Action Rail stays above both as regular children.
export default function GymVisualStage({
  canvasRef,
  onCanvasPointer,
  scene3d,
  camera,
  inputLayer = "none",
  children,
  ariaLabel,
}) {
  const [webglReady, setWebglReady] = React.useState(false);
  const [webglFailed, setWebglFailed] = React.useState(false);

  return (
    <div
      className={`gym-stage gym-visual-stage${webglReady && !webglFailed ? " has-webgl" : ""}`}
      aria-label={ariaLabel}
    >
      <canvas
        ref={canvasRef}
        className="gym-canvas gym-fallback-canvas"
        onMouseDown={onCanvasPointer}
        onTouchStart={onCanvasPointer}
      />
      {!webglFailed && (
        <div className={`gym-webgl-layer input-${inputLayer}`}>
          <WebglBoundary onFailure={() => setWebglFailed(true)}>
            <Canvas
              camera={camera}
              dpr={[1, 1.75]}
              shadows={{ type: PCFShadowMap }}
              gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
              onCreated={({ gl }) => {
                gl.setClearColor(0x07131f, 1);
                setWebglReady(true);
              }}
            >
              {scene3d}
            </Canvas>
          </WebglBoundary>
        </div>
      )}
      {children}
    </div>
  );
}
