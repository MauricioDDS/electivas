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

    public async getEnrichedPensum(ci_session: string, delay?: number): Promise<Pensum | ErrorResponse> {
        try {
            const pensum: Pensum | ErrorResponse = await this.getPensum(ci_session, delay);
            
            // Check if getPensum returned an error
            if ('error' in pensum) {
                return pensum;
            }

            // Get student notes
            const notas: NotasPorPeriodo = await this.getNotas(ci_session);
            
            // Map notas to pensum materias
            for (const periodo in notas) {
                for (const nota of notas[periodo]) {
                    // Find materia in pensum by codigo
                    if (pensum.materias[nota.codigo]) {
                        // Mark as approved if definitiva is a passing grade (≥ 3.0)
                        const grade = parseFloat(nota.definitiva);
                        const isApproved = !isNaN(grade) && grade >= 3.0;
                        
                        pensum.materias[nota.codigo].isApproved = isApproved;
                        pensum.materias[nota.codigo].grade = nota.definitiva;
                        pensum.materias[nota.codigo].completedIn = periodo;
                    }
                }
            }
            
            return pensum;
        } catch (error: any) {
            console.log(error);
            ProgressManager.getInstance().emitir(ProgressEvents.ERROR, {
                finished: 0,
                message: "Ha ocurrido un error enriqueciendo el pensum, por favor, verifica que la cookie es válida.",
                status: SocketMessageStatus.ERROR,
                total: 0
            })
            return {
                error: error,
                status: ResponseStatus.INTERNAL_ERROR
            }
        }
    }

}