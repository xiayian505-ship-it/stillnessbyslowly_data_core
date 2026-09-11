/* Slowly Effects | 3D | Basic Tilt */
(() => {
  const items = document.querySelectorAll(".slowly-tilt");

  items.forEach((item) => {
    const max = () => Number(item.dataset.tiltMax || 8);

    item.addEventListener("pointermove", (event) => {
      const rect = item.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const angle = max();

      item.style.setProperty("--slowly-tilt-x", `${(0.5 - y) * angle * 2}deg`);
      item.style.setProperty("--slowly-tilt-y", `${(x - 0.5) * angle * 2}deg`);
    });

    item.addEventListener("pointerleave", () => {
      item.style.setProperty("--slowly-tilt-x", "0deg");
      item.style.setProperty("--slowly-tilt-y", "0deg");
    });
  });
})();
