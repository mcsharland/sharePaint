import { Component, createSignal, Show } from "solid-js";
import styles from "./textInputModal.module.css";

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export const TextInputModal: Component<TextInputModalProps> = (props) => {
  const [text, setText] = createSignal("");

  const handleSubmit = (e: Event) => {
    e.preventDefault();
    if (text().trim()) {
      props.onSubmit(text());
      setText("");
      props.onClose();
    }
  };

  const handleClose = () => {
    setText("");
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <div class={styles.overlay} onClick={handleClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button class={styles.closeButton} onClick={handleClose}>
            ✕
          </button>

          <h2>Add Text</h2>

          <form onSubmit={handleSubmit} class={styles.form}>
            <input
              type="text"
              placeholder="Enter text..."
              value={text()}
              onInput={(e) => setText(e.currentTarget.value)}
              class={styles.input}
              autofocus
            />
            <div class={styles.buttons}>
              <button
                type="button"
                onClick={handleClose}
                class={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!text().trim()}
                class={styles.submitButton}
              >
                Add Text
              </button>
            </div>
          </form>
        </div>
      </div>
    </Show>
  );
};
