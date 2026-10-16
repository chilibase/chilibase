import {
    DataTableFilterMetaData,
    DataTableOperatorFilterMetaData,
    FilterMatchMode
} from "../../common/PrimeFilterSortMeta.js";
import {ObjectLiteral} from "typeorm";
import {Utils} from "../../utils/Utils.js";
import {EntityMetadataService} from "../../entity-metadata/entity-metadata.service.js";
import {Entity, Field} from "../../common/EntityMetadata.js";
import {stringAsDB} from "../../common/UtilsConversions.js";
import {EnvVar} from "../../env-vars/EnvVars.js";
import {ExtendedDataTableFilterMetaData, ExtendedFilterMatchMode} from "../../common/index.js";

export abstract class QueryData {

    // helper members
    entityMetadataService: EntityMetadataService;
    entity: Entity;

    rootAlias: string; // alias for root table of the query, e.g. "t0"
    assocAliasMap: Map<string, string>; // assoc1.assoc2.fieldX = :valueX -> (t0.assoc1, t1), (t1.assoc2, t2)
    where: string;                      // assoc1.assoc2.fieldX = :valueX -> t2.fieldX = :valueX
    params: ObjectLiteral;                         // {valueX, <valueX>}
    ftsFieldList: string[];             // fts = full-text search

    protected constructor(entityMetadataService: EntityMetadataService, entity: string, rootAlias: string) {
        this.entityMetadataService = entityMetadataService;
        this.entity = this.entityMetadataService.getEntity(entity);
        this.rootAlias = rootAlias;
        this.assocAliasMap = new Map<string, string>();
        this.where = "";
        this.params = {};
        this.ftsFieldList = [];
    }

    abstract isMainQueryData(): boolean;

    // returns true exactly when this.addFilterField creates some condition
    isFilterValueNotNull(filterValue: DataTableFilterMetaData | DataTableOperatorFilterMetaData): boolean {
        if ('operator' in filterValue) {
            // composed condition
            const operatorFilterItem: DataTableOperatorFilterMetaData = filterValue;
            for (const [index, filterItem] of operatorFilterItem.constraints.entries()) {
                if (this.isFilterItemNotNull(filterItem)) {
                    return true;
                }
            }
            return false;
        }
        else {
            // simple condition
            const filterItem: DataTableFilterMetaData = filterValue;
            return this.isFilterItemNotNull(filterItem);
        }
    }

    isFilterItemNotNull(filterItem: DataTableFilterMetaData): boolean {
        // the condition filterItem.value !== '' is a workaround, correctly the frontend should change '' to null in the onChange method of the filter input
        // the problem is that we do not have a custom input filter for string attributes, we would have to add it (which again may not be such terrible work)
        return (filterItem.value !== null && filterItem.value !== ''
                && !(filterItem.matchMode === FilterMatchMode.BETWEEN && Array.isArray(filterItem.value) && filterItem.value.length === 2 && filterItem.value[0] === null && filterItem.value[1] === null)
                // this is a hotfix - it is here because we cannot clear the value after a match mode change and in certain cases it arrives at the backend (matchMode = X_FILTER_ELEMENT && customFilterItems = undefined && value = "something") and it crashes
                && !(filterItem.matchMode as ExtendedFilterMatchMode === ExtendedFilterMatchMode.AUTO_COMPLETE && (filterItem as ExtendedDataTableFilterMetaData).customFilterItems === undefined)
                && !(filterItem.matchMode as ExtendedFilterMatchMode === ExtendedFilterMatchMode.FILTER_ELEMENT && (filterItem as ExtendedDataTableFilterMetaData).customFilterItems === undefined))
                || filterItem.matchMode as ExtendedFilterMatchMode === ExtendedFilterMatchMode.IS_NOT_NULL || filterItem.matchMode as ExtendedFilterMatchMode === ExtendedFilterMatchMode.IS_NULL;
    }

    addFilterField(filterField: string, filterValue: DataTableFilterMetaData | DataTableOperatorFilterMetaData) {
        let whereItems: string = "";
        if ('operator' in filterValue) {
            // composed condition
            const operatorFilterItem: DataTableOperatorFilterMetaData = filterValue;
            const whereOperator = " " + operatorFilterItem.operator.toUpperCase() + " "; // AND or OR
            for (const [index, filterItem] of operatorFilterItem.constraints.entries()) {
                const whereItem: string = this.createWhereItem(filterField, filterItem, index);
                if (whereItem !== "") {
                    if (whereItems !== "") {
                        whereItems += whereOperator;
                    }
                    whereItems += "(" + whereItem + ")";
                }
            }
        }
        else {
            // simple condition
            const filterItem: DataTableFilterMetaData = filterValue;
            whereItems = this.createWhereItem(filterField, filterItem, undefined);
        }
        // if there was some condition for current filterField, add it to the result
        if (whereItems !== "") {
            this.addWhereItem(whereItems);
        }
    }

    createWhereItem(filterField: string, filterItem: DataTableFilterMetaData, paramIndex: number | undefined): string {
        let whereItem: string = "";
        if (this.isFilterItemNotNull(filterItem)) {
            const dbField: string = this.getFieldFromPathField(filterField);
            // TODO - use paramName :1, :2, :3, ... ?
            let paramName: string = dbField; // paramName contains "." (e.g. t2.attrib)
            if (paramIndex !== undefined) {
                paramName += "_" + paramIndex;
            }
            const field: string = this.addDBCastIfNeeded(dbField, filterField);
            switch (filterItem.matchMode) {
                case FilterMatchMode.STARTS_WITH:
                    whereItem = this.createWhereItemBaseLike(field, false, paramName, `${filterItem.value}%`);
                    break;
                case FilterMatchMode.CONTAINS:
                    whereItem = this.createWhereItemBaseLike(field, false, paramName, `%${filterItem.value}%`);
                    break;
                case FilterMatchMode.NOT_CONTAINS:
                    whereItem = this.createWhereItemBaseLike(field, true, paramName, `%${filterItem.value}%`);
                    break;
                case FilterMatchMode.ENDS_WITH:
                    whereItem = this.createWhereItemBaseLike(field, false, paramName, `%${filterItem.value}`);
                    break;
                case FilterMatchMode.EQUALS:
                case FilterMatchMode.DATE_IS:
                    whereItem = this.createWhereItemBase(field, "=", paramName, filterItem.value);
                    break;
                case FilterMatchMode.NOT_EQUALS:
                case FilterMatchMode.DATE_IS_NOT:
                    whereItem = this.createWhereItemBase(field, "<>", paramName, filterItem.value);
                    break;
                case FilterMatchMode.IN:
                    if (Array.isArray(filterItem.value)) {
                        let valueList: any[] = filterItem.value;
                        // result will be empty for empty valueList (generated SQL: field IN (NULL))
                        if (valueList.length === 0) {
                            valueList = [null];
                        }
                        whereItem = `${field} IN (:...${paramName})`;
                        this.params[paramName] = valueList;
                    }
                    else {
                        console.log(`FilterMatchMode "${filterItem.matchMode}": value is expected to be array`);
                    }
                    break;
                case FilterMatchMode.LESS_THAN:
                case FilterMatchMode.DATE_BEFORE:
                    whereItem = this.createWhereItemBase(field, "<", paramName, filterItem.value);
                    break;
                case FilterMatchMode.LESS_THAN_OR_EQUAL_TO:
                    whereItem = this.createWhereItemBase(field, "<=", paramName, filterItem.value);
                    break;
                case FilterMatchMode.GREATER_THAN:
                case FilterMatchMode.DATE_AFTER:
                    whereItem = this.createWhereItemBase(field, ">", paramName, filterItem.value);
                    break;
                case FilterMatchMode.GREATER_THAN_OR_EQUAL_TO:
                    whereItem = this.createWhereItemBase(field, ">=", paramName, filterItem.value);
                    break;
                case FilterMatchMode.BETWEEN:
                    if (Array.isArray(filterItem.value) && filterItem.value.length === 2) {
                        const value1: any | null = filterItem.value[0];
                        const value2: any | null = filterItem.value[1];
                        const whereItem1: string | "" = (value1 !== null ? this.createWhereItemBase(field, ">=", paramName + '_1', value1) : "");
                        const whereItem2: string | "" = (value2 !== null ? this.createWhereItemBase(field, "<=", paramName + '_2', value2) : "");
                        whereItem = QueryData.whereItemAnd(whereItem1, whereItem2);
                    }
                    else {
                        console.log(`FilterMatchMode "${filterItem.matchMode}": value is expected to be array of length = 2`);
                    }
                    break;
                case ExtendedFilterMatchMode.IS_NOT_NULL as unknown as FilterMatchMode:
                    whereItem = `${field} IS NOT NULL`;
                    break;
                case ExtendedFilterMatchMode.IS_NULL as unknown as FilterMatchMode:
                    whereItem = `${field} IS NULL`;
                    break;
                default:
                    console.log(`FilterMatchMode "${filterItem.matchMode}" not implemented`);
            }
            // check - whereItem should always exist if the method this.isFilterItemNotNull returned true
            if (whereItem === "") {
                throw `Unexpected error - function this.isFilterItemNotNull(filterItem) returned true, but whereItem was not created. filterItem = ${JSON.stringify(filterItem)}`;
            }
        }
        return whereItem;
    }

    createWhereItemBaseLike(field: string, not: boolean, paramName: string, paramValue: any): string {
        const notOperator: string = not ? "NOT " : "";
        let whereItem: string;
        // AI/CI search works only for postgres (for mysql must be false, AI/CI can be achieved by using proprietary default collation, e.g. utf8mb4_0900_ai_ci)
        if (Utils.getEnvVarValueBoolean(EnvVar.X_STRING_DB_SEARCH_AI_CI)) {
            whereItem = `${Utils.getSchema()}.unaccent(${field}) ${notOperator}ILIKE ${Utils.getSchema()}.unaccent(:${paramName})`;
            this.params[paramName] = paramValue;
        }
        else {
            whereItem = this.createWhereItemBase(field, `${notOperator}LIKE`, paramName, paramValue);
        }

        return whereItem;
    }

    createWhereItemBase(field: string, sqlOperator: string, paramName: string, paramValue: any): string {
        const whereItem: string = `${field} ${sqlOperator} :${paramName}`;
        this.params[paramName] = paramValue;
        return whereItem;
    }

    getFieldFromPathField(pathField: string): string {
        return this.getFieldFromAliasPath(this.rootAlias + "." + pathField);
    }

    getFieldFromAliasPath(path: string): string {
        // if it is a leaf attribute (e.g. t2.attrib), we return it
        const posDot: number = path.indexOf(".");
        if (posDot === -1) {
            throw "Unexpected error - path " + path + " has no alias";
        }
        const posDotSecond: number = path.indexOf(".", posDot + 1);
        if (posDotSecond === -1) {
            return path;
        }
        // it is a path
        const assoc: string = path.substring(0, posDotSecond);
        const remainingPath: string = path.substring(posDotSecond + 1);

        // we get the attribute from the remaining path
        const aliasForAssoc: string = this.getAliasForAssoc(assoc);
        return this.getFieldFromAliasPath(aliasForAssoc + "." + remainingPath);
    }

    getAliasForAssoc(assoc: string): string {
        let aliasForAssoc: string = this.assocAliasMap.get(assoc);
        if (aliasForAssoc === undefined) {
            // we do not have the association added yet, we add it
            aliasForAssoc = this.rootAlias + "_" + (this.assocAliasMap.size + 1).toString();
            this.assocAliasMap.set(assoc, aliasForAssoc);
        }
        return aliasForAssoc;
    }

    addDBCastIfNeeded(dbField: string, field: string): string {
        const fieldMetadata: Field = this.entityMetadataService.getFieldByPath(this.entity, field);
        if (fieldMetadata.type === "jsonb") {
            // if we do not cast the jsonb type, it throws an error
            // this is needed if we want a simple text entry into the filter on a column that displays a jsonb attribute to work
            // (the fts filter works with jsonb attributes fine even without this adjustment (there a cast to ::VARCHAR is always done))
            // if we cast dbField via ::VARCHAR, it has to be put in parentheses, otherwise TypeORM will not replace it with the column name
            dbField = `(${dbField})::VARCHAR`;
        }
        return dbField;
    }

    addWhereItem(whereItem: string) {
        if (this.where !== "") {
            this.where += " AND ";
        }
        this.where += "(" + whereItem + ")";
    }

    addParams(params: {}) {
        // TODO - add a check whether they get overwritten (if they happen to have the same key, the item from params wins)
        this.params = {...this.params, ...params};
    }

    addFtsField(prefix: string | null, ftsField: string) {
        const dbField: string = this.getFieldFromPathField(ftsField);
        const fieldMetadata: Field = this.entityMetadataService.getFieldByPath(this.entity, ftsField);
        // TODO - add other conversions if needed
        // TODO - create DB conversion functions if used on multiple places
        let dbFieldWithCast: string;
        if (fieldMetadata.type === "boolean") {
            // if we cast dbField via ::VARCHAR (::INT), it has to be put in parentheses, otherwise TypeORM will not replace it with the column name
            dbFieldWithCast = `(${dbField})::INT::VARCHAR`; // we do not want to create values |true| or |false|, we prefer to create |1| or |0|
                                        // - those will collide less with searches aimed at other columns
        }
        else if (fieldMetadata.type === "decimal") {
            // decimal attributes (financial sums) are displayed like: 123,45 - we change "." to ","
            dbFieldWithCast = `replace((${dbField})::VARCHAR, '.', ',')`;
        }
        else if (fieldMetadata.type === "date") {
            dbFieldWithCast = `to_char(${dbField}, 'DD.MM.YYYY')`;
        }
        else if (fieldMetadata.type === "datetime") {
            dbFieldWithCast = `to_char(${dbField}, 'DD.MM.YYYY HH24:MI:SS')`;
        }
        else {
            // if we cast dbField via ::VARCHAR, it has to be put in parentheses, otherwise TypeORM will not replace it with the column name
            dbFieldWithCast = `(${dbField})::VARCHAR`;
        }
        // a prefix (e.g. RC for birth number) lets us pin some value in the search string to a specific column
        // e.g. if we enter RC801207, the string 801207 will be searched only among values from the birth number column
        const dbPrefix: string = prefix ? `'${prefix}' || ` : ``;
        this.ftsFieldList.push(`coalesce(${dbPrefix}${dbFieldWithCast}, '')`);
    }

    // I use it as a separator instead of a space (' ') because a space can occur in the values
    // it is questionable whether it is a suitable choice when using a GIN index
    static ftsSeparator: string = '|';

    createFtsWhereItemForQuery(ftsValue: string, ftsSeparator: string): string | "" {
        let whereItem: string | "" = "";
        if (this.ftsFieldList.length > 0) {
            // we add the separator '|' at the beginning and at the end, we use them if the operator is startsWith/endsWidth/equals
            // ILIKE - I = insensitive case
            // <schema>.unaccent - removes diacritics - I do not know whether it is better to call it once or rather for each field separately
            const ftsValueDB: string = stringAsDB(`%${ftsValue}%`);
            whereItem = `${Utils.getSchema()}.unaccent('${ftsSeparator}' || ${this.ftsFieldList.join(` || '${ftsSeparator}' || `)} || '${ftsSeparator}') ILIKE ${Utils.getSchema()}.unaccent(${ftsValueDB})`;
        }
        return whereItem;
    }

    static whereItemAnd(whereItem1: string | "", whereItem2: string | ""): string | "" {
        return QueryData.whereItemAndOr("AND", whereItem1, whereItem2);
    }

    static whereItemOr(whereItem1: string | "", whereItem2: string | ""): string | "" {
        return QueryData.whereItemAndOr("OR", whereItem1, whereItem2);
    }

    static whereItemAndOr(and_or: "AND" | "OR", whereItem1: string | "", whereItem2: string | ""): string | "" {
        let whereItem: string;
        if (whereItem1 !== "" && whereItem2 !== "") {
            whereItem = `(${whereItem1} ${and_or} ${whereItem2})`;
        }
        else {
            whereItem = whereItem1 + whereItem2;
        }
        return whereItem;
    }
}

