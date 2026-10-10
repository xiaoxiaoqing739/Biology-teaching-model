(() => {
  // shared/series-bridge.js
  var inSeriesShell = window.parent !== window;
  function markActive(id) {
    document.querySelectorAll(".experiment-switcher [data-experiment]").forEach((button) => {
      const active = button.dataset.experiment === id;
      button.classList.toggle("active", active);
      button.classList.toggle("energy-active", active && id === "energy");
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }
  document.querySelectorAll(".experiment-switcher [data-experiment]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.experiment;
      if (button.classList.contains("active")) return;
      if (inSeriesShell) window.parent.postMessage({ type: "series:switch", id }, "*");
      else location.href = `./index.html#${id}`;
    });
  });
  addEventListener("message", (event) => {
    const message = event.data;
    if (!message || typeof message !== "object") return;
    if (message.type === "series:set-active") markActive(message.id);
    if (message.type === "series:set-switching") document.body.classList.toggle("series-switching", Boolean(message.value));
  });
  window.seriesBridge = {
    notify(type, payload = {}) {
      if (inSeriesShell) window.parent.postMessage({ type, ...payload }, "*");
    }
  };
})();
