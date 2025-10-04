import { Component } from "solid-js";

import styles from "./colors.module.css";
import commonStyles from "./toolbar.module.css";

export const Colors: Component = () => {
  return (
    <div class={commonStyles["ribbon-group"]}>
      <div class={`${commonStyles["ribbon-group-content"]}`}>
        <button>
          <div class={styles[`color-box`]}></div>
          <div>Primary</div>
        </button>
        <button>
          <div class={styles[`color-box`]}></div>
          <div>Secondary</div>
        </button>
      </div>
      <div class={commonStyles["ribbon-group-label"]}>Colors</div>
    </div>
  );
};
