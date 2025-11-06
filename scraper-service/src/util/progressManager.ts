import { Server } from "socket.io";
import http from 'http'

export enum SocketMessageStatus {
    OK = 200,
    ERROR = 500
}

type SocketMessage = {
    message: string,
    date?: Date,
    status: SocketMessageStatus,
    data?: any
}

type SocketProgressMessage = SocketMessage & {
    total: number,
    finished: number
}

export enum ProgressEvents {
    EXIT = "exit",
    PROGRESS = "progress",
    ERROR = "error"
}

enum SocketEvents {
    CONNECTION = "connection",
    DISCONNECT = "disconnect",
}

const Events = { ...SocketEvents, ...ProgressEvents };
type Events = typeof Events;

class ProgressManager {
    io: Server;
    private occupied: boolean = false;
    private static instancia: ProgressManager;

    public isOccupied(): boolean {
        return this.occupied;
    }

    private constructor(server: http.Server) {
        this.io = new Server(server, {
            cors: {
                origin: "*"
            }
        });
        this.io.on(Events.CONNECTION, (socket) => {
            console.log('Client connected');

            socket.on(Events.DISCONNECT, () => {
                console.log('Client disconnected');
            });
        });
    }

    public emitir(evento: ProgressEvents, datos: SocketProgressMessage) {
        this.io.emit(evento, {...datos, date: new Date()})
    }

    public static getInstance(): ProgressManager {
        if (!ProgressManager.instancia) {
            throw new Error("El manager de progreso no ha sido inicializado");
        }
        return ProgressManager.instancia;
    }

    public static setInstance(server: http.Server): void {
        if (!ProgressManager.instancia) {
            ProgressManager.instancia = new ProgressManager(server);
        }
    }
}

export default ProgressManager;