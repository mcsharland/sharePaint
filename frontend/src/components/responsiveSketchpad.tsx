import { onMount, onCleanup, createSignal } from "solid-js";
import { Sketchpad, Point } from "./sketchpad";
import { userManager } from "../socket";
import styles from "./responsiveSketchpad.module.css";
import type { ToolType } from "./sketchpad";

interface Config {
  width?: number;
  height?: number;
  onInit?: (instance: Sketchpad) => void;
  onToolChange?: (tool: ToolType) => void;
  onColorChange?: (color: string) => void;
  onTextRequest?: (point: Point) => void;
}

export const ResponsiveSketchpad = (props: Config) => {
  const TOOLBAR_HEIGHT = 110;

  let container!: HTMLDivElement;
  let sketchpadInstance: Sketchpad | null = null;
  let resizeTimeout: number | null = null;

  const getContainerDimensions = () => {
    const rect = container.getBoundingClientRect();
    return {
      width: Math.floor(rect.width),
      height: Math.floor(rect.height),
    };
  };

  const handleResize = () => {
    // debounce resize events to avoid excess redraws
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }

    resizeTimeout = window.setTimeout(() => {
      if (sketchpadInstance && container) {
        const { width, height } = getContainerDimensions();
        sketchpadInstance.resize(width, height);
        console.log(`[ResponsiveSketchpad] Resized to ${width}x${height}`);
      }
    }, 150); // 150ms
  };

  onMount(() => {
    const userId = userManager.getUserId() || undefined;

    requestAnimationFrame(() => {
      const { width, height } = getContainerDimensions();
      sketchpadInstance = new Sketchpad(container, {
        width,
        height,
        userId: userId,
        onColorPick: (color: string) => {
          // notify parent when color is picked
          if (props.onColorChange) {
            props.onColorChange(color);
          }
        },
        onTextRequest: (point: Point) => {
          // notify parent when text tool is clicked
          if (props.onTextRequest) {
            props.onTextRequest(point);
          }
        },
      });

      const originalSetTool = sketchpadInstance.setTool.bind(sketchpadInstance);
      sketchpadInstance.setTool = (tool: ToolType) => {
        originalSetTool(tool);
        if (props.onToolChange) {
          props.onToolChange(tool);
        }
      };

      if (props.onInit) {
        props.onInit(sketchpadInstance);
      }

      window.addEventListener("resize", handleResize);
    });
  });

  onCleanup(() => {
    window.removeEventListener("resize", handleResize);
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    if (sketchpadInstance) {
      sketchpadInstance.dispose();
    }
  });

  return <div class={styles[`sketchpad-canvas`]} ref={container}></div>;
};
