import { Pensum, Materia, Clase, PensumInfo, MateriaState, GrupoState, Grupo, ClaseHorario, NotasPorPeriodo, Nota, NotasResumen } from "../model/allmodels";
import { JSDOM } from 'jsdom'
import ProgressManager, { ProgressEvents, SocketMessageStatus } from "./progressManager";


export interface CarreraInfo {
    codigo: string;
    nombre: string;
}

type MateriaInfoRequest = {
    consulta: string;
    codigo: string
}

enum HttpMethod {
    GET = "GET",
    POST = "POST"
}

const diasSemana: { [key: string]: number } = {
    "LUNES": 0,
    "MARTES": 1,
    "MIERCOLES": 2,
    "JUEVES": 3,
    "VIERNES": 4,
    "SABADO": 5,
    "DOMINGO": 6,
}

/**
 * ToDo:
 *  - Implementar la función de cambio
 *  - Guardar otra colección con los pensums
 */
export default class DivisistFetcher {
    private ci_session: string = "";
    private progress: ProgressManager;
    private totalMaterias: number = 0;
    private materiasTerminadas: number = 0;
    private delayTimeMs: number = 1000 * 0.5;

    public constructor(ci_session: string, delayTimeSeconds?: number) {
        this.ci_session = ci_session;
        this.progress = ProgressManager.getInstance();
        if (delayTimeSeconds) this.delayTimeMs = delayTimeSeconds * 1000;
    }

    public async test(): Promise<any> {
        const apiUrl: string = "informacion_academica/pensum";
        return (await this.getJSDOM(apiUrl, HttpMethod.GET));
    }

    private async getJSDOM(endpoint: string, method: HttpMethod, data?: MateriaInfoRequest): Promise<Document> {
        let headers: HeadersInit = {
            'cookie': `ci_session=${this.ci_session}`
        }
        if (method === HttpMethod.POST) {
            headers = { ...headers, 'Content-Type': "application/x-www-form-urlencoded" }
        }
        const response: Response = await fetch(`${process.env.DIVISIST_URL}/${endpoint}`, {
            headers: headers,
            method: method,
            body: method === HttpMethod.POST ? new URLSearchParams(data).toString() : undefined
        });

        await new Promise(res => setTimeout(res, this.delayTimeMs))

        if (response.status !== 200) {
            throw new Error(`Fetch ${endpoint}: ${response.statusText} (${response.status})`)
        }
        const jsdomDocument: Document = new JSDOM(await response.text()).window.document;
        return jsdomDocument;
    }

    private getElement(document: Document, querySelector: string): Element | null {
        const element: Element | null = document.querySelector(querySelector);
        return element;
    }

    public async getPensum(): Promise<Pensum> {
        const carreraInfo: CarreraInfo = await this.getCarreraInfo();
        const pensumInfo: PensumInfo = {
            codigo: carreraInfo.codigo,
            fechaCaptura: new Date(),
            nombre: carreraInfo.nombre
        };

        const pensum: Pensum = {
            ...pensumInfo,
            materias: {}
        }

        const pensumEndpoint: string = "informacion_academica/pensum";
        const document: Document = await this.getJSDOM(pensumEndpoint, HttpMethod.GET);
        const querySemestres: string = "#content_completw > div.wrapper > div > section.content > div > div.box-body.no-padding > div > table > tbody"
        const semestresEl: Element | null = this.getElement(document, querySemestres);

        if (!semestresEl) {
            throw new Error(`Element (${querySemestres}) not found at getPensum()`)
        }

        const semestres: HTMLCollection = semestresEl.children;

        this.totalMaterias = ([...semestres].map(el => el.children.length)).reduce((acc, el) => acc + el, 0)
        console.log(this.totalMaterias, "materias");
        let numSemestre = 1;
        for (const semestre of semestres) {
            const materias: HTMLCollection = semestre.children;
            let materiaSemestre = 1;
            for (const materia of materias) {
                if (materiaSemestre++ === 1) continue;
                await this.addMateriaPensum(pensum, materia, numSemestre, carreraInfo);
            }
            numSemestre++;
        }
        this.progress.emitir(ProgressEvents.EXIT, {
            finished: this.materiasTerminadas,
            total: this.totalMaterias,
            message: `Pensum de ${pensum.nombre} terminado.`,
            status: SocketMessageStatus.OK,
            data: pensum
        })
        return pensum;
    }

    private async addMateriaPensum(pensum: Pensum, materia: Element, numSemestre: number, carreraInfo: CarreraInfo): Promise<void> {
        const titulo = (materia.children[0] as HTMLElement).title;
        const contenido = materia.children[0].innerHTML;

        const [nombre, requisitos]: [string, string[]] = this.getMateriaNombreRequisitos(titulo);
        const [codigo, horas, creditos, isElectiva] = this.getMateriaInfoHorasCreditos(contenido);
        console.log("adding", codigo, "-", nombre);

        const materiaObj: Materia = {
            carrera: carreraInfo.codigo,
            codigo,
            creditos,
            horas,
            isElectiva,
            nombre,
            requisitos,
            semestre: numSemestre,
            grupos: {},
            estado: MateriaState.NOT_CHANGED
        }
        this.progress.emitir(ProgressEvents.PROGRESS, {
            finished: this.materiasTerminadas++,
            message: `${codigo} - ${nombre}`,
            status: SocketMessageStatus.OK,
            total: this.totalMaterias
        })
        await this.procesarMateria(materiaObj);
        console.log(materiaObj.nombre, "grupos =>", Object.keys(materiaObj.grupos));

        pensum.materias[codigo] = materiaObj;
    }

    private getMateriaNombreRequisitos(titulo: string): [string, string[]] {
        const infos: string[] = titulo.split("-").map(e => e.trim());
        const nombre: string = infos[0];
        let req: string[] = [];
        if (infos.length > 1) {
            req = infos.slice(1).join(" ").split(" ").slice(1).map(e => e.trim()).filter(el => el !== "" && el !== "Cre:0");
        }
        return [nombre, req];
    }

    private getMateriaInfoHorasCreditos(contenido: string): [string, number, number, boolean] {
        const infoLimpia = contenido.split(/\s/).filter(el => el !== "").join(" ");
        const isElectiva = infoLimpia.includes("Electiva")
        const regexCodigo = /\d{7}/;
        const regexHoras = /horas:\d+/;
        const regexCreditos = /Cred:\d+/;
        const codigo = regexCodigo.exec(infoLimpia)![0];
        const horas = parseInt(regexHoras.exec(infoLimpia)![0].split(":")[1])
        const creditos = parseInt(regexCreditos.exec(infoLimpia)![0].split(":")[1])
        return [codigo, horas, creditos, isElectiva];
    }

    private async procesarMateria(materia: Materia, isEquivalencia: boolean = false): Promise<Materia> {
        const materiaPrincipalEndpoint: string = "consulta/materia";
        const document: Document = await this.getJSDOM(materiaPrincipalEndpoint, HttpMethod.POST, {
            consulta: "1",
            codigo: materia.codigo
        })
        const gruposQuery: string = "#collapse1 > div > div > table > tbody";
        const gruposElement: Element | null = this.getElement(document, gruposQuery);
        const clasesQuery: string = "#collapse2 > div > div > table > tbody";
        const clasesElement: Element | null = this.getElement(document, clasesQuery);
        if (gruposElement && clasesElement) {
            this.addGrupoToMateria(gruposElement, materia);
            this.addClasesAGrupos(clasesElement, materia);
            if (!isEquivalencia) {
                const equivQuery: string = "#collapse3 > div > div > table > tbody";
                const equivElement: Element | null = this.getElement(document, equivQuery);
                if (equivElement) {
                    await this.addEquivalencias(equivElement, materia)
                }
            }
        }
        //eliminar Grupos sin clases
        for (const grupoCod in materia.grupos) {
            const grupo: Grupo = materia.grupos[grupoCod];
            if (grupo.clases.length === 0) {
                delete materia.grupos[grupoCod];
            }
        }

        return materia;
    }

    private async addEquivalencias(equivElement: Element, materia: Materia) {
        const rows = Array.from(equivElement.children).slice(1);
        for (const eqCell of rows) {
            const codigoEquivalencia = eqCell.children[0].innerHTML;
            const materiaBusqueda: Materia = { ...materia, codigo: codigoEquivalencia, grupos: {} }
            this.progress.emitir(ProgressEvents.PROGRESS, {
                finished: this.materiasTerminadas,
                message: `Equivalencia ${materiaBusqueda.codigo} de ${materia.codigo} - ${materia.nombre}`,
                status: SocketMessageStatus.OK,
                total: this.totalMaterias
            })
            const materiaEq = await this.procesarMateria(materiaBusqueda, true);
            materia.grupos = { ...materia.grupos, ...materiaEq.grupos };
        }
    }

    private addClasesAGrupos(clasesElement: Element, materia: Materia) {
        const rowsClases = Array.from(clasesElement.children).slice(1);
        for (const row of rowsClases) {
            const [letraGrupo, nombreDia, horasString, salon] = [0, 1, 2, 3].map(el => row.children[el].innerHTML.trim());
            const grupo = `${materia.codigo}-${letraGrupo}`;
            const dia = diasSemana[nombreDia];
            const [horaInicio, horaFin] = this.getHoras(horasString);
            const clase: Clase = { dia, horaFin, horaInicio, salon }
            materia.grupos[grupo].clases.push(clase);
        }
    }

    private getHoras(horasString: string): [number, number] {
        const horasSplit = horasString.split("-");
        const n: number[] = [0, 1].map(idx => parseInt(horasSplit[idx].split(":")[0]) - 6)
        return [n[0], n[1]];
    }

    private addGrupoToMateria(gruposElement: Element, materia: Materia) {
        const rowsGrupos = Array.from(gruposElement.children).slice(1);
        for (const row of rowsGrupos) {
            const nombre: string = `${materia.codigo}-${row.children[0].innerHTML.trim()}`;
            const maximo: number = parseInt(row.children[1].innerHTML.trim());
            const disponible: number = parseInt(row.children[2].innerHTML.trim());
            const profesor: string = row.children[3].innerHTML.trim();
            materia.grupos[nombre] = { nombre, maximo, disponible, profesor, clases: [], estado: GrupoState.NOT_CHANGED };
        }
    }

    private getCarreraInfoFromDocument(document: Document): CarreraInfo {
        const codigoQuery: string = "#content_completw > div.wrapper > div > section.content > div > div:nth-child(2) > div.col-md-9 > div > table:nth-child(1) > tbody > tr:nth-child(2) > td";
        const codigoElement: Element | null = this.getElement(document, codigoQuery)
        const nombreQuery: string = "#content_completw > div.wrapper > div > section.content > div > div:nth-child(2) > div.col-md-9 > div > table:nth-child(1) > tbody > tr:nth-child(3) > td";
        const nombreElement: Element | null = this.getElement(document, nombreQuery);

        if (!codigoElement) {
            throw new Error(`Element (${codigoElement}) not found at getCarreraInfoFromDocument()`);
        }
        if (!nombreElement) {
            throw new Error(`Element (${nombreElement}) not found at getCarreraInfoFromDocument()`);
        }

        const codigo: string = codigoElement.innerHTML;
        const nombre: string = nombreElement.innerHTML;
        return {
            codigo, nombre
        };
    }

    public async getCarreraInfo(): Promise<CarreraInfo> {
        const carreraInfoEndpoint: string = "estudiante/mi_ufps";
        const document: Document = await this.getJSDOM(carreraInfoEndpoint, HttpMethod.GET);
        return this.getCarreraInfoFromDocument(document);
    }

    public async getHorario(): Promise<ClaseHorario[]> {
        try {
            console.log("[DEBUG] Fetching horario from: informacion_academica/horario");
            const document: Document = await this.getJSDOM("informacion_academica/horario", HttpMethod.GET);

            const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            const clases: ClaseHorario[] = [];
            const filas = document.querySelectorAll("table tbody tr");

            filas.forEach((fila) => {
                const celdas = fila.querySelectorAll("td");
                if (celdas.length === 0) return;

                const hora = celdas[0].textContent?.trim() ?? "";
                dias.forEach((dia, i) => {
                    const celda = celdas[i + 1];
                    if (!celda) return;

                    const span = celda.querySelector("span");
                    if (!span) return;

                    const texto = span.innerHTML.replace(/<a.*<\/a>/, "").trim();
                    if (texto === "." || !texto) return;

                    const [materiaYGrupo, salon] = texto.split("<br>");
                    const [materia, grupo] = materiaYGrupo?.split(" - ") ?? [];

                    const enlace = span.querySelector("a");
                    let edificio, ubicacion, tipoAula;
                    if (enlace && enlace.getAttribute("data-content")) {
                        const content = enlace.getAttribute("data-content")!;
                        edificio = content.match(/<b>Edificio:<\/b>\s*([^<]+)/)?.[1]?.trim();
                        ubicacion = content.match(/<b>Ubicación:<\/b>\s*([^<]+)/)?.[1]?.trim();
                        tipoAula = content.match(/<b>Tipo de Aula:<\/b>\s*([^<]+)/)?.[1]?.trim();
                    }

                    clases.push({
                        hora,
                        dia,
                        materia: materia?.trim() ?? "",
                        grupo: grupo?.trim() ?? "",
                        salon: salon?.trim() ?? "",
                        edificio,
                        ubicacion,
                        tipoAula,
                    });
                });
            });

            return clases;
        } catch (err) {
            console.error("[ERROR] getHorario() failed:", err);
            throw err;
        }
    }

    public async getNotas(): Promise<NotasPorPeriodo> {
        const document: Document = await this.getJSDOM("informacion_academica/notas", HttpMethod.GET);
        const notasPorPeriodo: NotasPorPeriodo = {};

        // Cada panel corresponde a un periodo
        const panels = document.querySelectorAll(".panel.box-primary");

        panels.forEach(panel => {
            const periodo = panel.querySelector(".box-title a")?.textContent?.trim() ?? "Sin periodo";
            notasPorPeriodo[periodo] = [];

            const filas = panel.querySelectorAll(".box-body table tbody tr");

            filas.forEach(fila => {
                const celdas = fila.querySelectorAll("td");
                if (celdas.length < 5) return; // Asegurarse que tiene todas las columnas

                const nota: Nota = {
                    codigo: celdas[0].textContent?.trim() ?? "",
                    materia: celdas[1].textContent?.trim() ?? "",
                    tipo: celdas[2].textContent?.trim() ?? "",
                    definitiva: celdas[3].textContent?.trim() ?? "",
                    habilitacion: celdas[4].textContent?.trim() ?? "",
                    periodo
                };
                notasPorPeriodo[periodo].push(nota);
            });
        });

        return notasPorPeriodo;
    }

    public async getNotasResumen(): Promise<NotasResumen[]> {
        const document: Document = await this.getJSDOM("informacion_academica/notas", HttpMethod.GET);
        const rows = document.querySelectorAll(".box-body .table-responsive table tbody tr");
        const resumen: NotasResumen[] = [];

        rows.forEach(row => {
            const celdas = row.querySelectorAll("td");
            if (celdas.length === 0) return;

            resumen.push({
                codigo: celdas[0].textContent?.trim() ?? "",
                nombre: celdas[1].textContent?.trim() ?? "",
                promedio: celdas[2].textContent?.trim() ?? "",
                creditosAprobadosPensum: celdas[3].textContent?.trim() ?? "",
                totalCreditosAprobados: celdas[4].textContent?.trim() ?? "",
            });
        });

        return resumen;
    }



}