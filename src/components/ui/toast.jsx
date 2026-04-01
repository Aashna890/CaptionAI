import * as React from "react";
import { cva } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Custom toast implementation (no Radix dependency)
// Fixed: onOpenChange is handled internally, never spread to DOM elements

const ToastProvider = ({ children }) => <>{children}</>;
ToastProvider.displayName = "ToastProvider";

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 pr-8 shadow-lg transition-all duration-300",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        destructive: "border-destructive bg-destructive text-destructive-foreground",
      },
      state: {
        open:   "animate-in slide-in-from-bottom-full fade-in-0",
        closed: "animate-out slide-out-to-right-full fade-out-80 pointer-events-none",
      },
    },
    defaultVariants: {
      variant: "default",
      state: "open",
    },
  }
);

const Toast = React.forwardRef(
  ({ className, variant, open, onOpenChange, children, ...props }, ref) => {
    // Don't render if fully closed (removed from state)
    // open=false triggers the closing animation via the state variant
    return (
      <div
        ref={ref}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        data-state={open ? "open" : "closed"}
        className={cn(
          toastVariants({ variant, state: open ? "open" : "closed" }),
          className
        )}
        // DO NOT spread onOpenChange — it's a custom prop, not a DOM attribute
        {...props}
      >
        {/* Inject onOpenChange via context so ToastClose can call it */}
        <ToastContext.Provider value={{ onOpenChange }}>
          {children}
        </ToastContext.Provider>
      </div>
    );
  }
);
Toast.displayName = "Toast";

// Internal context so ToastClose can access onOpenChange without prop drilling
const ToastContext = React.createContext({ onOpenChange: () => {} });

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

const ToastClose = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(ToastContext);

  const handleClick = (e) => {
    onOpenChange(false); // tell use-toast to dismiss
    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label="Close notification"
      className={cn(
        "absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50",
        className
      )}
      onClick={handleClick}
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  );
});
ToastClose.displayName = "ToastClose";

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};