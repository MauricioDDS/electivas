
export enum ResponseStatus {
    OK = 200,
    INVALID_CREDENTIALS = 403,
    UNAUTHORIZED = 401,
    INTERNAL_ERROR = 500,
    NOT_FOUND = 404
}

export default interface ErrorResponse{
    error: string,
    status: ResponseStatus
}