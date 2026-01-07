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

  if (mode === "views") {
    max_views = parseInt(value);
  } else if (mode === "time") {
    expires_at = Date.now() + parseInt(value) * 60 * 1000;
  }

  db.run(
    `INSERT INTO links (token, whatsapp, mode, max_views, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [token, whatsapp, mode, max_views, expires_at],
    () => res.json({ token })
  );
});

app.get("/l/:token", (req, res) => {
  const { token } = req.params;

  db.get(
    "SELECT * FROM links WHERE token = ?",
    [token],
    (err, row) => {
      if (!row) return res.send(renderExpired());

      if (row.mode === "views") {
        if (row.views >= row.max_views) return res.send(renderExpired());

        db.run("UPDATE links SET views = views + 1 WHERE token = ?", [token]);
        return res.send(renderProxyPage(row.whatsapp, null));
      }

      if (row.mode === "time") {
        const remaining = row.expires_at - Date.now();
        if (remaining <= 0) return res.send(renderExpired());

        return res.send(renderProxyPage(row.whatsapp, remaining));
      }
    }
  );
});

function renderProxyPage(wa, remainingMs) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>Proxy</title>
<style>
body {
  margin:0;
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  background:linear-gradient(180deg,#f2f4f8,#e9ecf1);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
}
.card {
  width:100%;
  max-width:390px;
  padding:24px;
  border-radius:28px;
  background:rgba(255,255,255,0.6);
  backdrop-filter:blur(20px);
  box-shadow:0 20px 40px rgba(0,0,0,0.1);
}
h1 {
  text-align:center;
  font-size:18px;
  margin-bottom:16px;
}
.timer {
  text-align:center;
  font-size:14px;
  margin-bottom:18px;
  opacity:0.7;
}
.btn {
  display:flex;
  align-items:center;
  justify-content:center;
  gap:12px;
  padding:16px;
  border-radius:20px;
  font-size:16px;
  font-weight:600;
  color:white;
  text-decoration:none;
  margin-bottom:14px;
}
.wa { background:linear-gradient(180deg,#3ddc84,#1fa855); }
.tg { background:linear-gradient(180deg,#3da9fc,#007adf); }
</style>
</head>
<body>
<div class="card">
<h1>Подключение Proxy</h1>
${remainingMs ? `<div class="timer" id="timer"></div>` : ""}
<a class="btn wa" href="${wa}">Подключить WhatsApp</a>
<a class="btn tg" href="${TELEGRAM_PROXY}">Подключить Telegram</a>
</div>

${remainingMs ? `
<script>
let remaining=${remainingMs};
const el=document.getElementById("timer");
function tick(){
  if(remaining<=0)return;
  const m=Math.floor(remaining/60000);
  const s=Math.floor((remaining%60000)/1000);
  el.textContent="Ссылка активна ещё "+m+" мин "+s+" сек";
  remaining-=1000;
}
tick();
setInterval(tick,1000);
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
  justify-content:center;
  align-items:center;
  background:linear-gradient(180deg,#f2f4f8,#e9ecf1);
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",sans-serif;
}
.card {
  max-width:390px;
  padding:26px;
  border-radius:28px;
  background:rgba(255,255,255,0.6);
  backdrop-filter:blur(20px);
  text-align:center;
}
h1 { font-size:18px; margin-bottom:12px; }
p { font-size:14px; opacity:0.7; margin-bottom:24px; }
.arrow {
  width:40px;
  height:40px;
  margin:0 auto 12px;
  border-right:3px solid #000;
  border-bottom:3px solid #000;
  transform:rotate(45deg);
  animation:float 1.5s infinite;
}
@keyframes float {
  0% { transform:rotate(45deg) translate(0,0); }
  50% { transform:rotate(45deg) translate(6px,6px); }
  100% { transform:rotate(45deg) translate(0,0); }
}
a {
  display:block;
  padding:14px;
  border-radius:20px;
  background:#000;
  color:#fff;
  font-weight:600;
  text-decoration:none;
}
</style>
</head>
<body>
<div class="card">
<h1>Срок действия ссылки завершён</h1>
<p>Временный доступ больше недоступен.<br>Новые ссылки выдаются регулярно.</p>
<div class="arrow"></div>
<a href="${VPN_LINK}">Подключить VPN</a>
</div>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started on " + PORT));
