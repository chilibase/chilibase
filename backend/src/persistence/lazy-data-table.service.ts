import {Injectable, StreamableFile} from '@nestjs/common';
import {FindResult, AggregateValues} from "../common/FindResult.js";
import {DataSource, EntityManager, Repository, SelectQueryBuilder} from "typeorm";
import {
    FindParam,
    ResultType, CustomFilterItem,
    FullTextSearch,
    LazyAutoCompleteSuggestionsRequest
} from "../common/FindParam.js";
import {Response} from "express";
import {
    ExportColumnParam,
    ExportCsvParam,
    ExportExcelParam,
    ExportJsonParam,
    LazyDataTableQueryParam
} from "../common/ExportImportParam.js";
import {EntityMetadataService} from "../entity-metadata/entity-metadata.service.js";
import {MainQueryData} from "./query-data/MainQueryData.js";
import {QueryData} from "./query-data/QueryData.js";
import {SubQueryData} from "./query-data/SubQueryData.js";
import {ExportColumn} from "../export/export.service.js";
import {ExportExcelService} from "../export/export-excel.service.js";
import {ExportJsonService} from "../export/export-json.service.js";
import {ExportCsvService} from "../export/export-csv.service.js";
import {numberFromString} from "../common/UtilsConversions.js";
import {DataTableSortMeta} from "../common/PrimeFilterSortMeta.js";
import {Assoc, Entity} from "../common/EntityMetadata.js";
import {UtilsCommon} from "../common/UtilsCommon.js";
import {FindRowByIdRequest, FindRowByIdResponse} from "../common/lib-api.js";
import {PersistenceService} from "./persistence.service.js";

@Injectable()
export class LazyDataTableService {

    constructor(
        private readonly dataSource: DataSource,
        private readonly entityMetadataService: EntityMetadataService,
        private readonly persistenceService: PersistenceService,
        private readonly exportCsvService: ExportCsvService,
        private readonly exportExcelService: ExportExcelService,
        private readonly exportJsonService: ExportJsonService
    ) {
    }

    async findRows(findParam : FindParam): Promise<FindResult> {
        //console.log("LazyDataTableService.findRows findParam = " + JSON.stringify(findParam));

        // TODO - optimization - leftJoins can be replaced with joins if the ManyToOne association is not null (joins are faster than leftJoins)

        this.createDefaultFieldsForFullTextSearch(findParam.fullTextSearch, findParam.fields);
        const mainQueryData: MainQueryData = new MainQueryData(this.entityMetadataService, findParam.entity, "t", findParam.filters, findParam.fullTextSearch, findParam.customFilterItems);

        let rowCount: number;
        const aggregateValues: AggregateValues = {};
        if (findParam.resultType === ResultType.OnlyRowCount || findParam.resultType === ResultType.RowCountAndPagedRows) {
            //const xEntity: XEntity = this.entityMetadataService.getEntity(findParam.entity);
            const selectQueryBuilder: SelectQueryBuilder<unknown> = this.dataSource.createQueryBuilder(mainQueryData.entity.name, mainQueryData.rootAlias);
            // originally there was COUNT(1) here but because of where conditions on OneToMany associations we changed it to COUNT(DISTINCT t0.id)
            // it can be optimized so that COUNT(DISTINCT t0.id) is used only when a where condition on a OneToMany association is used
            // (but then it has to be detected somehow, for now we always use COUNT(DISTINCT t0.id))
            //selectQueryBuilder.select(`COUNT(DISTINCT ${rootAlias}.${xEntity.idField})`, "count");
            selectQueryBuilder.select(`COUNT(1)`, "count");
            // aggregate fields
            if (findParam.aggregateItems) {
                for (const aggregateItem of findParam.aggregateItems) {
                    const [queryData, fieldNew]: [QueryData, string] = mainQueryData.getQueryForPathField(aggregateItem.field);
                    const dbField: string = queryData.getFieldFromPathField(fieldNew);
                    if (queryData.isMainQueryData()) {
                        // we use aggregateItem.field as the alias, it can also contain "." (e.g. assoc1.field1), the DB handles it if `assoc1.field1` is used, maybe it will have to be reworked
                        selectQueryBuilder.addSelect(`${aggregateItem.aggregateFunction}(${dbField})`, aggregateItem.field);
                    }
                    else {
                        // we create a subquery, separately for each field; if we wanted it more efficiently, we would have to make a separate select
                        // but we would have to add the where conditions from the main query to this separate select in a complicated way
                        const subQueryData: SubQueryData = queryData as SubQueryData;
                        const selectSubQueryBuilder: SelectQueryBuilder<unknown> = subQueryData.createQueryBuilder(selectQueryBuilder, `${aggregateItem.aggregateFunction}(${dbField})`);
                        // the alias contains "." !
                        // here we already use the aggregate function for the second time - for SUM, MIN, MAX it is ok, but for AVG it affects the result!
                        selectQueryBuilder.addSelect(`${aggregateItem.aggregateFunction}(${selectSubQueryBuilder.getQuery()})`, aggregateItem.field);
                    }
                }
            }

            for (const [field, alias] of mainQueryData.assocAliasMap.entries()) {
                selectQueryBuilder.leftJoin(field, alias);
            }
            if (mainQueryData.where !== "") {
                selectQueryBuilder.where(mainQueryData.where, mainQueryData.params);
            }
            else {
                selectQueryBuilder.where("1 = 1");// so that a possible addition of selectQueryBuilder.andWhereExists works
            }

            for (const [assocOneToMany, subQueryData] of mainQueryData.assocSubQueryDataMap.entries()) {
                // we add the EXISTS (subquery) condition
                // we add EXISTS only if filling in some item in the filter (or through a custom filter) created some where condition
                // (a subquery can also arise e.g. through SUM of a column on a OneToMany association, but then we do not want EXISTS, because the main select works through LEFT JOIN,
                // it also selects records that have no detail and we want COUNT to count exactly as many records as the main select returns)
                if (subQueryData.where !== "") {
                    const selectSubQueryBuilder: SelectQueryBuilder<unknown> = subQueryData.createQueryBuilder(selectQueryBuilder, `1`);
                    selectQueryBuilder.andWhereExists(selectSubQueryBuilder);
                }
            }

            // we add possible where conditions for full-text search
            // to the existing where condition we add through AND:
            // (<main-query full-text cond> OR EXISTS <sub-query-1 full-text cond> OR EXISTS <sub-query-2 full-text cond> OR ...)
            // -> and we add this whole condition (through AND) as many times as we have values from the input for full-text search
            // (i.e. if we have "Janko Mrkvicka" on the input, one where condition will be for "Janko" and the other for "Mrkvicka" and they will be joined through AND)
            // param selectQueryBuilder = will create EXISTS conditions for subqueries
            const ftsWhereItem: string | "" = mainQueryData.createFtsWhereItem(selectQueryBuilder);
            if (ftsWhereItem !== "") {
                selectQueryBuilder.andWhere(`(${ftsWhereItem})`);
            }

            const rowOne = await selectQueryBuilder.getRawOne();
            rowCount = rowOne.count;
            if (findParam.aggregateItems) {
                for (const aggregateItem of findParam.aggregateItems) {
                    aggregateValues[aggregateItem.field] = rowOne[aggregateItem.field];
                }
            }

            //console.log("LazyDataTableService.readLazyDataTable rowCount = " + rowCount);
        }

        let rowList: any[];
        if (findParam.resultType === ResultType.OnlyPagedRows || findParam.resultType === ResultType.RowCountAndPagedRows || findParam.resultType === ResultType.AllRows) {
            mainQueryData.addSelectItems(findParam.fields);
            mainQueryData.addOrderByItems(findParam.multiSortMeta);

            const selectQueryBuilder: SelectQueryBuilder<unknown> = this.createQueryBuilderFromMainQuery(null, mainQueryData);

            if (findParam.resultType === ResultType.OnlyPagedRows || findParam.resultType === ResultType.RowCountAndPagedRows) {
                selectQueryBuilder.skip(findParam.first);
                selectQueryBuilder.take(findParam.rows);
            }

            rowList = await selectQueryBuilder.getMany();

            if (findParam.resultType === ResultType.AllRows) {
                rowCount = rowList.length;
            }
        }

        const findResult: FindResult = {rowList: rowList, totalRecords: rowCount, aggregateValues: aggregateValues};
        return findResult;
    }

    // method mainly to unify the common code
    // TODO - should it not go into MainQueryData? it should, but then creating the query builder for the COUNT/SUM select should also go into MainQueryData, for now we leave it
    // for using in transaction, pass param manager, otherwise pass manager = null
    createQueryBuilderFromMainQuery(manager: EntityManager, mainQueryData: MainQueryData): SelectQueryBuilder<unknown> {

        // TODO - select only the columns that are needed - it did not work out, more in TODO.txt
        // TODO - tables added when creating mainQueryData.orderByItems do not have to be selected, it is enough to join them, but for simplicity we select them too
        // TODO - similarly also tables added through a custom filter or through full-text search that contains columns other than those in the browse - those we also do not need to select,
        // i.e. there is no need to call leftJoinAndSelect(field, alias), it is enough to call leftJoin(field, alias) - besides the alias we would also want to record whether a select is needed (a boolean value)
        // original code (before use manager/transaction) (there are some differences between using repository and not using repository)
        //const selectQueryBuilder: SelectQueryBuilder<unknown> = this.dataSource.createQueryBuilder(mainQueryData.entity.name, mainQueryData.rootAlias);
        const repository: Repository<unknown> = manager ? manager.getRepository(mainQueryData.entity.name) : this.dataSource.getRepository(mainQueryData.entity.name);
        const selectQueryBuilder: SelectQueryBuilder<unknown> = repository.createQueryBuilder(mainQueryData.rootAlias);

        for (const [field, alias] of mainQueryData.assocAliasMap.entries()) {
            selectQueryBuilder.leftJoinAndSelect(field, alias);
        }
        // we also join tables added through oneToMany associations (because we may need to load fields from these tables)
        let where: string = mainQueryData.where;
        let params: {} = mainQueryData.params;
        for (const [assocOneToMany, subQueryData] of mainQueryData.assocSubQueryDataMap.entries()) {
            selectQueryBuilder.leftJoinAndSelect(assocOneToMany, subQueryData.rootAlias);
            for (const [field, alias] of subQueryData.assocAliasMap.entries()) {
                selectQueryBuilder.leftJoinAndSelect(field, alias);
            }
            where = QueryData.whereItemAnd(where, subQueryData.where);
            params = {...params, ...subQueryData.params}; // TODO - will params get overwritten? if yes, the second value overwrites the previous one
        }

        // param undefined = we do not want EXISTS, we want classic where conditions
        where = QueryData.whereItemAnd(where, mainQueryData.createFtsWhereItem(undefined));

        if (where !== "") {
            selectQueryBuilder.where(where, params);
        }
        selectQueryBuilder.orderBy(mainQueryData.orderByItems);

        return selectQueryBuilder;
    }

    // temporarily we put findRowById here, because we use similar joining as when reading data for lazy tables
    // (in the future we can unify it more with the lazy table)
    async findRowById(findRowRequest: FindRowByIdRequest): Promise<FindRowByIdResponse> {
        // we use transaction only by locking (we spare the commands START TRANSACTION and COMMIT when we don't use transaction)
        if (findRowRequest.lockDate) {
            return this.dataSource.transaction(manager => this.findRowByIdWithLockInTransaction(manager, findRowRequest));
        }
        else {
            const row: any = await this.findRowByIdBase(null, findRowRequest);
            return {row: row, lockAcquired: false};
        }
    }

    private async findRowByIdWithLockInTransaction(manager: EntityManager, findRowRequest: FindRowByIdRequest): Promise<FindRowByIdResponse> {
        // we select the row in transaction, in order to use SELECT FOR UPDATE and write the lock (if the row is not locked)
        const rowForUpdate: any = await this.persistenceService.findRowByIdForLocking(manager, findRowRequest.entity, findRowRequest.id);
        let lockAcquired: boolean = false;
        if (rowForUpdate.lockDate === null || findRowRequest.overwriteLock) {
            // row is not locked (or we do lock overwrite), put the lock
            rowForUpdate.lockDate = findRowRequest.lockDate;
            rowForUpdate.lockUser = findRowRequest.lockUser;
            await manager.getRepository(findRowRequest.entity).save(rowForUpdate); // for now we use save, because update increments the version attribute (version will go away though)
            lockAcquired = true;
        }

        const row: any = await this.findRowByIdBase(manager, findRowRequest);
        return {row: row, lockAcquired: lockAcquired};
    }

    async findRowByIdBase(manager: EntityManager, findRowRequest: FindRowByIdRequest): Promise<any> {
        // select the whole row (also with assocs)
        const mainQueryData: MainQueryData = new MainQueryData(this.entityMetadataService, findRowRequest.entity, "t", undefined, undefined, undefined);
        mainQueryData.addSelectItems(findRowRequest.fields);

        const selectQueryBuilder: SelectQueryBuilder<unknown> = this.createQueryBuilderFromMainQuery(manager, mainQueryData);
        selectQueryBuilder.whereInIds([findRowRequest.id]);
        return selectQueryBuilder.getOneOrFail();
    }

    // sorts all oneToMany assocs with cascade (insert and update) by id - it is default sorting used by DetailDataTable on the frontend
    // helper method to avoid explicit sorting, used usually after LazyDataTableService.findRowById
    sortCascadeAssocsByIdField(xEntity: Entity, row: any) {
        const assocOneToManyList: Assoc[] = this.entityMetadataService.getAssocList(xEntity, ["one-to-many"]).filter((assoc: Assoc) => assoc.isCascadeInsert && assoc.isCascadeUpdate);
        for (const assoc of assocOneToManyList) {
            const assocRowList: any[] = row[assoc.name];
            const xEntityAssoc: Entity = this.entityMetadataService.getEntity(assoc.entityName);
            // not all associations must be read from DB (if join is missing that assocRowList is undefined)
            if (assocRowList) {
                row[assoc.name] = UtilsCommon.arraySort(assocRowList, xEntityAssoc.idField);
            }
        }
    }

    // ************** support for export ******************

    // note: if these functions (or part of them) could be moved into the export services, it would be nice...

    async exportExcel(exportExcelParam: ExportExcelParam): Promise<StreamableFile> {

        const [selectQueryBuilder, existsToManyAssoc]: [SelectQueryBuilder<unknown>, boolean] = this.createSelectQueryBuilder(exportExcelParam.queryParam);
        const rowList: any[] = await selectQueryBuilder.getMany();

        const columns: ExportColumn[] = [];
        for (const [index, field] of exportExcelParam.queryParam.fields.entries()) {
            const exportColumnParam: ExportColumnParam = exportExcelParam.excelCsvParam.columns[index];
            const cssWidth: string | undefined = exportColumnParam.width; // e.g. '7.75rem' or '250px'
            const width: number | undefined = cssWidth ? this.exportExcelService.cssWidthToExcelWidth(cssWidth) : undefined;
            columns.push({
                header: exportColumnParam.header ?? "",
                field: field,
                textFormat: exportColumnParam.textFormat,
                width: width
            });
        }

        return this.exportExcelService.exportBase(
            exportExcelParam.queryParam.entity,
            columns,
            exportExcelParam.excelCsvParam.createHeaders,
            undefined,
            exportExcelParam.excelCsvParam.toManyAssocExportType,
            exportExcelParam.excelCsvParam.fieldsToDuplicateValues,
            exportExcelParam.queryParam.entity,
            rowList
        );
    }

    exportCsv(exportCsvParam: ExportCsvParam, res: Response): Promise<void> {

        const columns: ExportColumn[] = [];
        for (const [index, field] of exportCsvParam.queryParam.fields.entries()) {
            const exportColumnParam: ExportColumnParam = exportCsvParam.excelCsvParam.columns[index];
            columns.push({
                header: exportColumnParam.header ?? "",
                field: field
            });
        }

        const [selectQueryBuilder, existsToManyAssoc]: [SelectQueryBuilder<unknown>, boolean] = this.createSelectQueryBuilder(exportCsvParam.queryParam);
        if (existsToManyAssoc) {
            return this.exportCsvService.exportUsingList(exportCsvParam, columns, selectQueryBuilder, res);
        } else {
            return this.exportCsvService.exportUsingStream(exportCsvParam, columns, selectQueryBuilder, res);
        }
    }

    exportJson(exportJsonParam: ExportJsonParam, res: Response): Promise<void> {

        const headerCharset: string = "UTF-8";
        res.setHeader(`Content-Type`, `application/json; charset=${headerCharset}`);
        res.charset = headerCharset; // default encoding, it is probably used if charset is not set in 'Content-Type' (see the line above)

        const [selectQueryBuilder, existsToManyAssoc]: [SelectQueryBuilder<unknown>, boolean] = this.createSelectQueryBuilder(exportJsonParam.queryParam);
        if (existsToManyAssoc) {
            return this.exportJsonService.exportJsonUsingList(selectQueryBuilder, res);
        }
        else {
            return this.exportJsonService.exportJsonUsingStream(selectQueryBuilder, res);
        }
    }

    private createSelectQueryBuilder(queryParam: LazyDataTableQueryParam): [SelectQueryBuilder<unknown>, boolean] {

        this.createDefaultFieldsForFullTextSearch(queryParam.fullTextSearch, queryParam.fields);
        const mainQueryData: MainQueryData = new MainQueryData(this.entityMetadataService, queryParam.entity, "t", queryParam.filters, queryParam.fullTextSearch, queryParam.customFilterItems);
        mainQueryData.addSelectItems(queryParam.fields);
        mainQueryData.addOrderByItems(queryParam.multiSortMeta);
        return [this.createQueryBuilderFromMainQuery(null, mainQueryData), mainQueryData.assocSubQueryDataMap.size > 0];
    }

    private createDefaultFieldsForFullTextSearch(fullTextSearch: FullTextSearch | undefined, fields: string[] | undefined) {
        if (fullTextSearch) {
            if (!fullTextSearch.fields) {
                fullTextSearch.fields = fields; // as default columns we use the browse columns
            }
        }
    }

    // ************** support for autocomplete ******************

    async lazyAutoCompleteSuggestions(suggestionsRequest: LazyAutoCompleteSuggestionsRequest): Promise<FindResult> {

        const findParamRows: FindParam = {
            resultType: ResultType.OnlyPagedRows,
            first: 0,
            rows: suggestionsRequest.maxRows,
            entity: suggestionsRequest.entity,
            fullTextSearch: suggestionsRequest.fullTextSearch,
            customFilterItems: suggestionsRequest.filterItems,
            multiSortMeta: suggestionsRequest.multiSortMeta,
            fields: suggestionsRequest.fields
        };
        return await this.findRows(findParamRows);
    }

/*  old unused way - it always has 2 expensive selects (about 200 ms on the clients table for each select):
    async lazyAutoCompleteSuggestionsOld(suggestionsRequest: XLazyAutoCompleteSuggestionsRequest): Promise<FindResult> {

        const findParamCount: FindParam = {
            resultType: ResultType.OnlyRowCount,
            entity: suggestionsRequest.entity,
            fullTextSearch: suggestionsRequest.fullTextSearch,
            customFilterItems: suggestionsRequest.filterItems
        };
        let findResult: FindResult = await this.findRows(findParamCount);
        if (findResult.totalRecords <= suggestionsRequest.maxRows) {
            const findParamRows: FindParam = {
                resultType: ResultType.AllRows,
                entity: suggestionsRequest.entity,
                fullTextSearch: suggestionsRequest.fullTextSearch,
                customFilterItems: suggestionsRequest.filterItems,
                multiSortMeta: suggestionsRequest.multiSortMeta,
                fields: suggestionsRequest.fields
            };
            findResult = await this.findRows(findParamRows);
        }
        return findResult;
    }
*/
    // ************** fetch rows - corresponds to the method XUtils.fetchRows on the frontend ******************

    async fetchRows(entity: string, customFilterItems?: CustomFilterItem[] | undefined, multiSortMeta?: DataTableSortMeta[] | undefined, fields?: string[]): Promise<any[]> {
        const findParam: FindParam = {resultType: ResultType.AllRows, entity: entity, customFilterItems: customFilterItems, multiSortMeta: multiSortMeta, fields: fields};
        const findResult: FindResult = await this.findRows(findParam);
        return findResult.rowList;
    }


    // ************** old unused export ******************
/*
    private async exportCsv(exportParam: ExportParam, res: Response) {

        const selectQueryBuilder: SelectQueryBuilder<unknown> = this.createSelectQueryBuilder(exportParam.queryParam);
        const readStream: ReadStream = await selectQueryBuilder.stream();

        // we need the list of xFields so that we can determine the field type
        const xFieldList: XField[] = [];
        const xEntity = this.entityMetadataService.getEntity(exportParam.queryParam.entity);
        for (const field of exportParam.queryParam.fields) {
            xFieldList.push(this.entityMetadataService.getFieldByPath(xEntity, field));
        }

        const headerCharset: string = ExportCsvService.getHeaderCharset(exportParam.csvParam.csvEncoding); // e.g. UTF-8, windows-1250
        const iconvCharset: CsvEncoding = exportParam.csvParam.csvEncoding; // e.g. utf-8, win1250

        res.setHeader("Content-Type", `text/csv; charset=${headerCharset}`);
        res.charset = headerCharset; // default encoding - it probably sets this value into charset=<res.charset> in the "Content-Type" header
        // if the charset attribute is not defined explicitly - TODO - try it out

        if (exportParam.csvParam.useHeaderLine) {
            const csvRow: string = this.createHeaderLineOld(exportParam.csvParam);
            res.write(iconv.encode(csvRow, iconvCharset)); // I do not know if this is the ideal way to use iconv, but it works...
        }

        readStream.on('data', data => {
            const entityObj = this.transformToEntity(data, selectQueryBuilder);
            const rowStr: string = this.convertToCsvOld(entityObj, exportParam.queryParam.fields, xFieldList, exportParam.csvParam);
            res.write(iconv.encode(rowStr, iconvCharset));
        });

        readStream.on('end', () => {
            res.status(HttpStatus.OK);
            res.end();
        });
    }

    private convertToCsvOld(entityObj: any, fields: string[], xFieldList: XField[], csvParam: CsvParam): string {
        let csvRow: string = "";
        for (const [index, field] of fields.entries()) {
            const xField = xFieldList[index];
            const value = XUtilsCommon.getValueByPath(entityObj, field);
            // value should be at least null (no undefined)
            let valueStr: string;
            if (value !== null && value !== undefined) {
                if (value instanceof Date) {
                    // TODO - if for datetime we set all time components to 00:00:00, it formats the value as a date and causes an error when writing to the DB - it writes 1:00:00
                    if (value.getHours() === 0 && value.getMinutes() === 0 && value.getSeconds() === 0) {
                        valueStr = dateFormat(value, 'yyyy-mm-dd');
                    }
                    else {
                        // it is a datetime
                        valueStr = dateFormat(value, 'yyyy-mm-dd HH:MM:ss');
                    }
                }
                // some decimal values do not arrive as number (typeof value is not 'number' but 'string'), therefore we use xField
                else if (xField.type === "decimal") {
                    if (csvParam.csvDecimalFormat === CsvDecimalFormat.Comma) {
                        valueStr = value.toString().replace('.', ','); // 123456,78
                    }
                    else {
                        // csvParam.csvDecimalFormat === CsvDecimalFormat.Dot
                        valueStr = value.toString(); // 123456.78
                    }
                }
                else {
                    valueStr = value.toString();
                }
            }
            else if (value === null) {
                valueStr = "null";
            }
            else {
                valueStr = "";
            }
            valueStr = this.processCsvItemOld(valueStr, csvParam.csvSeparator);
            if (csvRow.length > 0) {
                csvRow += csvParam.csvSeparator;
            }
            csvRow += valueStr;
        }
        csvRow += XUtilsCommon.newLine;
        return csvRow;
    }

    private createHeaderLineOld(csvParam: CsvParam): string {
        let csvRow: string = "";
        for (const header of csvParam.headers) {
            const valueStr = this.processCsvItemOld(header, csvParam.csvSeparator);
            if (csvRow.length > 0) {
                csvRow += csvParam.csvSeparator;
            }
            csvRow += valueStr;
        }
        csvRow += XUtilsCommon.newLine;
        return csvRow;
    }

    private processCsvItemOld(valueStr: string, csvSeparator: string): string {
        // my old Excel 2010 refused to load a file that contained the string ID in a cell
        if (valueStr === "ID") {
            valueStr = '"' + valueStr + '"';
        }
        else {
            valueStr = valueStr.replace(/"/g, '""'); // the equivalent for the regexp /"/g is: new RegExp('"', 'g')
            // here too I use XUtils.csvSeparator
            if (valueStr.search(new RegExp(`("|${csvSeparator}|\n)`, 'g')) >= 0) {
                valueStr = '"' + valueStr + '"';
            }
        }
        return valueStr;
    }
 */
}
