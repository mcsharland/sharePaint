import { Component, createSignal, Show } from "solid-js";
import { useAuth } from "../authContext";
import { projectService } from "../projectService";
import { Sketchpad } from "./sketchpad";
import styles from "./saveProjectModal.module.css";

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sketchpad?: Sketchpad;
}

export const SaveProjectModal: Component<SaveProjectModalProps> = (props) => {
  const auth = useAuth();
  const [projectName, setProjectName] = createSignal("");
  const [isPrivate, setIsPrivate] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal("");
  const [success, setSuccess] = createSignal(false);

  const handleSave = async (e: Event) => {
    e.preventDefault();

    if (!props.sketchpad) {
      setError("No canvas to save");
      return;
    }

    if (!auth.user()) {
      setError("You must be signed in to save projects");
      return;
    }

    setError("");
    setSaving(true);
    setSuccess(false);

    try {
      const token = await auth.getToken();
      if (!token) {
        throw new Error("Failed to get auth token");
      }

      const strokes = props.sketchpad.getStrokes();
      const roomId = new URLSearchParams(window.location.search).get("room");

      await projectService.saveProject(
        token,
        projectName() || "Untitled",
        strokes,
        roomId || undefined,
        isPrivate(),
      );

      setSuccess(true);
      console.log("[SaveProject] Project saved successfully");

      // close modal after brief success message
      setTimeout(() => {
        props.onClose();
        setProjectName("");
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error("[SaveProject] Error:", err);
      setError(err.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving()) {
      props.onClose();
      setProjectName("");
      setError("");
      setSuccess(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class={styles.overlay} onClick={handleClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button
            class={styles.closeButton}
            onClick={handleClose}
            disabled={saving()}
          >
            ✕
          </button>

          <h2>Save Project</h2>

          <Show when={error()}>
            <div class={styles.error}>{error()}</div>
          </Show>

          <Show when={success()}>
            <div class={styles.success}>✓ Project saved successfully!</div>
          </Show>

          <form onSubmit={handleSave} class={styles.form}>
            <input
              type="text"
              placeholder="Project name (optional)"
              value={projectName()}
              onInput={(e) => setProjectName(e.currentTarget.value)}
              class={styles.input}
              disabled={saving()}
              autofocus
            />
            <label class={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isPrivate()}
                onChange={(e) => setIsPrivate(e.currentTarget.checked)}
                disabled={saving()}
                class={styles.checkbox}
              />
              <span class={styles.checkboxText}>Private (invite-only)</span>
            </label>
            <p class={styles.hint}>
              {isPrivate()
                ? "Only you and invited collaborators can access this project"
                : "Anyone with the room link can view and edit"}
            </p>
            <button
              type="submit"
              disabled={saving() || success()}
              class={styles.saveButton}
            >
              {saving() ? "Saving..." : success() ? "Saved!" : "Save Project"}
            </button>
          </form>
        </div>
      </div>
    </Show>
  );
};
