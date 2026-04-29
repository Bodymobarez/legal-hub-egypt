import { useEffect, useState } from "react";

interface SplashScreenProps {
  onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Phase timeline (total 10 seconds):
    // 0ms     – enter animations begin
    // 600ms   – hold phase (all elements visible)
    // 9200ms  – exit fade-out starts
    // 10000ms – done, unmount

    const holdTimer = setTimeout(() => setPhase("hold"), 600);
    const exitTimer = setTimeout(() => setPhase("exit"), 9200);
    const doneTimer = setTimeout(() => onDone(), 10000);

    // Progress bar: fill over ~8.6 seconds (600ms → 9200ms)
    let start: number | null = null;
    let raf: number;
    const duration = 8600;

    const animateProgress = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);
      if (elapsed < duration) {
        raf = requestAnimationFrame(animateProgress);
      }
    };

    const progressStart = setTimeout(() => {
      raf = requestAnimationFrame(animateProgress);
    }, 600);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
      clearTimeout(progressStart);
      cancelAnimationFrame(raf);
    };
  }, [onDone]);

  return (
    <div
      className="splash-root"
      data-phase={phase}
      aria-hidden="true"
    >
      {/* Ambient gradient orbs */}
      <div className="splash-orb splash-orb-1" />
      <div className="splash-orb splash-orb-2" />
      <div className="splash-orb splash-orb-3" />

      {/* Decorative grid lines */}
      <div className="splash-grid" />

      {/* Gold horizontal rule top */}
      <div className="splash-rule splash-rule-top" />
      {/* Gold horizontal rule bottom */}
      <div className="splash-rule splash-rule-bottom" />

      {/* Main content */}
      <div className="splash-content">

        {/* Outer ring */}
        <div className="splash-ring splash-ring-outer" />
        {/* Inner ring */}
        <div className="splash-ring splash-ring-inner" />

        {/* Logo */}
        <div className="splash-logo-wrap">
          <img
            src="/logo.jpeg"
            alt="Egypt Advocates"
            className="splash-logo-img"
            draggable={false}
          />
          {/* Gold shimmer overlay */}
          <div className="splash-logo-shimmer" />
        </div>

        {/* Firm name */}
        <div className="splash-name-wrap">
          <h1 className="splash-name-ar">مكتب محمد عثمان للمحاماة</h1>
          <p className="splash-name-en">Egypt Advocates</p>
          <div className="splash-divider">
            <span className="splash-divider-line" />
            <span className="splash-divider-diamond" />
            <span className="splash-divider-line" />
          </div>
          <p className="splash-tagline">
            <span className="splash-tagline-ar">خبرة قانونية • ثقة راسخة</span>
            <span className="splash-tagline-sep"> · </span>
            <span className="splash-tagline-en">Legal Excellence · Trusted Counsel</span>
          </p>
        </div>

        {/* Progress bar */}
        <div className="splash-progress-wrap">
          <div className="splash-progress-track">
            <div
              className="splash-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="splash-dots">
            <span className="splash-dot" style={{ animationDelay: "0s" }} />
            <span className="splash-dot" style={{ animationDelay: "0.2s" }} />
            <span className="splash-dot" style={{ animationDelay: "0.4s" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
