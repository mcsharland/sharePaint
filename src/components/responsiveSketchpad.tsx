import { createSignal, onMount, JSX } from "solid-js";
import Sketchpad from "sketchpad";
import styles from "./responsiveSketchpad.module.css";

interface Config {
  width?: number;
  height?: number;
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

  let sketchpad!: HTMLDivElement;
  onMount(() => {
    const pad = new Sketchpad(sketchpad, {
      width: initialWidth,
      height: initialHeight,
    });
  });

  return (
    <div
      class={styles[`sketchpad-canvas`]}
      style={initialStyles}
      ref={sketchpad}
    ></div>
  );
};
