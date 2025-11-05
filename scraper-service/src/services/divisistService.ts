import DivisistFetcher, { CarreraInfo } from '../util/DivisistFetcher';
import ProgressManager, { ProgressEvents, SocketMessageStatus } from '../util/progressManager';
import { Pensum } from './../model/allmodels';
import ErrorResponse, { ResponseStatus } from '../util/errorResponse';
import { NotasPorPeriodo } from "../model/allmodels";

export default class DivisistService {

    public async getPensum(ci_session: string, delay?: number): Promise<Pensum | ErrorResponse> {
        try {
            const fetcher: DivisistFetcher = new DivisistFetcher(ci_session, delay);
            const pensum: Pensum = await fetcher.getPensum();

            return pensum;
        } catch (error: any) {
            console.log(error);

            ProgressManager.getInstance().emitir(ProgressEvents.ERROR, {
                finished: 0,
                message: "Ha ocurrido un error obteniendo la información, por favor, verifica que la cookie es válida.",
                status: SocketMessageStatus.ERROR,
                total: 0
            })
            return {
                error: error,
                status: ResponseStatus.INTERNAL_ERROR
            }
        }
    }

    public async getHorario(ci_session: string, delay?: number) {
        const fetcher = new DivisistFetcher(ci_session, delay);
        return await fetcher.getHorario();
    }


    public async getNotas(ci_session: string): Promise<NotasPorPeriodo> {
        const fetcher = new DivisistFetcher(ci_session);
        return fetcher.getNotas();
    }

}