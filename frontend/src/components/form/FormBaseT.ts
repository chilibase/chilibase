import {FormBase} from "./FormBase";

// wrapper pre typ, nie je nutne tento wrapper pouzivat, da sa extendovat priamo od FormBase
export abstract class FormBaseT<T> extends FormBase {

    getObject(): T {
        return this.getEntityRow() as any;
    }
}

