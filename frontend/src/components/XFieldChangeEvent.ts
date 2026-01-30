import {OperationType} from "./XUtils";
import {EntityRow} from "../common/types";

// event pre onChange metody na komponentoch formulara (XInputText, XAutoComplete, ...)
// pouzivame event, aby sme v buducnosti vedeli pridat dalsie atributy do eventu ak bude treba
// assocObjectChange - info ci bol vybraty assoc object zmeneny v DB (pozri XAutoCompleteBase)
// M znamena model
// TODO - OperationType sem presunut
export interface XFieldChangeEvent<M = EntityRow> {
    object: M;
    assocObjectChange?: OperationType
}

export interface XTableFieldChangeEvent<M = EntityRow, R = any> {
    object: M;
    tableRow: R;
    assocObjectChange?: OperationType
}