import { Injectable } from '@nestjs/common';
import {Assoc, AssocMap, Entity, EntityMap, Field, FieldMap, RelationType} from "../common/EntityMetadata.js";
import {DataSource, EntityMetadata} from "typeorm";
import {RelationMetadata} from "typeorm/metadata/RelationMetadata.js";
import {ColumnMetadata} from "typeorm/metadata/ColumnMetadata.js";
import {UtilsMetadataCommon} from "../common/UtilsMetadataCommon.js";
import {getNumberWidth} from "./NumberWidth.js";

@Injectable()
export class EntityMetadataService {

    constructor(
        private readonly dataSource: DataSource
    ) {}

    getEntityMap(): EntityMap {
        let entityMap: EntityMap | undefined = UtilsMetadataCommon.getEntityMap();
        if (entityMap === undefined) {
            entityMap = {};
            const entityMetadataList = this.dataSource.entityMetadatas;
            for (const entityMetadata of entityMetadataList) {
                if (!entityMetadata.isJunction) { // we do not want tables created by manyToMany associations
                    const entity: Entity = this.getEntityForEntityMetadata(entityMetadata);
                    entityMap[entity.name] = entity;
                }
            }
            UtilsMetadataCommon.setEntityMap(entityMap);
        }
        return entityMap;
    }

    private getEntityForEntityMetadata(entityMetadata: EntityMetadata): Entity {

        const fieldMap: FieldMap = {};
        // entityMetadata.columns columns contain also (virtual?) columns added by TypeORM for associations
        // (e.g. ManyToOne assoc adds column with the same name as the name of the assoc)
        // we want only simple columns (not columns added by assoc) -> that's why filter columnMetadata.relationMetadata === undefined
        // very special case is if we have simple column and ManyToOne assoc both over the same column - we want that such column stays
        // -> that's why filter columnMetadata.relationMetadata.propertyName !== columnMetadata.propertyName (assoc has different name then the column)
        let columnMetadataList: ColumnMetadata[] = entityMetadata.columns.filter(
            (columnMetadata: ColumnMetadata) => columnMetadata.relationMetadata === undefined
                || columnMetadata.relationMetadata.propertyName !== columnMetadata.propertyName);
        for (const columnMetadata of columnMetadataList) {
            const fieldName = columnMetadata.propertyName;
            // if (entityMetadata.name === 'Zmluva') {
            //     console.log("******** metadata for ************ " + entityMetadata.name + "." + fieldName);
            //     console.log("columnMetadata.relationMetadata = " + columnMetadata.relationMetadata?.relationType);
            //     //console.log(columnMetadata);
            // }
            let type = "unknown"; // default
            if (typeof columnMetadata.type === "string") {
                type = columnMetadata.type;
                // so that we do not have a million assorted database types on the client, we convert some types to javascript ones, i.e. e.g. string, number
                if (type === "character varying") {
                    type = "string";
                }
                else if (type === "int" || type === "integer") {
                    type = "number";
                }
                // the entity generator for postgres generates type numeric for db columns of type DECIMAL (financial amounts) - on the frontend we use decimal
                else if (type === "numeric") {
                    type = "decimal";
                }
                // postgres does not use datetime but timestamp, but on the client we handle datetime columns using the datetime type
                else if (type === "timestamp" || type === "timestamp without time zone") {
                    type = "datetime";
                }
            }
            else if (typeof columnMetadata.type === "function") {
                // if we do not write the type attribute into the @Column decorator, this branch runs and we get the attribute type (string, number, ...) (applies e.g. to ids)
                // columnMetadata.type.toString() returns e.g. "function String() { [native code] }", or "function Number() { [native code] }"
                // we extract String from there
                const typeString: string = columnMetadata.type.toString();
                const parenthesePos = typeString.indexOf("()");
                if (parenthesePos !== -1) {
                    type = typeString.substring("function ".length, parenthesePos).toLowerCase();
                }
            }
            let length: number = parseInt(columnMetadata.length);
            if (isNaN(length)) {
                length = undefined;
            }
            // TypeORM 1 removed MySQL display width. Integer digit count comes from @NumberWidth; 11 is the old MySQL int default.
            let width: number | undefined = typeof columnMetadata.target === "function"
                ? getNumberWidth(columnMetadata.target, fieldName)
                : undefined;
            if (type === "number" && width === undefined) {
                width = 11;
            }
            // note: columnMetadata.isNullable - the default is false, which is not very pleasant, most columns are nullable
            fieldMap[fieldName] = {name: fieldName, type: type, isNullable: columnMetadata.isNullable,
                                    length: length, precision: columnMetadata.precision, scale: columnMetadata.scale, width: width};
        }

        columnMetadataList = entityMetadata.primaryColumns;
        let idField: string;
        if (columnMetadataList.length === 0) {
            throw "Entity " + entityMetadata.name + " has 0 primary column";
        }
        else if (columnMetadataList.length === 1) {
            idField = columnMetadataList[0].propertyName;
        }
        else {
            // we allowed a composite PK, e.g. the special entity ZapisField
            // we do it this way, hopefully it will not be used anywhere
            idField = columnMetadataList.map((value: ColumnMetadata) => value.propertyName).join(", ");
        }

        const assocMap: AssocMap = this.createAssocMap([...entityMetadata.manyToOneRelations, ...entityMetadata.oneToOneRelations, ...entityMetadata.oneToManyRelations, ...entityMetadata.manyToManyRelations]);
        return {name: entityMetadata.name, idField: idField, fieldMap: fieldMap, assocMap: assocMap};
    }

    private createAssocMap(relationMetadataList: RelationMetadata[]): AssocMap {
        const assocMap: AssocMap = {};
        for (const relationMetadata of relationMetadataList) {
            const assocName = relationMetadata.propertyName;
            const inverseAssoc = relationMetadata.inverseRelation?.propertyName;
            // note: relationMetadata.isNullable - the default is true (unlike columnMetadata!), but maybe in the future they will unify it with columns, so it is better to always specify it explicitly
            assocMap[assocName] = ({
                relationType: relationMetadata.relationType,
                name: assocName,
                entityName: relationMetadata.inverseEntityMetadata.name,
                inverseAssocName: inverseAssoc,
                isCascadeInsert: relationMetadata.isCascadeInsert,
                isCascadeUpdate: relationMetadata.isCascadeUpdate,
                isCascadeRemove: relationMetadata.isCascadeRemove,
                isNullable: relationMetadata.isNullable
            });
        }
        return assocMap;
    }

    // TODO - use UtilsMetadataCommon and remove these methods

    /**
     * @deprecated
     */
    getEntity(entity: string): Entity {
        this.getEntityMap(); // just in case, so that the list gets initialized if needed
        return UtilsMetadataCommon.getEntity(entity);
    }

    /**
     * @deprecated
     */
    getField(entity: Entity, field: string): Field {
        return UtilsMetadataCommon.getField(entity, field);
    }

    /**
     * @deprecated
     */
    getFieldByPath(entity: Entity, path: string): Field {
        return UtilsMetadataCommon.getFieldByPath(entity, path);
    }

    /**
     * @deprecated
     */
    getAssocList(entity: Entity, relationTypeList?: RelationType[]): Assoc[] {
        return UtilsMetadataCommon.getAssocList(entity, relationTypeList);
    }

    /**
     * @deprecated
     */
    public getAssoc(entity: Entity, assocField: string, relationTypeList?: RelationType[]): Assoc {
        return UtilsMetadataCommon.getAssoc(entity, assocField, relationTypeList);
    }
}
