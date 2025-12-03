import { Component } from "solid-js";
import { Sketchpad } from "./sketchpad";
import styles from "./colors.module.css";
import commonStyles from "./toolbar.module.css";

interface ColorsProps {
  sketchpad?: Sketchpad;
}

export const Colors: Component<ColorsProps> = (props) => {
  return (
    <div class={commonStyles["ribbon-group"]}>
      <div class={commonStyles["ribbon-group-content"]}>
        <div class={styles["color-wrapper"]}>
          <input
            type="color"
            class={styles["color-input"]}
            value="#000000"
            onInput={(e) =>
              props.sketchpad?.setStrokeColor(e.currentTarget.value)
            }
            title="Choose Stroke Color"
          />
        </div>
      </div>
      <div class={commonStyles["ribbon-group-label"]}>Color</div>
    </div>
  );
};
