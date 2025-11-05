import express from "express";
import DivisistController from "../controllers/divisistController";
import { Pensum } from "../model/allmodels";

const router = express.Router();

router.get("/pensum", async (req, res) => {
  const ci_session = req.query.ci_session as string | undefined;
  const delay = req.query.delay ? Number(req.query.delay) : undefined;

  if (!ci_session) {
    return res.status(400).json({ error: "ci_session is required" });
  }

  try {
    const controller = new DivisistController();
    const result = await controller.getPensum(ci_session, delay);
    
    if ('materias' in result) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/horario", async (req, res) => {
  const ci_session = req.query.ci_session as string | undefined;
  if (!ci_session) {
    return res.status(400).json({ error: "ci_session is required" });
  }

  try {
    const controller = new DivisistController();
    const horario = await controller.getHorario(ci_session);
    res.json(horario);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/notas", async (req, res) => {
    const ci_session = req.query.ci_session as string | undefined;

    if (!ci_session) {
        return res.status(400).json({ error: "ci_session is required" });
    }

    try {
        const controller = new DivisistController();
        const notas = await controller.getNotas(ci_session);
        res.json({ notas });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
