import { Component, createSignal, Show } from "solid-js";
import { useAuth } from "../authContext";
import { AuthModal } from "./authModal";
import toolbarStyles from "./toolbar.module.css";
import styles from "./userMenu.module.css";

export const UserMenu: Component = () => {
  const auth = useAuth();
  const [showAuthModal, setShowAuthModal] = createSignal(false);

  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <>
      <div class={toolbarStyles["ribbon-group"]}>
        <div class={toolbarStyles["ribbon-group-content"]}>
          <Show
            when={auth.user()}
            fallback={
              <button onClick={() => setShowAuthModal(true)} title="Sign In">
                👤 Sign In
              </button>
            }
          >
            <div class={styles["user-info"]}>
              <span class={styles["user-email"]}>
                {auth.user()?.email || "User"}
              </span>
              <button onClick={handleSignOut} title="Sign Out">
                Sign Out
              </button>
            </div>
          </Show>
        </div>
        <div class={toolbarStyles["ribbon-group-label"]}>Account</div>
      </div>

      <AuthModal
        isOpen={showAuthModal()}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};
