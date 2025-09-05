import express from "express";
import helmet from "helmet";

const app = express();
app.use(helmet());

app.get("/health", (_req, res) => res.json({ status: "ok", where: "web-gateway" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`web-gateway listening on ${PORT}`));
