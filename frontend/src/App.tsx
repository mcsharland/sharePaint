import { createSignal, onMount } from "solid-js";
import { ResponsiveSketchpad } from "./components/responsiveSketchpad";
import { ToolBar } from "./components/toolbar";
import { RoomManager } from "./roomManager";
import { AuthProvider } from "./authContext";
import { ConnectedUsers } from "./components/connectedUsers";
import { ViewerBanner } from "./components/viewerBanner";
import { TextInputModal } from "./components/textInputModal";

import type { Component } from "solid-js";
import type { Sketchpad } from "./components/sketchpad";
import type { ToolType } from "./components/sketchpad";
import type { Point } from "./components/sketchpad";

import styles from "./App.module.css";

const App: Component = () => {
  const [sketchpad, setSketchpad] = createSignal<Sketchpad | undefined>(
    undefined,
  );
  const [isViewer, setIsViewer] = createSignal(false);
  const [currentTool, setCurrentTool] = createSignal<ToolType>("brush");
  const [currentColor, setCurrentColor] = createSignal("#000000");
  const [showTextModal, setShowTextModal] = createSignal(false);
  const [textPosition, setTextPosition] = createSignal<Point | null>(null);

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

  const handleTextRequest = (point: Point) => {
    setTextPosition(point);
    setShowTextModal(true);
  };

  const handleTextSubmit = (text: string) => {
    const pos = textPosition();
    if (pos && sketchpad()) {
      sketchpad()!.addTextStroke(text, pos);
    }
  };

  return (
    <AuthProvider>
      <div class={styles.App}>
        <RoomManager
          sketchpad={sketchpad()}
          onViewerStatusChange={setIsViewer}
        />
        <ToolBar
          sketchpad={sketchpad()}
          currentTool={currentTool}
          currentColor={currentColor}
          onToolChange={setCurrentTool}
          onColorChange={setCurrentColor}
          isViewerMode={isViewer()}
        />
        <ResponsiveSketchpad
          onInit={setSketchpad}
          onToolChange={setCurrentTool}
          onColorChange={setCurrentColor}
          onTextRequest={handleTextRequest}
        />
        <ConnectedUsers />
        <ViewerBanner isVisible={isViewer()} />
        <TextInputModal
          isOpen={showTextModal()}
          onClose={() => setShowTextModal(false)}
          onSubmit={handleTextSubmit}
        />
      </div>
    </AuthProvider>
  );
};

export default App;
