import { Router, type Request, type Response } from "express"
import DivisistController from "../controllers/divisistController"

const router = Router()
const divisistController = new DivisistController()

router.get("/pensum/enriched", async (req: Request, res: Response) => {
  try {
    let ci_session = req.query.ci_session as string | undefined

    // If not in query, try to get from cookie or Authorization header
    if (!ci_session) {
      ci_session = req.headers.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("ci_session="))
        ?.split("=")[1]
    }

    // If still not found, try Authorization header (format: "Bearer TOKEN")
    if (!ci_session) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith("Bearer ")) {
        ci_session = authHeader.slice(7)
      }
    }

    if (!ci_session) {
      return res.status(401).json({ error: "No session found" })
    }

    const result = await divisistController.getEnrichedPensum(ci_session)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch enriched pensum" })
  }
})

router.get("/pensum", async (req: Request, res: Response) => {
  try {
    let ci_session = req.query.ci_session as string | undefined

    // If not in query, try to get from cookie or Authorization header
    if (!ci_session) {
      ci_session = req.headers.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("ci_session="))
        ?.split("=")[1]
    }

    // If still not found, try Authorization header (format: "Bearer TOKEN")
    if (!ci_session) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith("Bearer ")) {
        ci_session = authHeader.slice(7)
      }
    }

    if (!ci_session) {
      return res.status(401).json({ error: "No session found" })
    }

    const result = await divisistController.getPensum(ci_session)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch pensum" })
  }
})

router.get("/horario", async (req: Request, res: Response) => {
  try {
    let ci_session = req.query.ci_session as string | undefined

    // If not in query, try to get from cookie or Authorization header
    if (!ci_session) {
      ci_session = req.headers.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("ci_session="))
        ?.split("=")[1]
    }

    // If still not found, try Authorization header (format: "Bearer TOKEN")
    if (!ci_session) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith("Bearer ")) {
        ci_session = authHeader.slice(7)
      }
    }

    if (!ci_session) {
      return res.status(401).json({ error: "No session found" })
    }

    const result = await divisistController.getHorario(ci_session)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch horario" })
  }
})

router.get("/notas", async (req: Request, res: Response) => {
  try {
    let ci_session = req.query.ci_session as string | undefined

    // If not in query, try to get from cookie or Authorization header
    if (!ci_session) {
      ci_session = req.headers.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("ci_session="))
        ?.split("=")[1]
    }

    // If still not found, try Authorization header (format: "Bearer TOKEN")
    if (!ci_session) {
      const authHeader = req.headers.authorization
      if (authHeader?.startsWith("Bearer ")) {
        ci_session = authHeader.slice(7)
      }
    }

    if (!ci_session) {
      return res.status(401).json({ error: "No session found" })
    }

    const result = await divisistController.getNotas(ci_session)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notas" })
  }
})

export default router
