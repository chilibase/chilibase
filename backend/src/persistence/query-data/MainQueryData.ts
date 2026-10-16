import {QueryData} from "./QueryData.js";
import {EntityMetadataService} from "../../entity-metadata/entity-metadata.service.js";
import {OrderByCondition, SelectQueryBuilder} from "typeorm";
import {SubQueryData} from "./SubQueryData.js";
import {DataTableFilterMeta, DataTableSortMeta} from "../../common/PrimeFilterSortMeta.js";
import {
    CustomFilterItem,
    ExtendedDataTableFilterMeta,
    ExtendedDataTableFilterMetaData,
    FullTextSearch
} from "../../common/FindParam.js";
import {Assoc} from "../../common/EntityMetadata.js";
import {UtilsCommon} from "../../common/UtilsCommon.js";

export class MainQueryData extends QueryData {

    // key in this map is main table alias with OneToMany assoc that creates this SubQueryData, e.g. "t0.assocXList"
    assocSubQueryDataMap: Map<string, SubQueryData>;
    selectItems: string[]; // not used now
    fullTextSearch: FullTextSearch | undefined;
    orderByItems: OrderByCondition;

    constructor(entityMetadataService: EntityMetadataService, entity: string, rootAlias: string, filters: DataTableFilterMeta | undefined, fullTextSearch: FullTextSearch | undefined, customFilterItems: CustomFilterItem[] | undefined) {
        super(entityMetadataService, entity, rootAlias);
        this.assocSubQueryDataMap = new Map<string, SubQueryData>();
        this.selectItems = [];
        this.fullTextSearch = fullTextSearch;
        this.orderByItems = {};

        //console.log("filters = " + JSON.stringify(filters));
        //console.log("customFilterItems = " + JSON.stringify(customFilterItems));
        this.addFilters(filters);
        this.processFullTextSearch();
        this.addCustomFilterItems(customFilterItems);
    }

    isMainQueryData(): boolean {
        return true;
    }

    // ******************* methods for creating data in member variables  ********************

    addFilters(filters: ExtendedDataTableFilterMeta | undefined) {
        if (filters) {
            for (const [filterField, filterValue] of Object.entries(filters)) {
                // the test this.isFilterValueNotNull is here mainly so that unnecessary joins are not created for SELECT COUNT(1)
                if (this.isFilterValueNotNull(filterValue)) {
                    if (!('operator' in filterValue) && (filterValue as ExtendedDataTableFilterMetaData).customFilterItems) {
                        // for simple condition, if there is customFilterItems (used when autocomplete is used), we use customFilterItems
                        this.addCustomFilterItems((filterValue as ExtendedDataTableFilterMetaData).customFilterItems);
                    }
                    else {
                        const [queryData, filterFieldNew]: [QueryData, string] = this.getQueryForPathField(filterField);
                        queryData.addFilterField(filterFieldNew, filterValue);
                    }
                }
            }
        }
    }

    processFullTextSearch() {
        if (this.fullTextSearch) {
            const fields: string[] = this.fullTextSearch.fields;
            if (fields) {
                for (const field of fields) {
                    const [prefix, fieldOnly]: [string | null, string] = UtilsCommon.getPrefixAndField(field);
                    const [queryData, filterFieldNew]: [QueryData, string] = this.getQueryForPathField(fieldOnly);
                    queryData.addFtsField(prefix, filterFieldNew);
                }
            }
        }
    }

    addCustomFilterItems(customFilterItems: CustomFilterItem[] | undefined) {
        if (customFilterItems) {
            // because fields in the custom filter can belong to various queries (OneToMany associations can be used),
            // we have special support here for custom filters composed of multiple items
            // the condition must be met that all fields in the given item belong to one query
            // (all fields are from the main query (no OneToMany association) or all fields use the same OneToMany association)
            for (const customFilterItem of customFilterItems) {
                this.addCustomFilterItem(customFilterItem);
            }
        }
    }

    addSelectItems(fields: string[] | undefined) {
        // TODO - when this.selectFields start being used, the default list of "fields" has to be loaded from the entity
        // this.selectFields are not used at the moment but it is important that associated tables get joined (this.assocAliasMap is filled)
        if (fields) {
            for (const field of fields) {
                const [queryData, fieldNew]: [QueryData, string] = this.getQueryForPathField(field);
                const dbField: string = queryData.getFieldFromPathField(fieldNew);
                // the path "<association>.*FAKE*" is used if we want to load an association and we do not have a specific field that we want to load
                // currently it is used only in XToOneAssocButton
                if (!dbField.endsWith('*FAKE*')) {
                    // note2: it is fine that we also write possible fields from the subquery into MainQueryData.selectItems
                    // - the subquery is joined to the main select, the binding of the field to the corresponding table is resolved through the alias
                    this.selectItems.push(dbField);
                }
            }
        }
    }

    addOrderByItems(multiSortMeta: DataTableSortMeta[] | undefined) {
        if (multiSortMeta) {
            for (const sortMeta of multiSortMeta) {
                const [queryData, fieldNew]: [QueryData, string] = this.getQueryForPathField(sortMeta.field);
                const dbField: string = queryData.getFieldFromPathField(fieldNew);
                // it is very strange here that dbField is written into a map but it apparently works on the principle that javascript
                // remembers the order of writing into this.orderByItems and iterates this map in the same order when this.orderByItems is used
                // note2: it is fine that we also write possible fields from the subquery into MainQueryData.orderByItems
                // - the subquery is joined to the main select, the binding of the field to the corresponding table is resolved through the alias
                this.orderByItems[dbField] = (sortMeta.order === 1 ? "ASC" : "DESC");
            }
        }
    }

    private addCustomFilterItem(customFilterItem: CustomFilterItem) {
        const [sqlExpWithAliases, queryData] = this.replacePathFieldQueryData(customFilterItem.where);
        queryData.addWhereItem(sqlExpWithAliases);
        queryData.addParams(customFilterItem.params);
    }

    replacePathFieldQueryData(sqlExpParam: string): [string, QueryData] {
        // example of sql expression (e.g. where condition or subselect):
        // ([assocField1.field2] BETWEEN :value1 AND :value2) AND ([field3] IN (:...values3))
        // fields in [] will be replaced with <table alias>.<column>
        let sqlExp: string = sqlExpParam;
        let match: string;
        let queryDataForItem: QueryData | null = null;
        while ((match = UtilsCommon.findFirstMatch(/\[[a-zA-Z0-9_.]+\]/, sqlExp)) != null) {
            const filterField: string = match.substring(1, match.length - 1); // remove []
            const [queryData, filterFieldNew]: [QueryData, string] = this.getQueryForPathField(filterField);
            if (queryDataForItem === null) {
                queryDataForItem = queryData;
            } else if (queryData !== queryDataForItem) {
                throw `Custom filter (or custom filter item) "${sqlExpParam}" must use the same query for all fields (all fields must use the same OneToMany assoc or OneToMany assoc cannot be used). Please divide your custom filter into more custom filters in form of array [filter1, filter2, ...].`;
            }
            const dbField: string = queryDataForItem.getFieldFromPathField(filterFieldNew);
            sqlExp = sqlExp.replaceAll(match, dbField);
        }
        if (queryDataForItem === null) {
            throw `Custom filter (or custom filter item) "${sqlExpParam}" - no field was found. Example of custom filter: [fieldX] = :valueX`;
        }
        return [sqlExp, queryDataForItem];
    }

    // api function
    getDBFieldForPathField(pathField: string): string {
        const [queryData, fieldNew]: [QueryData, string] = this.getQueryForPathField(pathField);
        return queryData.getFieldFromPathField(fieldNew);
    }

    // api function
    replacePathField(pathFieldOrPathFieldExp: string): string {
        // simple version returning only string (can be used as api function for application code)
        // works for single path field as well as for expression with path fields (e.g. [assocA.attrB] = 'abc')
        let sqlExp: string;
        if (UtilsCommon.isPathField(pathFieldOrPathFieldExp)) {
            sqlExp = this.getDBFieldForPathField(pathFieldOrPathFieldExp);
        }
        else {
            const [sqlExpWithAliases, queryData] = this.replacePathFieldQueryData(pathFieldOrPathFieldExp);
            sqlExp = sqlExpWithAliases;
        }
        return sqlExp;
    }

    getQueryForPathField(pathField: string): [QueryData, string] {
        // if we have a OneToMany association, we create/use a subquery
        const [field, restPath]: [string, string | null] = UtilsCommon.getFieldAndRestPath(pathField);
        if (restPath !== null) {
            const assoc: Assoc = this.entityMetadataService.getAssoc(this.entity, field);
            if (assoc.relationType === "one-to-many") {
                const subQueryData: SubQueryData = this.getSubQueryData(assoc);
                //console.log("created subquery for pathField = " + pathField);
                return [subQueryData, restPath];
            }
        }
        return [this, pathField];
    }

    getSubQueryData(xAssocOneToMany: Assoc): SubQueryData {
        const aliasAssocOneToMany: string = `${this.rootAlias}.${xAssocOneToMany.name}`;
        let subQueryData: SubQueryData = this.assocSubQueryDataMap.get(aliasAssocOneToMany);
        if (subQueryData === undefined) {
            const aliasSubQuery: string = "ts" + (this.assocSubQueryDataMap.size + 1).toString();
            const assocToOneWhereItem: string = `${aliasSubQuery}.${xAssocOneToMany.inverseAssocName} = ${this.rootAlias}.${this.entity.idField}`;
            subQueryData = new SubQueryData(this.entityMetadataService, xAssocOneToMany.entityName, aliasSubQuery, assocToOneWhereItem);
            this.assocSubQueryDataMap.set(aliasAssocOneToMany, subQueryData);
        }
        return subQueryData;
    }

    // ******************* methods for processing created data - creating where items, creating SelectQueryBuilder ********************

    /**
     * @param mainQueryBuilderForExistsSubQueries - if not undefined, method creates EXISTS where items for subqueries (used for COUNT/SUM/... selects)
     */
    createFtsWhereItem(mainQueryBuilderForExistsSubQueries: SelectQueryBuilder<unknown> | undefined): string | "" {

        let ftsWhere: string | "" = "";
        if (this.fullTextSearch) {
            const ftsValueFromParam: string = this.fullTextSearch.value;
            let ftsValueList: string[];
            let ftsSeparator: string;
            if (this.fullTextSearch.splitValue) {
                if (ftsValueFromParam.trim() === '') {
                    ftsValueList = [ftsValueFromParam]; // we also support searching e.g. three spaces '   ' - do we want that?
                }
                else {
                    ftsValueList = ftsValueFromParam.split(' ').filter((value: string) => value !== ''); // we do not want possible empty strings ''
                }
                ftsSeparator = QueryData.ftsSeparator; // separator | - mainly because of possible startsWith, startsEnd, equals operators
            }
            else {
                ftsValueList = [ftsValueFromParam]; // no split by space
                ftsSeparator = " "; // if we did not use a space between columns, then when entering two or more values it would not hit a value created from two (or more) columns
            }
            for (const ftsValue of ftsValueList) {
                // we take the condition from the main query
                let ftsWhereForValue: string | "" = this.createFtsWhereItemForQuery(ftsValue, ftsSeparator);
                // we take the conditions from the subqueries
                for (const [assocOneToMany, subQueryData] of this.assocSubQueryDataMap.entries()) {
                    ftsWhereForValue = QueryData.whereItemOr(ftsWhereForValue, subQueryData.createFtsWhereItemForSubQuery(mainQueryBuilderForExistsSubQueries, ftsValue, ftsSeparator));
                }
                if (ftsWhereForValue !== "") {
                    ftsWhereForValue = `(${ftsWhereForValue})`; // we parenthesize possible ORs
                }
                ftsWhere = QueryData.whereItemAnd(ftsWhere, ftsWhereForValue);
            }
        }
        return ftsWhere;
    }
}
