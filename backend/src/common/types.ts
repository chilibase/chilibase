import {BrowseMeta} from "../modules/administration/index.js";

// type for entity row (entity instance)
export type EntityRow = Record<string, any>;

// module edit-browse
// the key in BrowseMetaMap is <entity> or <entity>_<browseId> (if browseId !== undefined)
export interface BrowseMetaMap {
    [name: string]: BrowseMeta;
}