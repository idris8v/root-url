const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const TELEGRAM_PROXY =
  "https://t.me/proxy?server=45.146.167.58&port=443&secret=2b38fe5f7c7f35882d8616b9f0daf0fc";

const VPN_LINK = "https://freemanone.store/price.html";

function genToken() {
  return crypto.randomBytes(4).toString("base64url");
}

const db = new sqlite3.Database("./database.db");

db.run(`
CREATE TABLE IF NOT EXISTS links (
  token TEXT PRIMARY KEY,
  whatsapp TEXT,
  wa_left INTEGER,
  tg_left INTEGER,
  expires_at INTEGER
)
`);

app.post("/api/create", (req, res) => {
  const { whatsapp, mode, value } = req.body;
  const token = genToken();

  let wa_left = parseInt(value);
  let tg_left = parseInt(value);
  let expires_at = null;

  if (mode === "time") {
    expires_at = Date.now() + parseInt(value) * 60000;
    wa_left = 9999;
    tg_left = 9999;
  }

  db.run(
    `INSERT INTO links (token, whatsapp, wa_left, tg_left, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [token, whatsapp, wa_left, tg_left, expires_at],
    () => res.json({ token })
  );
});

app.get("/:token", (req, res) => {
  db.get("SELECT * FROM links WHERE token = ?", [req.params.token], (e, row) => {
    if (!row) return res.send(renderExpired());
    if (row.expires_at && Date.now() > row.expires_at)
      return res.send(renderExpired());
    res.send(renderProxyPage(row));
  });
});

app.get("/go/wa/:token", (req, res) => {
  handleClick(req.params.token, "wa_left", res, row =>
    res.redirect(row.whatsapp)
  );
});

app.get("/go/tg/:token", (req, res) => {
  handleClick(req.params.token, "tg_left", res, () =>
    res.redirect(TELEGRAM_PROXY)
  );
});

function handleClick(token, field, res, cb) {
  db.get("SELECT * FROM links WHERE token = ?", [token], (e, row) => {
    if (!row) return res.send(renderExpired());
    if (row.expires_at && Date.now() > row.expires_at)
      return res.send(renderExpired());
    if (row[field] <= 0) return res.send(renderExpired());

    db.run(
      `UPDATE links SET ${field} = ${field} - 1 WHERE token = ?`,
      [token],
      () => cb(row)
    );
  });
}

function renderProxyPage(row) {
  const remaining = row.expires_at ? row.expires_at - Date.now() : null;

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proxy</title>
<style>
*{-webkit-tap-highlight-color:transparent}
body{
  margin:0;
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(180deg,#eef2f7,#dfe6ee);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
  font-weight:400;
}
.card{
  width:100%;
  max-width:390px;
  padding:28px;
  border-radius:32px;
  background:rgba(255,255,255,.85);
  backdrop-filter:blur(30px);
  box-shadow:0 30px 60px rgba(0,0,0,.12);
  animation:fade .6s ease;
}
@keyframes fade{
  from{opacity:0;transform:translateY(16px)}
  to{opacity:1;transform:none}
}
h1{
  text-align:center;
  font-size:19px;
  margin-bottom:6px;
}
.sub{
  text-align:center;
  font-size:14px;
  opacity:.55;
  margin-bottom:22px;
}
.timer{
  text-align:center;
  font-size:14px;
  margin-bottom:18px;
}
.btn{
  display:flex;
  align-items:center;
  gap:14px;
  padding:16px;
  border-radius:22px;
  text-decoration:none;
  margin-bottom:14px;
  transition:.25s ease;
}
.btn:active{
  transform:scale(.97);
}
.btn svg{
  width:22px;
  height:22px;
}
.wa{
  background:linear-gradient(180deg,#3ddc84,#2bb673);
  color:#fff;
}
.tg{
  background:linear-gradient(180deg,#4aa3df,#1c7ed6);
  color:#fff;
}
</style>
</head>
<body>
<div class="card">
<h1>Подключение Proxy</h1>
<div class="sub">Выберите сервис</div>

${remaining ? `<div class="timer" id="timer"></div>` : ""}

<a class="btn wa" href="/go/wa/${row.token}" onclick="vibe()">
<svg viewBox="0 0 24 24" fill="none">
<path d="M20.5 3.5A11 11 0 003.2 17.3L2 22l4.9-1.2A11 11 0 1020.5 3.5z" fill="white" opacity=".25"/>
<path d="M16.6 13.5c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-1 .9-.2 0-.4 0-.7-.2-.3-.2-1.2-.4-2.3-1.4-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.2-.7.2-.2.3-.4.5-.6.2-.2.3-.3.5-.5.2-.2.3-.3.4-.5.1-.2 0-.4 0-.5-.1-.2-.7-1.7-1-2.3-.3-.6-.6-.5-.7-.5h-.6c-.2 0-.5.1-.7.3-.2.2-1 1-1 2.4 0 1.4 1 2.8 1.1 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.3.2-.6.2-1.1.2-1.2 0-.1-.2-.2-.4-.3z" fill="white"/>
</svg>
Подключить для WhatsApp
</a>

<a class="btn tg" href="/go/tg/${row.token}" onclick="vibe()">
<svg viewBox="0 0 24 24" fill="none">
<path d="M22 2L2 11.8l5.6 2.1L9.6 21l3.1-4.2 4.9 3.6L22 2z" fill="white"/>
</svg>
Подключить для Telegram
</a>

</div>

${remaining ? `
<script>
let t=${remaining};
const el=document.getElementById("timer");
setInterval(()=>{
 if(t<=0)return;
 const m=Math.floor(t/60000);
 const s=Math.floor((t%60000)/1000);
 el.textContent="Ссылка активна ещё "+m+" мин "+s+" сек";
 t-=1000;
},1000);
function vibe(){ if(navigator.vibrate) navigator.vibrate(15); }
</script>` : ""}

</body>
</html>`;
}

function renderExpired() {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Истекло</title>
<style>
body{
  margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,#eef2f7,#dfe6ee);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
}
.card{
  max-width:390px;padding:30px;border-radius:32px;
  background:rgba(255,255,255,.9);backdrop-filter:blur(30px);
  text-align:center;box-shadow:0 30px 60px rgba(0,0,0,.12);
}
h1{font-size:19px;margin-bottom:10px}
p{font-size:14px;opacity:.6;margin-bottom:20px}
.arrow{
  width:14px;height:14px;
  border-right:3px solid #ff7a00;
  border-bottom:3px solid #ff7a00;
  transform:rotate(45deg);
  margin:0 auto 12px;
  animation:float 1.4s infinite;
}
@keyframes float{
  0%,100%{transform:rotate(45deg) translate(0,0)}
  50%{transform:rotate(45deg) translate(3px,3px)}
}
a{
  display:block;padding:16px;border-radius:24px;
  background:linear-gradient(180deg,#ffb347,#ff7a00);
  color:#fff;font-weight:600;text-decoration:none;
}
</style>
</head>
<body>
<div class="card">
<h1>Срок действия ссылки завершён</h1>
<p>Если хотите подключить VPN — нажмите кнопку ниже.</p>
<div class="arrow"></div>
<a href="${VPN_LINK}">Подключить VPN</a>
</div>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on " + PORT));
