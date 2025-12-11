import { Component, Show } from "solid-js";
import styles from "./viewerBanner.module.css";

interface ViewerBannerProps {
  isVisible: boolean;
}

export const ViewerBanner: Component<ViewerBannerProps> = (props) => {
  return (
    <Show when={props.isVisible}>
      <div class={styles.banner}>
        <span class={styles.text}>Viewer Mode - Read Only</span>
      </div>
    </Show>
  );
};
