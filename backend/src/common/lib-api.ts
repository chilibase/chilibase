import {User} from "../modules/administration/user.entity.js";

// misc api used in lib

export interface GetSequenceValueRequest {
    name: string;
}

export interface GetSequenceValueResponse {
    value: number;
}

// TODO - move to the right place
export interface FindRowByIdRequest {
    entity: string;
    fields: string[];
    id: number;
    lockDate?: Date; // if defined, pessimistic locking is used (and lockUser is also defined)
    lockUser?: User;
    overwriteLock?: boolean; // if true, then existing (old) lock will be overwritten by this new one
}

export interface FindRowByIdResponse {
    row: any;
    lockAcquired?: boolean; // true if the lock was acquired (row was not locked), false if the row was already locked (info about lock is in "row"), used only by pessimistic locking
}

export interface UnlockRowRequest {
    entity: string;
    id: number;
    lockDate: Date; // unlock only if the same lockDate/lockUser found (newer lockDate stays)
    lockUser: User;
}

// ********** modules/components **********

// module doc-templates (can be moved to new doc-templates-api.ts)
export interface RunDocTemplateRequest {
    docTemplateId: number;
    rowId: number; // id of the row in DB that is going to be used for creating document from template
    user?: User; // current user
}

// module files
export interface FileJsonField {
    filename: string;
    subdir?: string;
    modifDate: Date;
    modifUser: number;
}
