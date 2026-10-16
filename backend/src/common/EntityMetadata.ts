export interface EntityMap {
    [name: string]: Entity;
}

export interface Entity {
    name: string;
    idField: string;
    fieldMap: FieldMap;
    assocMap: AssocMap;
}

export interface FieldMap {
    [name: string]: Field;
}

export interface AssocMap {
    [name: string]: Assoc;
}

export interface Field {
    name: string;
    type: string;
    isNullable: boolean;
    length?: number;
    precision?: number;
    scale?: number;
    width?: number;
}

// copy of RelationMetadata.RelationType
export type RelationType = "one-to-one" | "one-to-many" | "many-to-one" | "many-to-many";

export interface Assoc {
    relationType: RelationType;
    name: string;
    entityName: string; // entity on the other side of the association
    inverseAssocName?: string; // inverse association
    isCascadeInsert: boolean;
    isCascadeUpdate: boolean;
    isCascadeRemove: boolean;
    isNullable: boolean; // used (for now) only for *ToOne associations
}

