import { Timestamp } from "@google-cloud/firestore";

export interface Dictionary<T> {
    [Key: string]: T;
}

export interface Clase {
    dia: number;
    horaInicio: number;
    horaFin: number;
    salon: string;
}

export enum GrupoState {
    NOT_CHANGED, CHANGED, CREATED, DELETED
}

export enum MateriaState {
    CREATED, DELETED, NOT_CHANGED
}

export interface Grupo {
    nombre: string;
    profesor: string;
    maximo: number;
    disponible: number;
    clases: Clase[];
    estado: GrupoState;
}

export interface Materia {
    semestre: number;
    carrera?: string;
    codigo: string;
    nombre: string;
    horas: number;
    creditos: number;
    requisitos: string[];
    isElectiva: boolean;
    grupos: Dictionary<Grupo>;
    estado?: MateriaState;
}

export interface PensumInfo {
    codigo: string;
    fechaCaptura: Date;
    nombre: string;
}

export interface PensumInfoFirestore {
    codigo: string;
    fechaCaptura: Timestamp;
    nombre: string;
}

export type Pensum = {
    materias: Dictionary<Materia>;
} & PensumInfo

export interface ClaseHorario {
    hora: string;
    dia: string;
    materia: string;
    grupo: string;
    salon: string;
    edificio?: string;
    ubicacion?: string;
    tipoAula?: string;
}

export interface Nota {
    codigo: string;    
    materia: string;  
    tipo: string;         
    definitiva: string;   
    habilitacion: string; 
    periodo: string;      
}

export interface NotasPorPeriodo {
    [periodo: string]: Nota[];
}

export interface NotasResumen {
    codigo: string;
    nombre: string;
    promedio: string;
    creditosAprobadosPensum: string;
    totalCreditosAprobados: string;
}