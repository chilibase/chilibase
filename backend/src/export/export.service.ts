import {Entity, Field} from "../common/EntityMetadata.js";
import {UtilsMetadataCommon} from "../common/UtilsMetadataCommon.js";
import {UtilsCommon} from "../common/UtilsCommon.js";
import {AsUIType, convertValueBase} from "../common/UtilsConversions.js";
import {SelectQueryBuilder} from "typeorm";
import {RawSqlResultsToEntityTransformer} from "typeorm/query-builder/transformer/RawSqlResultsToEntityTransformer.js";
import {TextFormat} from "../common/types.js";
import {ToManyAssocExportType} from "../common/ExportImportParam.js";

// structures used for export to excel and to csv

// field type - it goes as a parameter into the convertValue function
// it should be used as the type for XField.type instead of string, but currently anything can go into XField.type, so for now we use it only here

export type FieldType = "string" | "decimal" | "date" | "datetime" | "interval" | "boolean";

export interface ExportColumn {
    header: string;
    field: string | ((row: any) => any);
    type?: FieldType; // explicitly specified type - used if we do not have a metadata XField
    textFormat?: TextFormat; // text format (multiline/html) - used for texts (type string)
    width?: number;
}

export abstract class ExportService {

    // function used in ExportExcelService and ExportCsvService
    exportRow(columns: ExportColumn[], toManyAssocExportType: ToManyAssocExportType, fieldsToDuplicateValues: string[] | undefined, entityMetadata: Entity | undefined, row: any): Array<Array<any>> {

        // the created excel/csv row is made up of columns - normally a column has exactly 1 value,
        // but if it is a field loaded through a one-to-many association, that column has all values loaded through that association (it can also be 0 values)
        // we write the length of the longest column into "maxColumnIndex"
        const columnList: Array<any[]> = new Array<any[]>(columns.length);
        let maxColumnLength: number = 1;
        for (const [columnIndex, exportColumn] of columns.entries()) {

            let fieldType: string | undefined = exportColumn.type;
            let scale: number | undefined = undefined;
            let value: any | any[];
            if (typeof exportColumn.field === 'function') {
                value = exportColumn.field(row);
            } else {
                // we have a field - exportColumn.field is of type string
                // if we do not have an explicit type and we have an entity specified, we try to find the type in the metadata
                if (!fieldType) {
                    if (entityMetadata) {
                        const field: Field | undefined = UtilsMetadataCommon.getFieldByPathBase(entityMetadata, exportColumn.field);
                        if (field) {
                            fieldType = field.type;
                            scale = field.scale; // used for decimal and date
                        }
                    }
                }

                value = UtilsCommon.getValueOrValueListByPath(row, exportColumn.field);
            }

            let columnValues: any[];
            let columnValuesProcessed: boolean = false;
            if (Array.isArray(value)) {
                columnValues = value;

                if (toManyAssocExportType === ToManyAssocExportType.Singleline || toManyAssocExportType === ToManyAssocExportType.Multiline) {
                    // we merge all values into one string value
                    if (fieldType) {
                        // TODO - if we do not have metadata available, scale may be missing
                        //  - if that becomes a problem, we need to add specifying scale explicitly (similarly to how fieldType is specified)
                        columnValues = columnValues.map((value: any) => convertValueBase(fieldType, scale, value, true, AsUIType.Text));
                    }
                    else {
                        // we do not know the type, it is not good to use it this way, the type should always be specified
                        columnValues = columnValues.map((value: any) => (value !== null && value !== undefined) ? value.toString() : "");
                    }
                    // columnValues is string array, we can join the values
                    const separator: string = toManyAssocExportType === ToManyAssocExportType.Singleline ? ", " : "\n";
                    columnValues = [columnValues.join(separator)];
                    // suppress next conversion
                    columnValuesProcessed = true;
                }
            } else {
                columnValues = [value]; // column with one value in the first row
            }

            if (!columnValuesProcessed) {
                if (fieldType) {
                    columnValues = columnValues.map((value: any) => convertValueBase(fieldType, scale, value, true, AsUIType.Excel));
                }
            }

            if (columnValues.length > maxColumnLength) {
                maxColumnLength = columnValues.length;
            }

            // we convert the values if needed
            //columnValues = this.convertValues(columnValues, xFieldList[index], csvWriter);

            // we store the column into the array of columns
            columnList[columnIndex] = columnValues;
        }

        // the "matrix" is ready, we create the rows
        const resultRowList: Array<Array<any>> = new Array<Array<any>>(maxColumnLength);
        for (let rowIndex: number = 0; rowIndex < maxColumnLength; rowIndex++) {
            const rowValues: Array<any> = new Array<any>(columns.length);
            for (const [index, columnValues] of columnList.entries()) {
                let csvValue: any;
                if (rowIndex < columnValues.length) {
                    csvValue = columnValues[rowIndex];
                }
                else {
                    csvValue = ""; // empty cell (default)

                    // if we have specified columns in which we want to duplicate values, we duplicate the value from the first row (master record)
                    // (they should not be toMany columns)
                    if (fieldsToDuplicateValues) {
                        const field: string | ((row: any) => any) = columns[index].field;
                        if (typeof field === 'string') {
                            if (fieldsToDuplicateValues.includes(field)) {
                                if (columnValues.length > 0) {
                                    csvValue = columnValues[0];
                                }
                            }
                        }
                    }
                }
                rowValues[index] = csvValue;
            }
            // and we write the row
            resultRowList[rowIndex] = rowValues;
        }
        return resultRowList;
    }

    // if needed, move to XUtils
    protected transformToEntity(data: any, selectQueryBuilder: SelectQueryBuilder<unknown>): any {
        // warning, this transformation returns some decimals (e.g. Car.price) as string, that is probably not standard
        const transformer = new RawSqlResultsToEntityTransformer(selectQueryBuilder.expressionMap, selectQueryBuilder.connection.driver, []);
        const entityList: any[] = transformer.transform([data], selectQueryBuilder.expressionMap.mainAlias!);
        return entityList[0];
    }
}
