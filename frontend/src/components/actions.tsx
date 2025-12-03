import { Component } from "solid-js";
import { Sketchpad } from "./sketchpad";
import styles from "./toolbar.module.css";

interface ActionsProps {
  sketchpad?: Sketchpad;
}

export const Actions: Component<ActionsProps> = (props) => {
  const handleSave = () => {
    if (!props.sketchpad) return;
    const data = props.sketchpad.exportImage("image/png");
    const link = document.createElement("a");
    link.download = "sketchpad-drawing.png";
    link.href = data;
    link.click();
  };

  return (
    <div class={styles["ribbon-group"]}>
      <div class={styles["ribbon-group-content"]}>
        <button onClick={() => props.sketchpad?.undo()} title="Undo">
          ↩ Undo
        </button>
        <button onClick={() => props.sketchpad?.redo()} title="Redo">
          ↪ Redo
        </button>
        <button onClick={handleSave} title="Save Image">
          💾 Save
        </button>
      </div>
      <div class={styles["ribbon-group-label"]}>Actions</div>
    </div>
  );
};
