// tento error pouzivame ak http request vrati http kod <> 2xx
export interface ResponseErrorBody {
    statusCode: number;
    message: string;
    exceptionName: string;
    sqlMessage?: string;
    sql?: string;
}

export class ResponseError extends Error {

    responseErrorBody: ResponseErrorBody;

    constructor(path: string, status: number, statusText: string, body: ResponseErrorBody) {
        super(`Http request "${path}" failed. Status: ${status}, status text: ${statusText}`);
        // see: typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html
        Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
        this.name = ResponseError.name; // stack traces display correctly now

        this.responseErrorBody = body;
    }
}
