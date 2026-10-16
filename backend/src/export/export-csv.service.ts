import {HttpStatus, Injectable} from "@nestjs/common";
import {Response} from "express";
import {
    CsvDecimalFormat,
    CsvEncoding,
    CsvParam, ExcelCsvParam,
    ExportCsvParam,
    ToManyAssocExportType
} from "../common/ExportImportParam.js";
import {UtilsCommon} from "../common/UtilsCommon.js";
import {dateFormat, datetimeFormat, numberFromModel} from "../common/UtilsConversions.js";
// note - when this was here: import iconv from "iconv-lite"; it did not work and apparently it is related to nestjs
import * as iconv from "iconv-lite";
import {ExportColumn, ExportService} from "./export.service.js";
import {SelectQueryBuilder} from "typeorm";
import {ReadStream} from "fs";
import {Entity} from "../common/EntityMetadata.js";
import {UtilsMetadataCommon} from "../common/UtilsMetadataCommon.js";

// helper class
export class CsvWriter {

    csvParam: CsvParam;
    res: Response;

    constructor(csvParam: CsvParam, res: Response) {
        this.csvParam = csvParam;
        this.res = res;
    }

    writeRow(...valueList: any) {
        let csvRow: string = "";
        let firstItem: boolean = true;
        for (const value of valueList) {

            let valueStr: string = this.convertToStr(value);
            valueStr = this.processCsvItem(valueStr);

            if (firstItem) {
                firstItem = false;
            }
            else {
                csvRow += this.csvParam.csvSeparator;
            }
            csvRow += valueStr;
        }
        csvRow += UtilsCommon.newLine;
        this.res.write(iconv.encode(csvRow, this.csvParam.csvEncoding)); // I do not know if this is the ideal way to use iconv, but it works...
    }

    // must be called at the end of export (after calls writeRow(...))
    end() {
        this.res.status(HttpStatus.OK);
        this.res.end();
    }

    // properly the conversion should happen in ExportService.exportRow by calling convertValueBase, because there we have metadata about types (fractionDigits, whether it is date/datetime),
    // here on the other hand we have the info whether to convert decimal numbers into the format 123456.78 or 123456,78 (in the numberAsCsv method)
    private convertToStr(value: any): string {

        let valueStr: string;
        if (value === null || value === undefined) {
            valueStr = ""; // TODO - possibly add a choice into the dialog that null -> "null", if we wanted to distinguish it from an empty string
        }
        else if (typeof value === 'number') {
            valueStr = this.numberAsCsv(value);
        }
        else if (value instanceof Date) {
            // TODO - if for datetime we set all time components to 00:00:00, it formats the value as a date and causes an error when writing to the DB - it writes 1:00:00
            if (value.getUTCHours() === 0 && value.getUTCMinutes() === 0 && value.getUTCSeconds() === 0) {
                valueStr = dateFormat(value, 'yyyy-MM-dd');
            }
            else {
                // it is a datetime
                valueStr = datetimeFormat(value, 'yyyy-MM-dd HH:mm:ss');
            }
        }
        else {
            valueStr = value.toString();
        }
        return valueStr;
    }

    private processCsvItem(valueStr: string): string {
        // my old Excel 2010 refused to load a file that contained the string ID in a cell
        if (valueStr === "ID") {
            valueStr = '"' + valueStr + '"';
        }
        else {
            valueStr = valueStr.replace(/"/g, '""'); // the equivalent for the regexp /"/g is: new RegExp('"', 'g')
            // here too I use XUtils.csvSeparator
            if (valueStr.search(new RegExp(`("|${this.csvParam.csvSeparator}|\n)`, 'g')) >= 0) {
                valueStr = '"' + valueStr + '"';
            }
        }
        return valueStr;
    }

    // helper for formatting numbers
    number(value: any): string {
        const numberValue: number | null = numberFromModel(value); // sometimes strings apparently come from the DB, so just in case we call numberFromModel
        return this.numberAsCsv(numberValue);
    }

    // the numberAsUI function returns the format 123,456,78 which we do not want, that is why we have numberAsCsv
    numberAsCsv(value: number | null): string {
        let valueStr: string = "";
        // valueStr should be for example 123456,78
        if (value !== null) {
            //valueStr = value.toFixed(fractionDigits ?? 2); // returns 123456.78 and also rounds (which suits us :-)
            valueStr = value.toString(); // returns 123456.78 - creates as many decimal places as the value has (we do not need fractionDigits)
            if (this.csvParam.csvDecimalFormat === CsvDecimalFormat.Comma) {
                valueStr = valueStr.replace('.', ','); // result 123456,78
            }
            // for this.csvParam.csvDecimalFormat === CsvDecimalFormat.Dot we keep 123456.78
        }
        return valueStr;
    }
}

@Injectable()
export class ExportCsvService extends ExportService {

    // simple api for custom export
    export(csvParam: CsvParam, columns: ExportColumn[], entity: string | undefined, rows: any[], res: Response) {
        this.exportBase(csvParam, columns, true, ToManyAssocExportType.Multiline, undefined, entity, rows, res);
    }

    // extended api for custom export
    // TODO - we do not use a stream but we write into res: Response, we do not return Promise<StreamableFile> - it is a bit strange, it is not very nice
    // (if we want to have it properly, we should probably have 2 rest methods in the controller - one for stream (uses res: Response) and the other for list (returns Promise<StreamableFile>))
    exportBase(csvParam: CsvParam, columns: ExportColumn[], createHeaders: boolean, toManyAssocExportType: ToManyAssocExportType, fieldsToDuplicateValues: string[] | undefined, entity: string | undefined, rows: any[], res: Response) {

        const csvWriter: CsvWriter = this.startExport(csvParam, columns, createHeaders, res);

        const entityMetadata: Entity | undefined = entity ? UtilsMetadataCommon.getEntity(entity) : undefined;

        for (const row of rows) {
            this.exportRowToCsv(columns, toManyAssocExportType, fieldsToDuplicateValues, entityMetadata, row, csvWriter);
        }

        csvWriter.end();
    }

    async exportUsingList(exportCsvParam: ExportCsvParam, columns: ExportColumn[], selectQueryBuilder: SelectQueryBuilder<unknown>, res: Response): Promise<void> {

        const rowList: any[] = await selectQueryBuilder.getMany();

        const excelCsvParam: ExcelCsvParam = exportCsvParam.excelCsvParam;
        this.exportBase(exportCsvParam.csvParam, columns, excelCsvParam.createHeaders, excelCsvParam.toManyAssocExportType, excelCsvParam.fieldsToDuplicateValues, exportCsvParam.queryParam.entity, rowList, res);
    }

    async exportUsingStream(exportCsvParam: ExportCsvParam, columns: ExportColumn[], selectQueryBuilder: SelectQueryBuilder<unknown>, res: Response): Promise<void> {

        const csvWriter: CsvWriter = this.startExport(exportCsvParam.csvParam, columns, exportCsvParam.excelCsvParam.createHeaders, res);

        const readStream: ReadStream = await selectQueryBuilder.stream();

        const entityMetadata = UtilsMetadataCommon.getEntity(exportCsvParam.queryParam.entity);

        readStream.on('data', data => {
            const entityObj = this.transformToEntity(data, selectQueryBuilder);
            this.exportRowToCsv(columns, exportCsvParam.excelCsvParam.toManyAssocExportType, exportCsvParam.excelCsvParam.fieldsToDuplicateValues, entityMetadata, entityObj, csvWriter);
        });

        readStream.on('end', () => {
            csvWriter.end();
        });
    }

    startExport(csvParam: CsvParam, columns: ExportColumn[], createHeaders: boolean, res: Response): CsvWriter {

        const headerCharset: string = ExportCsvService.getHeaderCharset(csvParam.csvEncoding); // e.g. UTF-8, windows-1250

        res.setHeader("Content-Type", `text/csv; charset=${headerCharset}`);
        res.charset = headerCharset; // default encoding - it probably sets this value into charset=<res.charset> in the "Content-Type" header
        // if the charset attribute is not defined explicitly - TODO - try it out

        const csvWriter: CsvWriter = new CsvWriter(csvParam, res);

        if (createHeaders) {
            csvWriter.writeRow(...columns.map((value: ExportColumn) => value.header));
        }

        // because of using streams, the programmer has to call csvWriter.end() explicitly
        //res.status(HttpStatus.OK);
        //res.end();

        return csvWriter;
    }

    static getHeaderCharset(csvEncoding: CsvEncoding): string {
        let headerCharset: string;
        switch (csvEncoding) {
            case CsvEncoding.Utf8:
                headerCharset = "UTF-8";
                break;
            case CsvEncoding.Win1250:
                headerCharset = "windows-1250";
                break;
            default:
                throw `HeaderCharset for csvEncoding "${csvEncoding}" not implemented`;
        }
        return headerCharset;
    }

    // helper
    private exportRowToCsv(columns: ExportColumn[], toManyAssocExportType: ToManyAssocExportType, fieldsToDuplicateValues: string[], entityMetadata: Entity, row: any, csvWriter: CsvWriter) {
        // the method this.exportRow converts values to types (e.g. number, Date) and csvWriter.writeRow converts types to string
        const resultRowList: Array<Array<any>> = this.exportRow(columns, toManyAssocExportType, fieldsToDuplicateValues, entityMetadata, row);
        for (const resultRow of resultRowList) {
            csvWriter.writeRow(...resultRow);
        }
    }
}
