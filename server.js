const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

const TELEGRAM_PROXY =
  "https://t.me/proxy?server=45.146.167.58&port=443&secret=2b38fe5f7c7f35882d8616b9f0daf0fc";

const VPN_LINK = "https://freemanone.store/price.html";

const db = new sqlite3.Database("./database.db");

db.run(`
CREATE TABLE IF NOT EXISTS links (
  token TEXT PRIMARY KEY,
  whatsapp TEXT,
  mode TEXT,
  max_views INTEGER,
  expires_at INTEGER,
  views INTEGER DEFAULT 0
)
`);

app.post("/api/create", (req, res) => {
  const { whatsapp, mode, value } = req.body;
  if (!whatsapp || !mode || !value) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const token = uuidv4();
  let max_views = null;
  let expires_at = null;

  if (mode === "views") max_views = parseInt(value);
  if (mode === "time") expires_at = Date.now() + parseInt(value) * 60000;

  db.run(
    `INSERT INTO links (token, whatsapp, mode, max_views, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [token, whatsapp, mode, max_views, expires_at],
    () => res.json({ token })
  );
});

app.get("/l/:token", (req, res) => {
  db.get(
    "SELECT * FROM links WHERE token = ?",
    [req.params.token],
    (err, row) => {
      if (!row) return res.send(renderExpired());

      if (row.mode === "views") {
        if (row.views >= row.max_views) return res.send(renderExpired());
        db.run("UPDATE links SET views = views + 1 WHERE token = ?", [row.token]);
        return res.send(renderProxy(row.whatsapp, null));
      }

      if (row.mode === "time") {
        const remain = row.expires_at - Date.now();
        if (remain <= 0) return res.send(renderExpired());
        return res.send(renderProxy(row.whatsapp, remain));
      }
    }
  );
});

function renderProxy(wa, remainingMs) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Proxy</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/whatsapp.svg">
<style>
body {
  margin:0;
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(180deg,#eef2f7,#dfe6ee);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
}
.card {
  width:100%;
  max-width:390px;
  padding:28px;
  border-radius:32px;
  background:rgba(255,255,255,0.75);
  backdrop-filter:blur(30px);
  box-shadow:
    0 30px 60px rgba(0,0,0,0.12),
    inset 0 1px 0 rgba(255,255,255,0.8);
}
h1 {
  text-align:center;
  font-size:20px;
  margin-bottom:8px;
}
.sub {
  text-align:center;
  font-size:14px;
  opacity:.6;
  margin-bottom:20px;
}
.timer {
  text-align:center;
  font-size:15px;
  margin-bottom:22px;
}
.btn {
  display:flex;
  align-items:center;
  gap:14px;
  padding:16px;
  border-radius:24px;
  font-size:16px;
  font-weight:600;
  text-decoration:none;
  margin-bottom:14px;
  box-shadow:0 14px 28px rgba(0,0,0,.18);
}
.btn img {
  width:24px;
  height:24px;
}
.wa {
  color:#0a3;
  background:linear-gradient(180deg,#e8fff2,#c9f5df);
}
.tg {
  color:#0066cc;
  background:linear-gradient(180deg,#e9f4ff,#cfe8ff);
}
</style>
</head>
<body>
<div class="card">
<h1>Подключение Proxy</h1>
<div class="sub">Выберите сервис</div>

${remainingMs ? `<div class="timer" id="timer"></div>` : ""}

<a class="btn wa" href="${wa}">
  <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/whatsapp.svg">
  Подключить WhatsApp
</a>

<a class="btn tg" href="${TELEGRAM_PROXY}">
  <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/telegram.svg">
  Подключить Telegram
</a>
</div>

${remainingMs ? `
<script>
let t=${remainingMs};
const el=document.getElementById("timer");
setInterval(()=>{
  if(t<=0)return;
  const m=Math.floor(t/60000);
  const s=Math.floor((t%60000)/1000);
  el.textContent="Ссылка активна ещё "+m+" мин "+s+" сек";
  t-=1000;
},1000);
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
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Истекло</title>
<style>
body {
  margin:0;
  height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(180deg,#eef2f7,#dfe6ee);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
}
.card {
  max-width:390px;
  padding:30px;
  border-radius:34px;
  background:rgba(255,255,255,0.8);
  backdrop-filter:blur(30px);
  text-align:center;
  box-shadow:0 30px 60px rgba(0,0,0,.12);
}
h1 { font-size:20px; margin-bottom:10px; }
p { font-size:14px; opacity:.65; margin-bottom:24px; }
.arrow {
  width:24px;
  height:24px;
  border-right:3px solid #ff7a00;
  border-bottom:3px solid #ff7a00;
  transform:rotate(45deg);
  margin:0 auto 14px;
  animation:float 1.4s infinite;
}
@keyframes float {
  0%,100% { transform:rotate(45deg) translate(0,0); }
  50% { transform:rotate(45deg) translate(6px,6px); }
}
a {
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  padding:16px;
  border-radius:26px;
  background:linear-gradient(180deg,#ffb347,#ff7a00);
  color:#fff;
  font-weight:700;
  text-decoration:none;
  box-shadow:0 16px 32px rgba(255,122,0,.45);
}
a img { width:22px; }
</style>
</head>
<body>
<div class="card">
<h1>Срок действия ссылки завершён</h1>
<p>
Временный доступ к Proxy недоступен.<br>
Если хотите бесплатно подключать Proxy для WhatsApp и Telegram — используйте VPN.
</p>
<div class="arrow"></div>
<a href="${VPN_LINK}">
  <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/shield.svg">
  Подключить VPN
</a>
</div>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on " + PORT));
