import {BrowseMeta} from "./browse-meta.entity.js";

export interface ColumnMeta {
    id: number;
    field: string;
    header: string;
    align: string;
    dropdownInFilter: boolean;
    width: string;
    columnOrder: number;
    browseMeta: BrowseMeta;
}
