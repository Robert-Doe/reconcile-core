/* naive_sanitizer.js — two "reasonable" sanitizers that are structurally broken.
   Loaded by attack_10_mxss.html.

   The point of this file is NOT to give you a sanitizer to use. It is to let you
   FEEL why string-level and even naive DOM-level sanitization fail against the
   real parser. Use DOMPurify (Module 17) in real code — and even then, configure
   it carefully.

   Two sanitizers are provided:

     naiveRegexSanitize(s)  — pure string/regex. Fails to the "overlapping tag"
                              and decode-mismatch classes.
     naiveDomSanitize(s)    — parses to a DOM, strips <script> and on* attributes,
                              re-serializes. Fails to MUTATION XSS: its output,
                              when the browser RE-PARSES it, can regrow a handler
                              that was not present in the tree it inspected.

   The exported helper `roundTrip(s)` shows the mXSS core:
     reserialize(parse(s)) !== s   =>   sanitize-then-render is unsound.
*/
(function () {
  "use strict";

  // --- 1. The string/regex sanitizer (obviously fragile) -------------------
  function naiveRegexSanitize(s) {
    // Strip <script>...</script>, and on*= handlers. Runs ONCE (no recursion).
    return s
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
      .replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  }

  // --- 2. The naive DOM sanitizer (looks much better, still unsound) --------
  function naiveDomSanitize(s) {
    const doc = new DOMParser().parseFromString(s, "text/html");
    // Remove obvious code elements.
    doc.querySelectorAll("script, iframe, object, embed").forEach((n) =>
      n.remove()
    );
    // Remove every on* attribute and javascript: URLs.
    doc.querySelectorAll("*").forEach((el) => {
      [...el.attributes].forEach((a) => {
        const name = a.name.toLowerCase();
        const val = a.value.toLowerCase().replace(/\s+/g, "");
        if (name.startsWith("on")) el.removeAttribute(a.name);
        if (
          (name === "href" || name === "src" || name === "xlink:href") &&
          val.startsWith("javascript:")
        )
          el.removeAttribute(a.name);
      });
    });
    // Re-serialize. THIS is where mutation is (re)introduced: the string we hand
    // back may parse differently than the tree we just cleaned.
    return doc.body.innerHTML;
  }

  // --- The mXSS core: does the string survive a parse/serialize round-trip? --
  function serialize(fragmentHtml) {
    const t = document.createElement("template");
    t.innerHTML = fragmentHtml;
    return t.innerHTML;
  }

  function roundTrip(s) {
    const once = serialize(s);
    const twice = serialize(once);
    return {
      input: s,
      afterParse1: once,
      afterParse2: twice,
      stable: once === twice, // if false, you have an mXSS candidate
    };
  }

  // Detect whether a string, once parsed by the browser, contains an element
  // carrying an on* handler (i.e., a live event sink) — regardless of what a
  // sanitizer thought.
  function hasLiveHandler(html) {
    const t = document.createElement("template");
    t.innerHTML = html;
    return [...t.content.querySelectorAll("*")].some((el) =>
      [...el.attributes].some((a) => a.name.toLowerCase().startsWith("on"))
    );
  }

  window.NaiveSanitizer = {
    naiveRegexSanitize,
    naiveDomSanitize,
    roundTrip,
    hasLiveHandler,
    serialize,
  };
})();
