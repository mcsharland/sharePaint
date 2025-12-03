import { Component, createSignal } from "solid-js";
import { Sketchpad, ToolType } from "./sketchpad";
import styles from "./toolbar.module.css"; // reuse toolbar styles

interface ToolsProps {
  sketchpad?: Sketchpad;
}

export const Tools: Component<ToolsProps> = (props) => {
  const [activeTool, setActiveTool] = createSignal<ToolType>("brush");

  const handleToolClick = (tool: ToolType) => {
    setActiveTool(tool);
    props.sketchpad?.setTool(tool);
  };

  return (
    <div class={styles["ribbon-group"]}>
      <div class={styles["ribbon-group-content"]}>
        <button
          onClick={() => handleToolClick("brush")}
          style={{
            "background-color":
              activeTool() === "brush" ? "#ddd" : "transparent",
          }}
        >
          🖌️ Brush
        </button>
        <button
          onClick={() => handleToolClick("line")}
          style={{
            "background-color":
              activeTool() === "line" ? "#ddd" : "transparent",
          }}
        >
          📏 Line
        </button>
        <button
          onClick={() => handleToolClick("eraser")}
          style={{
            "background-color":
              activeTool() === "eraser" ? "#ddd" : "transparent",
          }}
        >
          🧽 Eraser
        </button>
      </div>
      <div class={styles["ribbon-group-label"]}>Tools</div>
    </div>
  );
};
