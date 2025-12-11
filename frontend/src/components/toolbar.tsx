import { Component, Accessor, createSignal } from "solid-js";
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
  isViewerMode?: boolean;
}

export const ToolBar: Component<ToolBarProps> = (props) => {
  const [fillShapes, setFillShapes] = createSignal(false);

  const handleFillToggle = (e: Event) => {
    const checked = (e.currentTarget as HTMLInputElement).checked;
    setFillShapes(checked);
    props.sketchpad?.setFillShapes(checked);
  };

  return (
    <div
      class={styles["toolbar-container"]}
      classList={{ [styles["viewer-mode"]]: props.isViewerMode }}
    >
      <Actions sketchpad={props.sketchpad} isViewerMode={props.isViewerMode} />
      <Tools
        sketchpad={props.sketchpad}
        currentTool={props.currentTool}
        onToolChange={props.onToolChange}
        isViewerMode={props.isViewerMode}
      />
      <Colors
        sketchpad={props.sketchpad}
        currentColor={props.currentColor}
        onColorChange={props.onColorChange}
        isViewerMode={props.isViewerMode}
      />

      <div class={styles["ribbon-group"]}>
        <div class={styles["ribbon-group-content"]}>
          <input
            type="range"
            min="1"
            max="50"
            value={2}
            disabled={props.isViewerMode}
            onInput={(e) =>
              props.sketchpad?.setLineSize(parseInt(e.currentTarget.value))
            }
          />
        </div>
        <div class={styles["ribbon-group-label"]}>Size</div>
      </div>

      <div class={styles["ribbon-group"]}>
        <div class={styles["ribbon-group-content"]}>
          <label class={styles["fill-label"]}>
            <input
              type="checkbox"
              checked={fillShapes()}
              onChange={handleFillToggle}
              disabled={props.isViewerMode}
              class={styles["fill-checkbox"]}
            />
            <span>Fill</span>
          </label>
        </div>
        <div class={styles["ribbon-group-label"]}>Shapes</div>
      </div>

      <Projects sketchpad={props.sketchpad} />
      <UserMenu />
    </div>
  );
};
