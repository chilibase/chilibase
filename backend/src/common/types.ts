import {BrowseMeta} from "../modules/administration/index.js";

// type for entity row (entity instance)
export type EntityRow = Record<string, any>;

// module edit-browse
// the key in BrowseMetaMap is <entity> or <entity>_<browseId> (if browseId !== undefined)
export interface BrowseMetaMap {
    [name: string]: BrowseMeta;
}

/**
 * used in LazyDataTable and also in export to excel in backend,
 * describes the text content of some string attributes (type varchar in DB),
 * text format is declared in column of the LazyDataTable, more correct would be to declare the text format in the model in the backend,
 */
export type TextFormat = "multiline" | "html" | undefined;
