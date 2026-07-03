/* vuln_spa_proto.js — a client app with a prototype-pollution -> DOM XSS gadget.
   Loaded by attack_11_proto.html.

   The bug has TWO halves, which is what makes prototype pollution subtle:

     (1) A pollution SINK: an unsafe deep-merge / query parser that will walk
         into `__proto__` and write onto Object.prototype. After this, EVERY
         object in the page inherits the attacker's property.

     (2) A GADGET: innocent-looking app code that reads a config property which
         is normally absent, so it falls through to the (now polluted) prototype,
         and passes that value to a DOM sink (innerHTML). No direct injection
         point is needed — the attacker never controls the sink's argument
         directly; they control the DEFAULT via the prototype.

   Trigger:  ?__proto__[widgetHtml]=<img src=x onerror=alert(document.domain)>
*/
(function () {
  "use strict";

  // (1) THE POLLUTION SINK — a naive "parse query string into nested object".
  // Supports bracket notation like a[b][c]=v. It does NOT reject __proto__,
  // so a[__proto__][x]=v writes onto Object.prototype.
  function unsafeParseQuery(search) {
    const params = new URLSearchParams(search);
    const root = {};
    for (const [rawKey, value] of params) {
      // keys like "__proto__[widgetHtml]" or "a[b][c]"
      const path = rawKey
        .replace(/\]/g, "")
        .split("[")
        .filter(Boolean);
      let node = root;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        // VULNERABILITY: no guard against __proto__ / constructor / prototype.
        if (!(k in node)) node[k] = {};
        node = node[k]; // walking into node["__proto__"] === Object.prototype
      }
      node[path[path.length - 1]] = value;
    }
    return root;
  }

  // (2) THE GADGET — render a widget. `config.widgetHtml` is USUALLY undefined,
  // so the app uses innerHTML with whatever it finds. When the prototype is
  // polluted, `config.widgetHtml` is inherited and attacker-controlled.
  function renderWidget(config) {
    const box = document.getElementById("widget");
    if (!box) return;
    // Looks safe to the developer: "we only set innerHTML from our own config".
    // But `widgetHtml` can now come from Object.prototype.
    const html = config.widgetHtml || "Welcome to your dashboard.";
    box.innerHTML = html; // SINK
    return html;
  }

  // Demonstration harness used by the tutorial page.
  window.ProtoDemo = {
    unsafeParseQuery,
    renderWidget,

    // Show the state of the pollution for the UI.
    inspect() {
      return {
        polluted: Object.prototype.hasOwnProperty("widgetHtml") === false &&
                  ({}).widgetHtml !== undefined,
        inheritedValue: ({}).widgetHtml,
      };
    },

    // Run the full flow against the current URL's query string.
    run() {
      const cfg = unsafeParseQuery(location.search); // (1) pollutes if malicious
      // The app then constructs a FRESH, empty config for the widget...
      const widgetConfig = {}; // developer thinks: "empty, nothing user-supplied"
      // ...but {} now inherits widgetHtml from the polluted prototype.
      const used = renderWidget(widgetConfig); // (2) gadget reads polluted default
      return { parsed: cfg, usedHtml: used, inheritedValue: ({}).widgetHtml };
    },

    // Cleanup so repeated experiments don't stay polluted.
    cleanup() {
      delete Object.prototype.widgetHtml;
      delete Object.prototype.innerHTML;
      delete Object.prototype.src;
    },
  };
})();
