# Head First · Module 01: Environment Setup & Attacker Mindset

*A friendlier on-ramp. Read this first if the tutorial page feels dense — then go do the lab.*

---

So here's the thing nobody tells you on day one: **you cannot defend what you cannot attack.** Before you write a single line of defense, you need a target you own and the eyes to see what the browser is really doing.

That target is a Flask app on `localhost:5000`. It's deliberately broken. Good. A locked door teaches you nothing about locks.

> **Brain Power**
> Two URLs: `http://localhost:5000` and `http://127.0.0.1:5000`. Same machine, right? So... same origin? (Answer below — and it will surprise you.)

The whole course rides on one question you'll ask of every feature you ever review:

> *"Can attacker-controlled bytes reach a place where the browser treats them as code running in this origin?"*

**Sharpen your pencil.** Open the lab. In the little reflected box on the index page, type `<b>hi</b>`, then `<img src=x onerror=alert(document.domain)>`. One renders bold text. One pops an alert. Same box. Why? Write down your guess before Module 02 tells you.

> **There are no Dumb Questions**
> **Q: Isn't `alert(1)` kind of... pointless?**
> A: The alert is a *smoke detector*, not the fire. It proves arbitrary JS runs in this origin. What that JS does next — steal the session, forge a password change — is the fire (Module 15).

**Same-origin answer:** No. The host *string* differs (`localhost` vs `127.0.0.1`), even though they resolve to the same machine. Origin is a string triple `(scheme, host, port)`, compared literally.

---

## Where to go next
- **Do the lab:** open `/m/module_01_setup/` in the running lab (`python lab_server.py` or `node server.js`).
- **Design notes:** this module's `DECISIONS.md`.
- **Back to the map:** the repo `README.md` has the full 19-module path.
