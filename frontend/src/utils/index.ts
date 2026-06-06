export * from "./types";
export * from "./ResponseError";
// change the api name to XUtils to preserve the name Utils for app
export {Utils as XUtils} from "./Utils";
export * from "./UtilsMetadata";
export {UtilsMetadata as XUtilsMetadata} from "./UtilsMetadata"; // alternative name to enable to use prefix X

/** @deprecated */
// X-prefixed aliases for backward compatibility
export type {
    OperationType as XOperationType,
    ViewStatus as XViewStatus,
    ViewStatusOrBoolean as XViewStatusOrBoolean,
    StorageType as XStorageType,
    GetEnvVarValue as XGetEnvVarValue,
    FilterOrFunction as XFilterOrFunction,
    Query as XQuery
} from "./types";
