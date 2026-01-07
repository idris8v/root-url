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
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>ПРОКСИ</title>
<style>
*{-webkit-tap-highlight-color:transparent;box-sizing:border-box}
html,body{margin:0;padding:0}
body{
  height:100svh;
  background:linear-gradient(180deg,#eef2f7,#dfe6ee);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
}
.app{
  height:100%;
  padding:0 32px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.card{
  width:100%;
  max-width:360px;
  padding:30px 26px 34px;
  border-radius:32px;
  background:rgba(255,255,255,.88);
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
  font-size:20px;
  font-weight:400;
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
  display:block;
  padding:18px;
  border-radius:22px;
  text-align:center;
  text-decoration:none;
  font-size:14px;
  letter-spacing:.05em;
  color:#fff;
  margin-bottom:14px;
  transition:.25s ease;
}
.btn:active{transform:scale(.97)}
.wa{background:linear-gradient(180deg,#3ddc84,#2bb673)}
.tg{background:linear-gradient(180deg,#4aa3df,#1c7ed6)}
</style>
</head>
<body>
<div class="app">
<div class="card">
<h1>Прокси от Freeman VPN</h1>
<div class="sub">Подключи и у тебя будет Whatsapp и Telegram будут работать без VPN</div>

${remaining ? `<div class="timer" id="timer"></div>` : ""}

<a class="btn wa" href="/go/wa/${row.token}" onclick="vibe()">
ПОДКЛЮЧИТЬ ДЛЯ WHATSAPP
</a>

<a class="btn tg" href="/go/tg/${row.token}" onclick="vibe()">
ПОДКЛЮЧИТЬ ДЛЯ TELEGRAM
</a>
</div>
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
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Истекло</title>
<style>
html,body{margin:0;padding:0}
body{
  height:100svh;
  background:linear-gradient(180deg,#eef2f7,#dfe6ee);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
}
.app{
  height:100%;
  padding:0 32px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.card{
  max-width:360px;
  padding:32px;
  border-radius:32px;
  background:rgba(255,255,255,.9);
  backdrop-filter:blur(30px);
  text-align:center;
  box-shadow:0 30px 60px rgba(0,0,0,.12);
}
h1{font-size:20px;margin-bottom:10px}
p{font-size:14px;opacity:.6;margin-bottom:20px}
.arrow{
  width:14px;height:14px;
  border-right:3px solid #ff7a00;
  border-bottom:3px solid #ff7a00;
  transform:rotate(45deg);
  margin:0 auto 14px;
  animation:float 1.4s infinite;
}
@keyframes float{
  0%,100%{transform:rotate(45deg) translate(0,0)}
  50%{transform:rotate(45deg) translate(3px,3px)}
}
a{
  display:block;
  padding:16px;
  border-radius:24px;
  background:linear-gradient(180deg,#ffb347,#ff7a00);
  color:#fff;
  text-decoration:none;
}
</style>
</head>
<body>
<div class="app">
<div class="card">
<h1>Срок действия ссылки завершён</h1>
<p>Если хотите подключить VPN — нажмите кнопку ниже.</p>
<div class="arrow"></div>
<a href="${VPN_LINK}">ПОДКЛЮЧИТЬ VPN</a>
</div>
</div>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on " + PORT));
