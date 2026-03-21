import {DataTableFilterMetaData} from "primereact/datatable";
import {FilterOrFunction} from "../../utils/types";

// parametre ktore odovzdavame zo SearchButton do search table a dalej do LazyDataTable

export interface FieldFilter {
    field: string;
    constraint: DataTableFilterMetaData;
}

export interface SearchBrowseParams {
    onChoose: (chosenRow: any) => void;
    displayFieldFilter?: FieldFilter; // undefined sposobi ze sa neaplikuje filter - search table zobrazi vsetky mozne hodnoty
    customFilter?: FilterOrFunction; // zapiseme sem funkciu, ktora vracia CustomFilter, aby sa ta funkcia volala co najneskor
                                        // - v case otvorenia SearchBrowse, dovod je ten ze funkcia moze citat objekt formulara a ten sa moze v case menit
}
