// Native, free responsive helper.
// Keeps CSS aware of the real viewport size, especially on mobile browsers
// where 100vh can be unreliable because of browser toolbars.
const setResponsiveViewportState = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const root = document.documentElement;
  const width = window.innerWidth || root.clientWidth || 0;
  const height = window.innerHeight || root.clientHeight || 0;

  root.style.setProperty("--app-vw", `${width}px`);
  root.style.setProperty("--app-vh", `${height}px`);
  root.style.setProperty("--safe-viewport-height", `${height}px`);

  const device = width <= 420 ? "phone-narrow" : width <= 640 ? "phone" : width <= 900 ? "tablet" : "desktop";
  root.dataset.device = device;
  root.dataset.orientation = width > height ? "landscape" : "portrait";
};

setResponsiveViewportState();

if (typeof window !== "undefined") {
  let rafId = 0;
  const scheduleUpdate = () => {
    window.cancelAnimationFrame(rafId);
    rafId = window.requestAnimationFrame(setResponsiveViewportState);
  };

  window.addEventListener("resize", scheduleUpdate, { passive: true });
  window.addEventListener("orientationchange", scheduleUpdate, { passive: true });
  window.addEventListener("pageshow", scheduleUpdate, { passive: true });
}

export default setResponsiveViewportState;
