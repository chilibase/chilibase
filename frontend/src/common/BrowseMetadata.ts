// the key in BrowseMetaMap is <entity> or <entity>_<browseId> (if browseId !== undefined)
export interface BrowseMetaMap {
    [name: string]: BrowseMeta;
}

// zodpoveda priblizne props na XLazyDataTable
export interface BrowseMeta {
    id?: number; // hodnota undefined (?) sa pouziva pri inserte do DB
    entity: string;
    browseId?: string;
    rows?: number;
    columnMetaList: ColumnMeta[];
}

// zodpoveda typu XLazyColumnProps
export interface ColumnMeta {
    id?: number; // hodnota undefined (?) sa pouziva pri inserte do DB
    field: string;
    header?: any;
    align?: "left" | "center" | "right";
    dropdownInFilter: boolean;
    width?: string;
    columnOrder?: number;
}

