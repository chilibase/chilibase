import {ColumnMeta} from "./column-meta.entity.js";

export interface BrowseMeta {
    id: number;
    entity: string;
    browseId: string | null;
    rows: number | null;
    columnMetaList: ColumnMeta[];
}