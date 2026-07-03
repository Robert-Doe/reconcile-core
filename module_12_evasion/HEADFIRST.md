# Head First · Module 12: Filter Evasion & Obfuscation

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

This module exists to kill one idea for good: **string/regex matching on payloads is unwinnable.** The browser has a hundred equivalent spellings for any payload, and every new spec adds more.

Every bypass exploits the same flaw — **the filter and the browser decode at different times.** The filter matches bytes; the browser parses and decodes through a stateful, multi-context machine.

> **Brain Power**
> The lab WAF blocks `script`, `onerror`, `javascript:`, and `alert`. Can you still pop an alert? (Yes — `<svg onload=confirm(document.domain)>` uses none of them.)

**Sharpen your pencil.** Bypass `/waf-search` five structurally different ways: alternate handler, alternate function, string reconstruction (`window['al'+'ert']`), separator tricks (`<svg/onload=`), and an encoding decode-boundary. Each breaks a different assumption.

> **There are no Dumb Questions**
> **Q: So what DOES work, if not filtering?**
> A: Allowlists (tiny known-safe set), contextual output encoding (byte made inert regardless of spelling), and capability defenses (CSP/Trusted Types stop *execution*, so obfuscation is irrelevant).

---

## Where to go next
- **Do the lab:** open `/m/module_12_evasion/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
