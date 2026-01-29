import {FormBase} from "./FormBase";
import {XObject} from "../XObject";
import {XUtils} from "../XUtils";

export class FormBaseModif extends FormBase {

    preSave(object: XObject) {
        object.modifDate = new Date();
        object.modifUser = XUtils.getXToken()?.user;
    }
}

