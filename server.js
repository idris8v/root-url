const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static("public"));

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
  const { payload, views } = req.body;

  if (!payload || !views) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const token = uuidv4();

  db.run(
    "INSERT INTO links (token, payload, max_views) VALUES (?, ?, ?)",
    [token, JSON.stringify(payload), views],
    () => {
      res.json({ token });
    }
  );
});

app.get("/l/:token", (req, res) => {
  const { token } = req.params;

  db.get(
    "SELECT payload, views, max_views FROM links WHERE token = ?",
    [token],
    (err, row) => {
      if (!row) {
        return res.status(404).send("Ссылка не найдена");
      }

      if (row.views >= row.max_views) {
        return res.send("Ссылка истекла");
      }

      db.run(
        "UPDATE links SET views = views + 1 WHERE token = ?",
        [token]
      );

      let data;
      try {
        data = JSON.parse(row.payload);
      } catch {
        return res.send("Ошибка данных");
      }

      res.send(renderProxyPage(data.whatsapp, data.telegram));
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
<title>Подключение Proxy</title>
<style>
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #f2f4f8, #e9ecf1);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
}
.wrapper {
  width: 100%;
  max-width: 380px;
  padding: 20px;
}
.card {
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(20px);
  border-radius: 28px;
  padding: 26px;
  box-shadow:
    0 20px 40px rgba(0,0,0,0.1),
    inset 0 1px 0 rgba(255,255,255,0.7);
}
h1 {
  text-align: center;
  font-size: 18px;
  margin-bottom: 24px;
}
.btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  color: white;
  margin-bottom: 14px;
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}
.whatsapp {
  background: linear-gradient(180deg, #3ddc84, #1fa855);
}
.telegram {
  background: linear-gradient(180deg, #3da9fc, #007adf);
}
.footer {
  text-align: center;
  font-size: 12px;
  opacity: 0.6;
  margin-top: 10px;
}
</style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <h1>Подключение Proxy</h1>

      <a class="btn whatsapp" href="${wa}">
        🟢 Подключить WhatsApp
      </a>

      <a class="btn telegram" href="${tg}">
        🔵 Подключить Telegram
      </a>

      <div class="footer">
        Доступ ограничен
      </div>
    </div>
  </div>
</body>
</html>
`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server started on port " + PORT);
});
