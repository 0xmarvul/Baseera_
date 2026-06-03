import { useEffect } from "react";

export function useScrollReveal(selector = ".reveal", options = {}) {
  useEffect(() => {
    const els = document.querySelectorAll(selector);
    if (!("IntersectionObserver" in window) || els.length === 0) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px",
        ...options,
      }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [selector]);
}

export function useCountUp(selector = ".count-up", duration = 1600) {
  useEffect(() => {
    const nodes = document.querySelectorAll(selector);
    if (!("IntersectionObserver" in window) || nodes.length === 0) return;

    const animate = (node) => {
      const raw = node.getAttribute("data-target") ?? node.textContent;
      const match = String(raw).match(/([\d.]+)/);
      if (!match) return;
      const target = parseFloat(match[1]);
      const suffix = String(raw).replace(match[1], "");
      const isFloat = match[1].includes(".");
      const start = performance.now();

      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = target * eased;
        node.textContent = isFloat ? value.toFixed(1) + suffix : Math.round(value) + suffix;
        if (t < 1) requestAnimationFrame(step);
        else node.textContent = raw;
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animate(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [selector, duration]);
}
