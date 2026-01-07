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
    payload TEXT,
    max_views INTEGER,
    views INTEGER DEFAULT 0
  )
`);

app.post("/api/create", (req, res) => {
  const { whatsapp, views } = req.body;
  if (!whatsapp || !views) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const token = uuidv4();

  db.run(
    "INSERT INTO links (token, payload, max_views) VALUES (?, ?, ?)",
    [token, whatsapp, views],
    () => res.json({ token })
  );
});

app.get("/l/:token", (req, res) => {
  const { token } = req.params;

  db.get(
    "SELECT payload, views, max_views FROM links WHERE token = ?",
    [token],
    (err, row) => {
      if (!row) {
        return res.send(renderExpired());
      }

      if (row.views >= row.max_views) {
        return res.send(renderExpired());
      }

      db.run(
        "UPDATE links SET views = views + 1 WHERE token = ?",
        [token]
      );

      res.send(renderProxyPage(row.payload, TELEGRAM_PROXY));
    }
  );
});

function renderProxyPage(wa, tg) {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proxy</title>
<style>
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #f2f4f8, #e9ecf1);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
}
.card {
  width: 100%;
  max-width: 360px;
  padding: 24px;
  border-radius: 28px;
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
}
h1 {
  text-align: center;
  font-size: 18px;
  margin-bottom: 20px;
}
.btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 14px;
}
.wa {
  background: linear-gradient(180deg, #3ddc84, #1fa855);
}
.tg {
  background: linear-gradient(180deg, #3da9fc, #007adf);
}
.icon {
  width: 24px;
  height: 24px;
}
</style>
</head>
<body>
<div class="card">
  <h1>Подключение Proxy</h1>

  <a class="btn wa" href="${wa}">
    <img class="icon" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/whatsapp.svg">
    WhatsApp
  </a>

  <a class="btn tg" href="${tg}">
    <img class="icon" src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/telegram.svg">
    Telegram
  </a>
</div>
</body>
</html>
`;
}

function renderExpired() {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ссылка истекла</title>
<style>
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #f2f4f8, #e9ecf1);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
}
.card {
  max-width: 360px;
  padding: 26px;
  border-radius: 28px;
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(20px);
  text-align: center;
}
h1 {
  font-size: 18px;
  margin-bottom: 20px;
}
a {
  display: block;
  padding: 14px;
  border-radius: 20px;
  text-decoration: none;
  background: #000;
  color: #fff;
  font-weight: 600;
}
</style>
</head>
<body>
<div class="card">
  <h1>Ссылка истекла</h1>
  <a href="${VPN_LINK}">Подключить VPN</a>
</div>
</body>
</html>
`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});
