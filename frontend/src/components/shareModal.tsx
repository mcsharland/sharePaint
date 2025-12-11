import { Component, createSignal, Show } from "solid-js";
import styles from "./shareModal.module.css";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: Component<ShareModalProps> = (props) => {
  const [copied, setCopied] = createSignal(false);

  const getRoomLink = () => {
    return window.location.href;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getRoomLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      console.log("[Share] Link copied to clipboard");
    } catch (err) {
      console.error("[Share] Failed to copy:", err);
    }
  };

  const handleClose = () => {
    setCopied(false);
    props.onClose();
  };

  return (
    <Show when={props.isOpen}>
      <div class={styles.overlay} onClick={handleClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button class={styles.closeButton} onClick={handleClose}>
            ✕
          </button>

          <h2>Share This Room</h2>

          <p class={styles.description}>
            Anyone with this link can join and draw in this room.
          </p>

          <div class={styles.linkContainer}>
            <input
              type="text"
              class={styles.linkInput}
              value={getRoomLink()}
              readonly
              onClick={(e) => e.currentTarget.select()}
            />
          </div>

          <button onClick={handleCopyLink} class={styles.copyButton}>
            {copied() ? "✓ Copied!" : "📋 Copy Link"}
          </button>

          <div class={styles.info}>
            <p>
              💡 <strong>Tip:</strong> Send this link to anyone you want to
              collaborate with!
            </p>
          </div>
        </div>
      </div>
    </Show>
  );
};
