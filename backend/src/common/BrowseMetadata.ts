// the key in BrowseMetaMap is <entity> or <entity>_<browseId> (if browseId !== undefined)
import {XBrowseMeta} from "../administration/x-browse-meta.entity.js";

export interface BrowseMetaMap {
    [name: string]: XBrowseMeta;
}

