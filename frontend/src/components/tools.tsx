import { Component, Accessor } from "solid-js";
import { Sketchpad, ToolType } from "./sketchpad";
import styles from "./toolbar.module.css"; // reuse toolbar styles

interface ToolsProps {
  sketchpad?: Sketchpad;
  currentTool: Accessor<ToolType>;
  onToolChange: (tool: ToolType) => void;
  isViewerMode?: boolean;
}

export const Tools: Component<ToolsProps> = (props) => {
  const handleToolClick = (tool: ToolType) => {
    if (props.isViewerMode) return;
    props.sketchpad?.setTool(tool);
    // setTool will trigger the callback in RS
  };

  return (
    <div class={styles["ribbon-group"]}>
      <div class={styles["ribbon-group-content"]}>
        <button
          onClick={() => handleToolClick("brush")}
          disabled={props.isViewerMode}
          style={{
            "background-color":
              props.currentTool() === "brush" ? "#ddd" : "transparent",
          }}
          title="Brush"
        >
          🖌️ Brush
        </button>
        <button
          onClick={() => handleToolClick("line")}
          disabled={props.isViewerMode}
          style={{
            "background-color":
              props.currentTool() === "line" ? "#ddd" : "transparent",
          }}
          title="Line"
        >
          📏 Line
        </button>
        <button
          onClick={() => handleToolClick("rectangle")}
          disabled={props.isViewerMode}
          style={{
            "background-color":
              props.currentTool() === "rectangle" ? "#ddd" : "transparent",
          }}
          title="Rectangle"
        >
          ▭ Rectangle
        </button>
        <button
          onClick={() => handleToolClick("circle")}
          disabled={props.isViewerMode}
          style={{
            "background-color":
              props.currentTool() === "circle" ? "#ddd" : "transparent",
          }}
          title="Circle"
        >
          ○ Circle
        </button>
        <button
          onClick={() => handleToolClick("text")}
          disabled={props.isViewerMode}
          style={{
            "background-color":
              props.currentTool() === "text" ? "#ddd" : "transparent",
          }}
          title="Text"
        >
          T Text
        </button>
        <button
          onClick={() => handleToolClick("eraser")}
          disabled={props.isViewerMode}
          style={{
            "background-color":
              props.currentTool() === "eraser" ? "#ddd" : "transparent",
          }}
          title="Eraser"
        >
          🧽 Eraser
        </button>
        <button
          onClick={() => handleToolClick("eyedropper")}
          disabled={props.isViewerMode}
          style={{
            "background-color":
              props.currentTool() === "eyedropper" ? "#ddd" : "transparent",
          }}
          title="Eyedropper"
        >
          💧 Eyedropper
        </button>
      </div>
      <div class={styles["ribbon-group-label"]}>Tools</div>
    </div>
  );
};
