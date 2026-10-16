import type {DataTableFilterMetaData} from "primereact/datatable";
import type {FilterOrFunction} from "../../utils/types";

// parameters that we pass from SearchButton into the search table and further into LazyDataTable

export interface FieldFilter {
    field: string;
    constraint: DataTableFilterMetaData;
}

export interface SearchBrowseParams {
    onChoose: (chosenRow: any) => void;
    displayFieldFilter?: FieldFilter; // undefined causes the filter not to be applied - the search table displays all possible values
    customFilter?: FilterOrFunction; // we write here a function that returns CustomFilter, so that the function is called as late as possible
                                        // - at the time of opening SearchBrowse, the reason is that the function can read the form object and that can change over time
}
