import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function CogniaLogo({ withText = true, size = 32 }: { withText?: boolean; size?: number }) {
  return (
    <Link to="/" className="flex items-center gap-2.5 group">
      <div
        className="relative flex items-center justify-center rounded-xl shadow-(--shadow-elegant) transition-transform group-hover:scale-105"
        style={{
          width: size,
          height: size,
          background: "var(--gradient-brand)",
        }}
      >
        <Sparkles className="text-white" style={{ width: size * 0.55, height: size * 0.55 }} strokeWidth={2.2} />
        <div
          className="absolute inset-0 rounded-xl opacity-60 blur-md -z-10"
          style={{ background: "var(--gradient-brand)" }}
        />
      </div>
      {withText && (
        <span className="text-lg font-semibold tracking-tight">
          <span className="gradient-text">Cognia</span>
          <span className="text-foreground/80"> AI</span>
        </span>
      )}
    </Link>
  );
}
