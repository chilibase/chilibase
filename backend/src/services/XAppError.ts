/**
 * this error enables creating error messages on the backend, the messages are displayed on the frontend to the user (application errors)
 */
export class XAppError extends Error {

    constructor(msg: string) {
        super(msg);

        Object.setPrototypeOf(this, new.target.prototype); // restore the prototype chain (enables catching exception via instanceof XAppError, if needed)
        this.name = 'XAppError'; // ExceptionFilter creates the right exceptionName
    }
}
