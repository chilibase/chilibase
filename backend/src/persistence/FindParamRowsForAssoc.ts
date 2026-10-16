// deprecated - use LazyDataTableService.findRows
export interface FindParamRowsForAssoc {
    entity: string;
    assocField: string;
    displayField: string; // can be null, then it is not used
    filter: String; // can be null, then it is not used (it is always used together with displayField)
    // TODO - for optimization add displayField and read only id + displayField?
}
