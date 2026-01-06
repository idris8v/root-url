const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const { v4: uuidv4 } = require("uuid");

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
  const token = uuidv4();

  db.run(
    "INSERT INTO links (token, payload, max_views) VALUES (?, ?, ?)",
    [token, payload, views]
  );

  res.json({ token });
});

app.get("/l/:token", (req, res) => {
  const { token } = req.params;

  db.get(
    "SELECT payload, views, max_views FROM links WHERE token = ?",
    [token],
    (err, row) => {
      if (!row) return res.status(404).send("Ссылка не найдена!");
      if (row.views >= row.max_views)
        return res.send("Ссылка истекла!");

      db.run(
        "UPDATE links SET views = views + 1 WHERE token = ?",
        [token]
      );

      res.send(row.payload);
    }
  );
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log("Server started on port " + port);
});
