import { createSignal, onMount } from "solid-js";
import { ResponsiveSketchpad } from "./components/responsiveSketchpad";
import { ToolBar } from "./components/toolbar";
import { RoomManager } from "./roomManager";

import type { Component } from "solid-js";
import type { Sketchpad } from "./components/sketchpad";

import styles from "./App.module.css";

const App: Component = () => {
  const [sketchpad, setSketchpad] = createSignal<Sketchpad | undefined>(
    undefined,
  );

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
    <div class={styles.App}>
      <RoomManager sketchpad={sketchpad()} />
      <ToolBar sketchpad={sketchpad()} />
      <ResponsiveSketchpad onInit={setSketchpad} />
    </div>
  );
};

export default App;
