import { Component, Accessor } from "solid-js";
import styles from "./toolbar.module.css";
import { Sketchpad, ToolType } from "./sketchpad";

import { Colors } from "./colors";
import { Tools } from "./tools";
import { Actions } from "./actions";
import { Projects } from "./projects";
import { UserMenu } from "./userMenu";

interface ToolBarProps {
  sketchpad?: Sketchpad;
  currentTool: Accessor<ToolType>;
  currentColor: Accessor<string>;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
}

export const ToolBar: Component<ToolBarProps> = (props) => {
  return (
    <div class={styles["toolbar-container"]}>
      <Actions sketchpad={props.sketchpad} />
      <Tools
        sketchpad={props.sketchpad}
        currentTool={props.currentTool}
        onToolChange={props.onToolChange}
      />
      <Colors
        sketchpad={props.sketchpad}
        currentColor={props.currentColor}
        onColorChange={props.onColorChange}
      />

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
      <Projects sketchpad={props.sketchpad} />
      <UserMenu />
    </div>
  );
};
