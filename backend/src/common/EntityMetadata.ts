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
    entityName: string; // entita na druhej strane asociacie
    inverseAssocName?: string; // opacna asociacia
    isCascadeInsert: boolean;
    isCascadeUpdate: boolean;
    isCascadeRemove: boolean;
    isNullable: boolean; // pouzivane (zatial) len pre *ToOne asociacie
}

