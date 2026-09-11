/* Slowly Effects | Scroll | Basic Scroll Progress */
(() => {
  const bars = document.querySelectorAll(".slowly-scroll-progress");
  if (!bars.length) return;

  const update = () => {
    const doc = document.documentElement;
    const max = doc.scrollHeight - doc.clientHeight;
    const progress = max > 0 ? doc.scrollTop / max : 0;

    bars.forEach((bar) => {
      bar.style.setProperty(
        "--slowly-scroll-progress",
        Math.min(1, Math.max(0, progress))
      );
    });
  };

  update();
  addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
})();
