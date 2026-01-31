import {FormBase} from "./FormBase";
import {EntityRow} from "../../common/types";
import {Utils} from "../../utils/Utils";

export class FormBaseModif extends FormBase {

    preSave(entityRow: EntityRow) {
        entityRow.modifDate = new Date();
        entityRow.modifUser = Utils.getXToken()?.user;
    }
}

