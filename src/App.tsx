import type { Component } from "solid-js";
import { ResponsiveSketchpad } from "./components/responsiveSketchpad";

import styles from "./App.module.css";
import { ToolBar } from "./components/toolbar";

const App: Component = () => {
  return (
    <div class={styles.App}>
      <ToolBar></ToolBar>
      <ResponsiveSketchpad></ResponsiveSketchpad>
    </div>
  );
};

export default App;
