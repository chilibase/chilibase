import {Assoc, Entity, EntityMap, Field, RelationType} from "./EntityMetadata.js";
import {UtilsCommon} from "./UtilsCommon.js";

/**
 * spolocna funkcionalita pre entity metadata vyuzivana na frontend-e aj backend-e
 * vznikla na zaklade EntityMetadataService
 * tato funkcionalita by este mohla ist do tried Entity, Field
 */
export class UtilsMetadataCommon {
    // nacachovane metadata (setuju sa v zavolanim UtilsMetadataCommon.setEntityMap)
    private static entityMap: EntityMap;

    static getEntityMap(): EntityMap | undefined {
        return UtilsMetadataCommon.entityMap;
    }

    static setEntityMap(entityMap: EntityMap) {
        UtilsMetadataCommon.entityMap = entityMap;
    }

    static getEntity(entity: string): Entity {
        if (!UtilsMetadataCommon.entityMap) {
            throw `Unexpected error: UtilsMetadataCommon.entityMap not initialised. Call UtilsMetadataCommon.setEntityMap first.`;
        }
        const xEntity: Entity = UtilsMetadataCommon.entityMap[entity];
        if (xEntity === undefined) {
            throw `Entity ${entity} was not found in entity metadata`;
        }
        return xEntity;
    }

    static getFieldBase(xEntity: Entity, field: string): Field | undefined {
        // TODO - pozor, vo fieldMap su aj asociacie, trebalo by zmenit vytvaranie metadat tak aby tam tie asociacie neboli
        return xEntity.fieldMap[field];
    }

    static getField(xEntity: Entity, field: string): Field {
        const xField: Field | undefined = UtilsMetadataCommon.getFieldBase(xEntity, field);
        if (xField === undefined) {
            throw `Field ${field} was not found in entity ${xEntity.name}`;
        }
        return xField;
    }

    static getFieldByPathBase(xEntity: Entity, path: string): Field | undefined {
        const [field, restPath] = UtilsCommon.getFieldAndRestPath(path);
        if (restPath === null) {
            return UtilsMetadataCommon.getFieldBase(xEntity, field);
        }
        else {
            const xAssoc: Assoc | undefined = UtilsMetadataCommon.getAssocBase(xEntity, field);
            if (xAssoc) {
                const xAssocEntity = UtilsMetadataCommon.getEntity(xAssoc.entityName);
                return UtilsMetadataCommon.getFieldByPathBase(xAssocEntity, restPath);
            }
            else {
                return undefined;
            }
        }
    }

    static getFieldByPath(xEntity: Entity, path: string): Field {
        const [field, restPath] = UtilsCommon.getFieldAndRestPath(path);
        if (restPath === null) {
            return UtilsMetadataCommon.getField(xEntity, field);
        }
        else {
            const xAssoc: Assoc = UtilsMetadataCommon.getAssoc(xEntity, field);
            const xAssocEntity = UtilsMetadataCommon.getEntity(xAssoc.entityName);
            return UtilsMetadataCommon.getFieldByPath(xAssocEntity, restPath);
        }
    }

    // returns true if path contains some toMany assoc
    static hasPathToManyAssoc(xEntity: Entity, path: string): boolean {
        const [field, restPath] = UtilsCommon.getFieldAndRestPath(path);
        if (restPath === null) {
            return false;
        }
        else {
            const xAssoc: Assoc = UtilsMetadataCommon.getAssoc(xEntity, field);
            if (xAssoc.relationType === "one-to-many" || xAssoc.relationType === "many-to-many") {
                return true;
            }
            else {
                const xAssocEntity = UtilsMetadataCommon.getEntity(xAssoc.entityName);
                return UtilsMetadataCommon.hasPathToManyAssoc(xAssocEntity, restPath);
            }
        }
    }

    static getFieldByPathStr(entity: string, path: string): Field {
        return UtilsMetadataCommon.getFieldByPath(UtilsMetadataCommon.getEntity(entity), path);
    }

    static getAssocBase(xEntity: Entity, assocField: string): Assoc | undefined {
        return xEntity.assocMap[assocField];
    }

    static getAssocToOneByPath(xEntity: Entity, path: string): Assoc {
        return UtilsMetadataCommon.getAssocByPath(xEntity, path, ["many-to-one", "one-to-one"]);
    }

    static getAssocToManyByPath(xEntity: Entity, path: string): Assoc {
        return UtilsMetadataCommon.getAssocByPath(xEntity, path, ["one-to-many", "many-to-many"]);
    }

    static getAssocByPath(xEntity: Entity, path: string, relationTypeList?: RelationType[]): Assoc {
        const [field, restPath] = UtilsCommon.getFieldAndRestPath(path);
        if (restPath === null) {
            return UtilsMetadataCommon.getAssoc(xEntity, field);
        }
        else {
            const xAssoc: Assoc = UtilsMetadataCommon.getAssoc(xEntity, field, relationTypeList);
            const xAssocEntity = UtilsMetadataCommon.getEntity(xAssoc.entityName);
            return UtilsMetadataCommon.getAssocByPath(xAssocEntity, restPath, relationTypeList);
        }
    }

    // for path assoc1.assoc2.field returns assoc2 (last assoc before field)
    static getLastAssocByPath(xEntity: Entity, path: string): Assoc {
        const pathToAssoc: string = UtilsCommon.getPathToAssoc(path);
        return UtilsMetadataCommon.getAssocByPath(xEntity, pathToAssoc);
    }

    static getAssocToOne(xEntity: Entity, assocField: string): Assoc {
        return UtilsMetadataCommon.getAssoc(xEntity, assocField, ["many-to-one", "one-to-one"]);
    }

    static getAssocToMany(xEntity: Entity, assocField: string): Assoc {
        return UtilsMetadataCommon.getAssoc(xEntity, assocField, ["one-to-many", "many-to-many"]);
    }

    static getAssocToOneByAssocEntity(xEntity: Entity, assocEntityName: string): Assoc {
        return UtilsMetadataCommon.getAssocByAssocEntity(xEntity, assocEntityName, ["many-to-one", "one-to-one"]);
    }

    static getAssocToManyByAssocEntity(xEntity: Entity, assocEntityName: string): Assoc {
        return UtilsMetadataCommon.getAssocByAssocEntity(xEntity, assocEntityName, ["one-to-many", "many-to-many"]);
    }

    static getEntityForAssocToOne(xEntity: Entity, assocField: string): Entity {
        return UtilsMetadataCommon.getEntityForAssoc(UtilsMetadataCommon.getAssocToOne(xEntity, assocField));
    }

    static getEntityForAssocToMany(xEntity: Entity, assocField: string): Entity {
        return UtilsMetadataCommon.getEntityForAssoc(UtilsMetadataCommon.getAssocToMany(xEntity, assocField));
    }

    static getFieldList(xEntity: Entity): Field[] {
        const xFieldList: Field[] = [];
        for (const [key, xField] of Object.entries(xEntity.fieldMap)) {
            // assoc fieldy sa nachadzaju aj v xEntity.fieldMap ako typ number (netusim preco), preto ich vyfiltrujeme
            if (xEntity.assocMap[xField.name] === undefined) {
                xFieldList.push(xField);
            }
        }
        return xFieldList;
    }

    static getAssocList(xEntity: Entity, relationTypeList?: RelationType[]): Assoc[] {
        //const xAssocList: Assoc[] = Array.from(xEntity.assocMap, (v: Assoc, k: string) => v);
        const xAssocList: Assoc[] = [];
        for (const [key, xAssoc] of Object.entries(xEntity.assocMap)) {
            if (relationTypeList === undefined || relationTypeList.includes(xAssoc.relationType)) {
                xAssocList.push(xAssoc);
            }
        }
        return xAssocList;
    }

    static getAssoc(xEntity: Entity, assocField: string, relationTypeList?: RelationType[]): Assoc {
        const xAssoc: Assoc | undefined = UtilsMetadataCommon.getAssocBase(xEntity, assocField);
        if (xAssoc === undefined) {
            throw `Assoc ${assocField} was not found in entity = ${xEntity.name}`;
        }
        // relationTypeList is optional and is only for check (not to get some unwanted type of assoc)
        if (relationTypeList !== undefined && !relationTypeList.includes(xAssoc.relationType)) {
            throw `Assoc ${assocField} in entity ${xEntity.name} is of type ${xAssoc.relationType} and required type is ${JSON.stringify(relationTypeList)}`;
        }
        return xAssoc;
    }

    private static getAssocByAssocEntity(xEntity: Entity, assocEntityName: string, relationTypeList?: RelationType[]): Assoc {
        let xAssocFound: Assoc | undefined = undefined;
        for (const [key, xAssoc] of Object.entries(xEntity.assocMap)) {
            if (xAssoc.entityName === assocEntityName) {
                if (xAssocFound === undefined) {
                    xAssocFound = xAssoc;
                }
                else {
                    throw `In entity ${xEntity.name} found more then 1 assoc for assocEntityName = ${assocEntityName}`;
                }
            }
        }
        if (xAssocFound === undefined) {
            throw `Assoc for assocEntityName = ${assocEntityName} not found in entity ${xEntity.name}`;
        }
        // relationTypeList is optional and is only for check (not to get some unwanted type of assoc)
        if (relationTypeList !== undefined && !relationTypeList.includes(xAssocFound.relationType)) {
            throw `Assoc for assocEntityName = ${assocEntityName} in entity ${xEntity.name} is of type ${xAssocFound.relationType} and required type is ${JSON.stringify(relationTypeList)}`;
        }
        return xAssocFound;
    }

    private static getEntityForAssoc(xAssoc: Assoc): Entity {
        return UtilsMetadataCommon.getEntity(xAssoc.entityName);
    }
}

