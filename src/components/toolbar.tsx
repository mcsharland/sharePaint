import { Component } from "solid-js";
import styles from "./toolbar.module.css";
import { Colors } from "./colors";

export const ToolBar: Component = () => {
  return (
    <div class={styles[`toolbar-container`]}>
      <Colors></Colors>
    </div>
  );
};
