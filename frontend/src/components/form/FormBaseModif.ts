import {FormBase} from "./FormBase";
import {EntityRow} from "../../common/types";
import {XUtils} from "../XUtils";

export class FormBaseModif extends FormBase {

    preSave(entityRow: EntityRow) {
        entityRow.modifDate = new Date();
        entityRow.modifUser = XUtils.getXToken()?.user;
    }
}

