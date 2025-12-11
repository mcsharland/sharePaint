import { Component, Accessor } from "solid-js";
import { Sketchpad } from "./sketchpad";
import styles from "./colors.module.css";
import commonStyles from "./toolbar.module.css";

interface ColorsProps {
  sketchpad?: Sketchpad;
  currentColor: Accessor<string>;
  onColorChange: (color: string) => void;
  isViewerMode?: boolean;
}

export const Colors: Component<ColorsProps> = (props) => {
  const handleColorChange = (color: string) => {
    props.onColorChange(color);
    props.sketchpad?.setStrokeColor(color);
  };
  return (
    <div class={commonStyles["ribbon-group"]}>
      <div class={commonStyles["ribbon-group-content"]}>
        <div class={styles["color-wrapper"]}>
          <input
            type="color"
            class={styles["color-input"]}
            value={props.currentColor()}
            disabled={props.isViewerMode}
            onInput={(e) => handleColorChange(e.currentTarget.value)}
            title="Choose Stroke Color"
          />
        </div>
      </div>
      <div class={commonStyles["ribbon-group-label"]}>Color</div>
    </div>
  );
};
