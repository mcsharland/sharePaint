import { Component, createSignal } from "solid-js";
import { Sketchpad } from "./sketchpad";
import { ShareModal } from "./shareModal";
import styles from "./toolbar.module.css";
import actionStyles from "./actions.module.css";

interface ActionsProps {
  sketchpad?: Sketchpad;
  isViewerMode?: boolean;
}

export const Actions: Component<ActionsProps> = (props) => {
  const [showShareModal, setShowShareModal] = createSignal(false);

  const handleDownload = () => {
    if (!props.sketchpad) return;
    const data = props.sketchpad.exportImage("image/png");
    const link = document.createElement("a");
    link.download = "sketchpad-drawing.png";
    link.href = data;
    link.click();
  };

  const handleClear = () => {
    if (!props.sketchpad || props.isViewerMode) return;
    if (confirm("Clear the entire canvas? This cannot be undone.")) {
      props.sketchpad.clear();
    }
  };

  return (
    <>
      <div class={styles["ribbon-group"]}>
        <div class={styles["ribbon-group-content"]}>
          <button
            onClick={() => props.sketchpad?.undo()}
            disabled={props.isViewerMode}
            title="Undo"
          >
            ↩ Undo
          </button>
          <button
            onClick={() => props.sketchpad?.redo()}
            disabled={props.isViewerMode}
            title="Redo"
          >
            ↪ Redo
          </button>
          <button
            onClick={handleClear}
            disabled={props.isViewerMode}
            title="Clear Canvas"
            class={actionStyles["clear-button"]}
          >
            🗑️ Clear
          </button>
          <button onClick={handleDownload} title="Save Image">
            💾 Download
          </button>
          <button onClick={() => setShowShareModal(true)} title="Share Room">
            🔗 Share
          </button>
        </div>
        <div class={styles["ribbon-group-label"]}>Actions</div>
      </div>
      <ShareModal
        isOpen={showShareModal()}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
};
