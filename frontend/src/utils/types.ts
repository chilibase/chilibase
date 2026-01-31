import {CustomFilter} from "../common/FindParam";
import {DataTableSortMeta} from "primereact/datatable";

// types used in frontend (separated from Utils.ts because Utils is reexported as CBUtils)

export enum OperationType {
    None,
    Insert,
    Update,
    Remove
}

export enum ViewStatus {
    ReadWrite = "readWrite",
    ReadOnly = "readOnly",
    Hidden = "hidden"
}

// special type - purpose is to simply use true/false (instead of ViewStatus.ReadWrite/ViewStatus.Hidden)
export type ViewStatusOrBoolean = ViewStatus | boolean;

export type StorageType = "none" | "session" | "local";

// copy of IPostgresInterval at the backend
// (this type is used only at the frontend)
export interface IPostgresInterval {
    years?: number;
    months?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
}

export type GetEnvVarValue = (envVarEnum: string) => string;

// Query zatial docasne sem - ale je to globalny objekt - parametre pre Utils.fetchRows, taky jednoduchsi FindParam (este sem mozme pridat fullTextSearch ak bude treba)

export type FilterOrFunction = CustomFilter | (() => CustomFilter | undefined);

export interface Query {
    entity: string;
    filter?: FilterOrFunction;
    sortField?: string | DataTableSortMeta[];
    fields?: string[];
}

// general type used for params (note: the same like EntityRow (in types.ts))
// may be moved to XUtilsCommon if needed
// there is already XParams
//export type XParams = Record<string, any>;
