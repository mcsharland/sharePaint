import { Component } from "solid-js";
import styles from "./toolbar.module.css";
import { Sketchpad } from "./sketchpad";

import { Colors } from "./colors";
import { Tools } from "./tools";
import { Actions } from "./actions";

interface ToolBarProps {
  sketchpad?: Sketchpad;
}

export const ToolBar: Component<ToolBarProps> = (props) => {
  return (
    <div class={styles["toolbar-container"]}>
      <Actions sketchpad={props.sketchpad} />
      <Tools sketchpad={props.sketchpad} />
      <Colors sketchpad={props.sketchpad} />

      <div class={styles["ribbon-group"]}>
        <div class={styles["ribbon-group-content"]}>
          <input
            type="range"
            min="1"
            max="50"
            value={2}
            onInput={(e) =>
              props.sketchpad?.setLineSize(parseInt(e.currentTarget.value))
            }
          />
        </div>
        <div class={styles["ribbon-group-label"]}>Size</div>
      </div>
    </div>
  );
};
