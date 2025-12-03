import { onMount, JSX } from "solid-js";
// import Sketchpad from "sketchpad";
import { Sketchpad } from "./sketchpad";
import styles from "./responsiveSketchpad.module.css";

interface Config {
  width?: number;
  height?: number;
  onInit?: (instance: Sketchpad) => void;
}

export const ResponsiveSketchpad = (props: Config) => {
  const TOOLBAR_HEIGHT = 110;

  const initialWidth: number = props.width ?? window.innerWidth;
  const initialHeight: number =
    props.height ?? window.innerHeight - TOOLBAR_HEIGHT;

  // style object
  const initialStyles: JSX.CSSProperties = {
    width: `${initialWidth}px`,
    height: `${initialHeight}px`,
  };

  let container!: HTMLDivElement;
  onMount(() => {
    const pad = new Sketchpad(container, {
      width: initialWidth,
      height: initialHeight,
    });

    if (props.onInit) {
      // send instance
      props.onInit(pad);
    }
  });

  return (
    <div
      class={styles[`sketchpad-canvas`]}
      style={initialStyles}
      ref={container}
    ></div>
  );
};
