import { Request, Response } from "express";
import DivisistService from "../services/divisistService";
import { NotasPorPeriodo, Pensum } from "../model/allmodels";
import ErrorResponse from "../util/errorResponse";

export default class DivisistController {
    private divisistService: DivisistService;

    constructor() {
        this.divisistService = new DivisistService();
    }

    async getPensum(ci_session: string, delay?: number) {
        return this.divisistService.getPensum(ci_session, delay);
    }

    async getHorario(ci_session: string, delay?: number) {
        return this.divisistService.getHorario(ci_session, delay);
    }

    async getNotas(ci_session: string): Promise<NotasPorPeriodo> {
        return this.divisistService.getNotas(ci_session);
    }

    async getEnrichedPensum(ci_session: string, delay?: number): Promise<Pensum | ErrorResponse> {
        return this.divisistService.getEnrichedPensum(ci_session, delay);
    }
}
