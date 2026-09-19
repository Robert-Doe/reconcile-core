/* lab.js — tiny shared helpers for tutorial pages.
   Served at /m/assets/lab.js

   Deliberately dependency-free. Provides:
     - copy-to-clipboard buttons  (<button class="copy" data-copy="#id">)
     - a sandboxed "run" button that renders a payload into a demo <iframe>
       so students can SEE execution without navigating away.

   The sandboxed iframe uses `srcdoc`. Note (this is itself a teaching point):
   `srcdoc` decodes HTML entities before parsing, and an iframe WITHOUT a
   `sandbox` attribute runs script in a same-origin-ish context. We add
   `sandbox="allow-scripts"` here so demo payloads execute but CANNOT touch the
   parent lab origin — that is the safe way to demo live payloads.
*/
(function () {
  "use strict";

  function flash(btn, text) {
    const old = btn.textContent;
    btn.textContent = text;
    setTimeout(() => (btn.textContent = old), 1100);
  }

  document.addEventListener("click", function (e) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;

    if (t.matches("button.copy")) {
      const sel = t.getAttribute("data-copy");
      const src = sel ? document.querySelector(sel) : null;
      const val = src ? (src.value ?? src.textContent) : "";
      navigator.clipboard.writeText(val).then(() => flash(t, "copied!"));
    }

    if (t.matches("button.run")) {
      const sel = t.getAttribute("data-payload");
      const src = sel ? document.querySelector(sel) : null;
      const frameSel = t.getAttribute("data-target");
      const frame = frameSel ? document.querySelector(frameSel) : null;
      if (!src || !frame) return;
      const payload = src.value ?? src.textContent ?? "";
      // Render inside a SCRIPT-ENABLED but SANDBOXED iframe. This is the safe
      // demo harness: the payload executes so you can observe it, but it is
      // isolated from the lab's real origin.
      frame.setAttribute("sandbox", "allow-scripts allow-modals");
      frame.srcdoc =
        "<!doctype html><meta charset=utf-8>" +
        "<body style='font:14px system-ui;margin:8px;color:#333'>" +
        "<div style='color:#888'>sandboxed demo output ↓</div>" +
        payload +
        "</body>";
    }
  });
})();
