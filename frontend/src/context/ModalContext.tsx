import { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

type ModalVariant = "info" | "success" | "warning" | "error";

interface AlertOptions {
  title: string;
  message: string;
  variant?: ModalVariant;
  confirmLabel?: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  variant?: ModalVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  multiline?: boolean;
  required?: boolean;
  minLength?: number;
}

interface ModalContextType {
  showAlert: (options: AlertOptions) => Promise<void>;
  showConfirm: (options: ConfirmOptions) => Promise<boolean>;
  showPrompt: (options: PromptOptions) => Promise<string | null>;
}

const ModalContext = createContext<ModalContextType | null>(null);

type ModalState =
  | { type: "alert"; options: AlertOptions; resolve: () => void }
  | { type: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { type: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

const variantIcons: Record<ModalVariant, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: XCircle,
};

const variantColors: Record<ModalVariant, string> = {
  info: "text-blue-500",
  success: "text-green-500",
  warning: "text-yellow-500",
  error: "text-red-500",
};

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState | null>(null);
  const [promptValue, setPromptValue] = useState("");

  const showAlert = useCallback((options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setModal({ type: "alert", options, resolve });
    });
  }, []);

  const showConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModal({ type: "confirm", options, resolve });
    });
  }, []);

  const showPrompt = useCallback((options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptValue(options.defaultValue || "");
      setModal({ type: "prompt", options, resolve });
    });
  }, []);

  function handleClose() {
    if (!modal) return;
    if (modal.type === "alert") modal.resolve();
    if (modal.type === "confirm") modal.resolve(false);
    if (modal.type === "prompt") modal.resolve(null);
    setModal(null);
    setPromptValue("");
  }

  function handleConfirm() {
    if (!modal) return;
    if (modal.type === "alert") modal.resolve();
    if (modal.type === "confirm") modal.resolve(true);
    if (modal.type === "prompt") {
      const opts = modal.options as PromptOptions;
      if (opts.required && !promptValue.trim()) return;
      if (opts.minLength && promptValue.trim().length < opts.minLength) return;
      modal.resolve(promptValue.trim());
    }
    setModal(null);
    setPromptValue("");
  }

  function handlePromptKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && modal?.type === "prompt") {
      const opts = modal.options as PromptOptions;
      if (!opts.multiline) {
        e.preventDefault();
        handleConfirm();
      }
    }
  }

  const variant = modal?.type === "alert" || modal?.type === "confirm"
    ? ((modal.options as AlertOptions | ConfirmOptions).variant || "info")
    : "info";
  const Icon = variantIcons[variant];
  const iconColor = variantColors[variant];

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      <Dialog open={modal !== null} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="sm:max-w-md">
          {modal && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {(modal.type === "alert" || modal.type === "confirm") && (
                    <div className={`shrink-0 ${iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  )}
                  <DialogTitle className="text-base">
                    {modal.options.title}
                  </DialogTitle>
                </div>
                <DialogDescription className="pt-1">
                  {modal.options.message}
                </DialogDescription>
              </DialogHeader>

              {modal.type === "prompt" && (
                <div className="py-2">
                  {(modal.options as PromptOptions).multiline ? (
                    <Textarea
                      value={promptValue}
                      onChange={(e) => setPromptValue(e.target.value)}
                      onKeyDown={handlePromptKeyDown}
                      placeholder={(modal.options as PromptOptions).placeholder || ""}
                      className="min-h-[80px]"
                      autoFocus
                    />
                  ) : (
                    <Input
                      value={promptValue}
                      onChange={(e) => setPromptValue(e.target.value)}
                      onKeyDown={handlePromptKeyDown}
                      placeholder={(modal.options as PromptOptions).placeholder || ""}
                      autoFocus
                    />
                  )}
                  {(modal.options as PromptOptions).minLength && promptValue.trim().length > 0 &&
                    promptValue.trim().length < ((modal.options as PromptOptions).minLength || 0) && (
                    <p className="mt-1.5 text-xs text-destructive">
                      Minimum {(modal.options as PromptOptions).minLength} characters required
                    </p>
                  )}
                </div>
              )}

              <DialogFooter>
                {modal.type === "alert" && (
                  <Button onClick={handleConfirm} size="sm">
                    {(modal.options as AlertOptions).confirmLabel || "OK"}
                  </Button>
                )}
                {modal.type === "confirm" && (
                  <>
                    <Button variant="outline" onClick={handleClose} size="sm">
                      {(modal.options as ConfirmOptions).cancelLabel || "Cancel"}
                    </Button>
                    <Button
                      variant={(modal.options as ConfirmOptions).destructive ? "destructive" : "default"}
                      onClick={handleConfirm}
                      size="sm"
                    >
                      {(modal.options as ConfirmOptions).confirmLabel || "Confirm"}
                    </Button>
                  </>
                )}
                {modal.type === "prompt" && (
                  <>
                    <Button variant="outline" onClick={handleClose} size="sm">
                      {(modal.options as PromptOptions).cancelLabel || "Cancel"}
                    </Button>
                    <Button onClick={handleConfirm} size="sm">
                      {(modal.options as PromptOptions).confirmLabel || "Submit"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error("useModal must be used within ModalProvider");
  return context;
}
