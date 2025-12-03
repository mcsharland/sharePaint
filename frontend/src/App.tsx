import { createSignal, onMount } from "solid-js";
import { ResponsiveSketchpad } from "./components/responsiveSketchpad";
import { ToolBar } from "./components/toolbar";
import { RoomManager } from "./roomManager";
import { AuthProvider } from "./authContext";

import type { Component } from "solid-js";
import type { Sketchpad } from "./components/sketchpad";
import type { ToolType } from "./components/sketchpad";

import styles from "./App.module.css";

const App: Component = () => {
  const [sketchpad, setSketchpad] = createSignal<Sketchpad | undefined>(
    undefined,
  );

  const [currentTool, setCurrentTool] = createSignal<ToolType>("brush");
  const [currentColor, setCurrentColor] = createSignal("#000000");

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("room")) {
      // random 6 digit numeric roomID, change later
      const randomRoomId = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();
      const newUrl = `${window.location.pathname}?room=${randomRoomId}`;
      window.history.replaceState({}, "", newUrl);
    }
  });

  return (
    <AuthProvider>
      <div class={styles.App}>
        <RoomManager sketchpad={sketchpad()} />
        <ToolBar
          sketchpad={sketchpad()}
          currentTool={currentTool}
          currentColor={currentColor}
          onToolChange={setCurrentTool}
          onColorChange={setCurrentColor}
        />
        <ResponsiveSketchpad
          onInit={setSketchpad}
          onToolChange={setCurrentTool}
          onColorChange={setCurrentColor}
        />
      </div>
    </AuthProvider>
  );
};

export default App;
