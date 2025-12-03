import { Component, Accessor } from "solid-js";
import { Sketchpad, ToolType } from "./sketchpad";
import styles from "./toolbar.module.css"; // reuse toolbar styles

interface ToolsProps {
  sketchpad?: Sketchpad;
  currentTool: Accessor<ToolType>;
  onToolChange: (tool: ToolType) => void;
}

export const Tools: Component<ToolsProps> = (props) => {
  const handleToolClick = (tool: ToolType) => {
    props.sketchpad?.setTool(tool);
    // setTool will trigger the callback in RS
  };

  return (
    <div class={styles["ribbon-group"]}>
      <div class={styles["ribbon-group-content"]}>
        <button
          onClick={() => handleToolClick("brush")}
          style={{
            "background-color":
              props.currentTool() === "brush" ? "#ddd" : "transparent",
          }}
        >
          🖌️ Brush
        </button>
        <button
          onClick={() => handleToolClick("line")}
          style={{
            "background-color":
              props.currentTool() === "line" ? "#ddd" : "transparent",
          }}
        >
          📏 Line
        </button>
        <button
          onClick={() => handleToolClick("eraser")}
          style={{
            "background-color":
              props.currentTool() === "eraser" ? "#ddd" : "transparent",
          }}
        >
          🧽 Eraser
        </button>
        <button
          onClick={() => handleToolClick("eyedropper")}
          style={{
            "background-color":
              props.currentTool() === "eyedropper" ? "#ddd" : "transparent",
          }}
          title="Eyedropper - Pick color from canvas"
        >
          💧 Pick
        </button>
      </div>
      <div class={styles["ribbon-group-label"]}>Tools</div>
    </div>
  );
};
