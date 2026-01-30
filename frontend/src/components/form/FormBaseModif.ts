import {FormBase} from "./FormBase";
import {EntityRow} from "../../common/types";
import {XUtils} from "../XUtils";

export class FormBaseModif extends FormBase {

    preSave(object: EntityRow) {
        object.modifDate = new Date();
        object.modifUser = XUtils.getXToken()?.user;
    }
}

