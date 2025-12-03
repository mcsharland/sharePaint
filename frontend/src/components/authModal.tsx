import { Component, createSignal, Show } from "solid-js";
import { useAuth } from "../authContext";
import styles from "./authModel.module.css";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: Component<AuthModalProps> = (props) => {
  const auth = useAuth();
  const [mode, setMode] = createSignal<"signin" | "signup">("signin");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [error, setError] = createSignal("");
  const [loading, setLoading] = createSignal(false);

  const handleEmailAuth = async (e: Event) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode() === "signin") {
        await auth.signInWithEmail(email(), password());
      } else {
        await auth.signUpWithEmail(email(), password());
      }
      props.onClose();
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      await auth.signInWithGoogle();
      props.onClose();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Show when={props.isOpen}>
      <div class={styles.overlay} onClick={props.onClose}>
        <div class={styles.modal} onClick={(e) => e.stopPropagation()}>
          <button class={styles.closeButton} onClick={props.onClose}>
            ✕
          </button>

          <h2>{mode() === "signin" ? "Sign In" : "Sign Up"}</h2>

          <Show when={error()}>
            <div class={styles.error}>{error()}</div>
          </Show>

          <form onSubmit={handleEmailAuth} class={styles.form}>
            <input
              type="email"
              placeholder="Email"
              value={email()}
              onInput={(e) => setEmail(e.currentTarget.value)}
              required
              class={styles.input}
            />
            <input
              type="password"
              placeholder="Password"
              value={password()}
              onInput={(e) => setPassword(e.currentTarget.value)}
              required
              class={styles.input}
            />
            <button
              type="submit"
              disabled={loading()}
              class={styles.submitButton}
            >
              {loading() ? "..." : mode() === "signin" ? "Sign In" : "Sign Up"}
            </button>
          </form>

          <div class={styles.divider}>OR</div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading()}
            class={styles.googleButton}
          >
            Continue with Google
          </button>

          <div class={styles.switchMode}>
            {mode() === "signin" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => setMode("signup")}>Sign Up</button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("signin")}>Sign In</button>
              </>
            )}
          </div>
        </div>
      </div>
    </Show>
  );
};
