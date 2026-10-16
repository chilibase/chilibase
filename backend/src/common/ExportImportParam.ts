// ExportType and LazyDataTableQueryParam are used in a separate service that streams data
// (unlike ResultType.AllRows which should not even be used - all rows should not be pulled to the client in one large request)
import type {DataTableSortMeta} from "./PrimeFilterSortMeta.js";
import type {CustomFilterItem, ExtendedDataTableFilterMeta, FullTextSearch} from "./FindParam.js";
import type {TextFormat} from "./types.js";

// ************** export ***************

export enum ExportType {
    Excel = "excel",
    Csv = "csv",
    Json = "json"
}

export interface ExportExcelParam {
    queryParam: LazyDataTableQueryParam;
    excelCsvParam: ExcelCsvParam;
}

export interface ExportCsvParam {
    queryParam: LazyDataTableQueryParam;
    excelCsvParam: ExcelCsvParam;
    csvParam: CsvParam;
}

export interface ExportJsonParam {
    queryParam: LazyDataTableQueryParam;
}

export interface LazyDataTableQueryParam {
    filters: ExtendedDataTableFilterMeta;
    fullTextSearch?: FullTextSearch;
    customFilterItems?: CustomFilterItem[];
    multiSortMeta?: DataTableSortMeta[]; // type []
    entity: string;
    fields: string[];
}

// params used by export to excel and to csv
export interface ExcelCsvParam {
    columns: ExportColumnParam[]; // array corresponds to queryParam.fields
    createHeaders: boolean; // creates header row if true
    toManyAssocExportType: ToManyAssocExportType; // export of toMany associations
    fieldsToDuplicateValues?: string[]; // (subset of LazyDataTableQueryParam.fields)
}

export interface ExportColumnParam {
    header?: string;
    width?: string; // width of the column, e.g. '7.75rem', '20rem', '125px', used only for excel
    textFormat?: TextFormat; // for now used only for excel (in future can be used also for csv)
}

// exporting values from toMany associations
export enum ToManyAssocExportType {
    Singleline = "singleline", // values are joined into one long text, separated by comma ","
    Multiline = "multiline", // values are written under each other into column, all values are in one cell separated by new line (works only for excel)
    Multirow = "multirow", // values are written under each other into column, every value has separated cell/row
    Off = "off" // columns containing multiple values/rows are omitted from the export
}

// csv parameters used during csv export/import
export interface CsvParam {
    csvSeparator: CsvSeparator;
    csvDecimalFormat: CsvDecimalFormat;
    csvEncoding: CsvEncoding;
}

// on windows it depends on the regional settings, the default setting is ";" and therefore excel mostly also produces csv with ";" (it clashes less with decimals)
// so we primarily use ";" and secondarily "," e.g. during a generic export to csv we give the user a choice
export enum CsvSeparator {
    Semicolon = ";",
    Comma = ","
}

// decimal format used during export to csv
export enum CsvDecimalFormat {
    Comma = "123456,78",
    Dot = "123456.78"
}

// for now only these 2, if needed, then add e.g. win1252 (Western Europe)
// we use win1250 as the default, because Excel automatically assumes the win1250 encoding
// the constants are used directly in the iconv-lite library
export enum CsvEncoding {
    Utf8 = "utf-8",
    Win1250 = "win1250"
}

// ************** import ***************

export enum ImportType {
    Csv = "csv",
    Json = "json"
}

export interface ImportParam {
    importType: ImportType;
    entity: string;
    //fields: string[]; // used only during csv import
    csvParam: CsvParam; // TODO - remove and also remove from the import dialog
}

export interface ImportResponse {
    ok: boolean;
    rowsImported?: number;
    error?: string;
}
