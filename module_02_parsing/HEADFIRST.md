# Head First · Module 02: How Browsers Parse HTML

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

Here's the secret at the bottom of every XSS: **the HTML parser never says no.** Feed it garbage and it doesn't throw an error — it *recovers*, following a giant, fully-specified recipe, and hands you a DOM tree anyway. That recovery is the attack surface.

Think of the parser as a two-person kitchen. The **tokenizer** is a line cook chopping the byte stream into tokens, moving between states (Data, RAWTEXT, Script-data...). The **tree builder** plates those tokens into a DOM, auto-closing tags, moving illegal table content around, untangling misnested bold/italic.

> **Brain Power**
> You send `<p>a<p>b<p>c`. You never closed a single `<p>`. How many paragraph nodes do you get, and are they nested or siblings?

**Sharpen your pencil.** In `parser_demo.html`, paste `<table><b>x</b><td>cell</table>` and look at the built tree. Where did the `<b>` go? (Hint: *outside* the table. It got "foster parented.")

The punchline you'll spend the rest of the course exploiting: **`reserialize(parse(x))` is not always `x`.** Parse and serialize are not inverses. That single inequality is the seed of mutation XSS (Module 13).

> **There are no Dumb Questions**
> **Q: If my sanitizer uses the real browser to parse, isn't it safe?**
> A: It parses *once*, cleans, and serializes a string. The sink parses that string *again*. If the second parse differs, you cleaned a tree the browser never renders. That's the whole game.

(`<p>a<p>b<p>c` → three *sibling* paragraphs. The parser auto-closes each `<p>` at the next one.)

---

## Where to go next
- **Do the lab:** open `/m/module_02_parsing/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
