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
  return crypto.randomBytes(4).toString("base64url"); // ~6 символов
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
  db.get(
    "SELECT * FROM links WHERE token = ?",
    [req.params.token],
    (err, row) => {
      if (!row) return res.send(renderExpired());

      if (row.expires_at && Date.now() > row.expires_at)
        return res.send(renderExpired());

      res.send(renderProxyPage(row));
    }
  );
});

app.get("/go/wa/:token", (req, res) => {
  handleClick(req.params.token, "wa_left", res, row =>
    res.redirect(row.whatsapp)
  );
});

app.get("/go/tg/:token", (req, res) => {
  handleClick(req.params.token, "tg_left", res, row =>
    res.redirect(TELEGRAM_PROXY)
  );
});

function handleClick(token, field, res, cb) {
  db.get("SELECT * FROM links WHERE token = ?", [token], (err, row) => {
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
  const remaining =
    row.expires_at ? row.expires_at - Date.now() : null;

  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Proxy</title>
<style>
body{
  margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(180deg,#eef2f7,#dfe6ee);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
}
.card{
  width:100%;max-width:390px;padding:28px;border-radius:34px;
  background:rgba(255,255,255,.8);backdrop-filter:blur(30px);
  box-shadow:0 30px 60px rgba(0,0,0,.12);
}
h1{text-align:center;font-size:20px;margin-bottom:6px}
.sub{text-align:center;font-size:14px;opacity:.6;margin-bottom:18px}
.timer{text-align:center;font-size:15px;margin-bottom:18px}
.btn{
  display:flex;align-items:center;gap:12px;
  padding:16px;border-radius:26px;text-decoration:none;
  background:rgba(255,255,255,.9);
  box-shadow:0 12px 24px rgba(0,0,0,.15);
  margin-bottom:14px;font-weight:600;
}
.btn img{width:22px}
.wa{color:#25D366}
.tg{color:#0088cc}
</style>
</head>
<body>
<div class="card">
<h1>Подключение Proxy</h1>
<div class="sub">Выберите сервис</div>

${remaining ? `<div class="timer" id="timer"></div>` : ""}

<a class="btn wa" href="/go/wa/${row.token}">
<img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/whatsapp.svg">
Подключить WhatsApp
</a>

<a class="btn tg" href="/go/tg/${row.token}">
<img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/telegram.svg">
Подключить Telegram
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
  max-width:390px;padding:30px;border-radius:34px;
  background:rgba(255,255,255,.85);backdrop-filter:blur(30px);
  text-align:center;box-shadow:0 30px 60px rgba(0,0,0,.12);
}
h1{font-size:20px;margin-bottom:10px}
p{font-size:14px;opacity:.6;margin-bottom:20px}
.arrow{
  width:18px;height:18px;border-right:3px solid #ff7a00;
  border-bottom:3px solid #ff7a00;
  transform:rotate(45deg);margin:0 auto 10px;
  animation:float 1.4s infinite;
}
@keyframes float{
  0%,100%{transform:rotate(45deg) translate(0,0)}
  50%{transform:rotate(45deg) translate(5px,5px)}
}
a{
  display:block;padding:16px;border-radius:26px;
  background:linear-gradient(180deg,#ffb347,#ff7a00);
  color:#fff;font-weight:700;text-decoration:none;
  box-shadow:0 16px 32px rgba(255,122,0,.45);
}
</style>
</head>
<body>
<div class="card">
<h1>Срок действия ссылки завершён</h1>
<p>Если хотите подключить крутой VPN — нажмите кнопку ниже.</p>
<div class="arrow"></div>
<a href="${VPN_LINK}">Подключить VPN</a>
</div>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on " + PORT));
