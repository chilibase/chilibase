import {FormBase} from "./FormBase";

// wrapper for the type, it is not necessary to use this wrapper, it is possible to extend FormBase directly
export abstract class FormBaseT<T> extends FormBase {

    getObject(): T {
        return this.getEntityRow() as any;
    }
}

