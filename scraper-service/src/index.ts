import express, { Application } from "express";
import morgan from "morgan";
import dotenv from "dotenv";
import http from "http";
import cors from "cors";

import DivisistRouter from "./routes/divisistRouter";
import ProgressManager from "./util/progressManager";

dotenv.config();

const PORT = process.env.PORT || 3000;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const app: Application = express();
const server = http.createServer(app);
ProgressManager.setInstance(server);

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));
app.use(express.static("public"));

app.use("/divisist", DivisistRouter);

server.listen(PORT, () => {
  console.log(`✅ Scraper service running on http://localhost:${PORT}`);
});
