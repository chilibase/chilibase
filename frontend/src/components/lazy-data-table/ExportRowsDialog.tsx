import {
    CsvDecimalFormat,
    CsvEncoding,
    CsvSeparator,
    ExcelCsvParam,
    ExportColumnParam,
    ExportCsvParam,
    ExportExcelParam,
    ExportJsonParam,
    ExportType,
    LazyDataTableQueryParam,
    ToManyAssocExportType
} from "../../common/ExportImportParam";
import React, {useState} from "react";
import {Dialog} from "primereact/dialog";
import {InputText} from "primereact/inputtext";
import {Dropdown} from "primereact/dropdown";
import {Checkbox} from "primereact/checkbox";
import {Button} from "../button";
import {Utils} from "../../utils/Utils";
import {numberAsUI} from "../../common/UtilsConversions";
import {localeOption} from "../locale/Locale";

// parametre pre dialog
export interface ExportParams {
    rowCount: number; // parameter pre dialog
    existsToManyAssoc: boolean; // parameter pre dialog - ak true, zobrazi option "Detail rows export"
    queryParam: LazyDataTableQueryParam | any; // parametre specificke pre konkretny export (zvycajne hodnoty filtra)
    columns: ExportColumnParam[];
    fieldsToDuplicateValues?: string[]; // pouziva sa pri exporte do excelu a csv
    fileName: string; // fileName without extension
}

export interface ExportRowsDialogState {
    dialogOpened: boolean,
    exportParams?: ExportParams
}

export const ExportRowsDialog = (props: {
    dialogState: ExportRowsDialogState;
    hideDialog: () => void;
    exportTypeOptions?: ExportType[];
}) => {

    const [exportType, setExportType] = useState<ExportType>(ExportType.Excel);
    const [createHeaderLine, setCreateHeaderLine] = useState<boolean>(true);
    const [detailRowsExport, setDetailRowsExport] = useState<ToManyAssocExportType>(ToManyAssocExportType.Multiline);
    const [csvSeparator, setCsvSeparator] = useState(CsvSeparator.Semicolon);
    const [decimalFormat, setDecimalFormat] = useState(CsvDecimalFormat.Comma);
    const [csvEncoding, setCsvEncoding] = useState(CsvEncoding.Win1250);

    // bez tejto metody by pri opetovnom otvoreni dialogu ponechal povodne hodnoty
    const onShow = () => {

        setExportType(ExportType.Excel);
        setCreateHeaderLine(true);
        setDetailRowsExport(ToManyAssocExportType.Multiline);
        setCsvSeparator(CsvSeparator.Semicolon);
        setDecimalFormat(CsvDecimalFormat.Comma);
        setCsvEncoding(CsvEncoding.Win1250);
    }

    const onChangeExportType = (e: any) => {
        setExportType(e.value);
        // multiline is not allowed for csv
        if (e.value === ExportType.Csv && detailRowsExport === ToManyAssocExportType.Multiline) {
            setDetailRowsExport(ToManyAssocExportType.Singleline);
        }
    }

    const onExport = async () => {

        // export vykoname az po zatvoreni dialogu - moze dlho trvat a pobezi asynchronne (user zatial moze pracovat s aplikaciou)

        // zavrieme dialog
        props.hideDialog();
        // TODO - pridat nejake koliesko, pripadne progress bar

        const exportParams: ExportParams = props.dialogState.exportParams!;

        // samotny export
        let apiPath: string;
        let requestPayload: any;
        if (exportType === ExportType.Excel) {
            apiPath = "x-lazy-data-table-export-excel";
            const exportExcelParam: ExportExcelParam = {
                queryParam: exportParams.queryParam,
                excelCsvParam: createExcelCsvParam(exportParams)
            };
            requestPayload = exportExcelParam;
        }
        else if (exportType === ExportType.Csv) {
            apiPath = "x-lazy-data-table-export-csv";
            const exportCsvParam: ExportCsvParam = {
                queryParam: exportParams.queryParam,
                excelCsvParam: createExcelCsvParam(exportParams),
                csvParam: {
                    csvSeparator: csvSeparator, csvDecimalFormat: decimalFormat, csvEncoding: csvEncoding
                }
            };
            requestPayload = exportCsvParam;
        }
        else if (exportType === ExportType.Json) {
            apiPath = "x-lazy-data-table-export-json";
            const exportJsonParam: ExportJsonParam = {
                queryParam: exportParams.queryParam
            };
            requestPayload = exportJsonParam;
        }
        else {
            throw `Unimplemented exportType = ${exportType}`;
        }

        const fileExt: string = exportType === ExportType.Excel ? "xlsx" : exportType;
        const fileName = `${exportParams.fileName}.${fileExt}`;
        Utils.downloadFile(apiPath, requestPayload, fileName);
    }

    const createExcelCsvParam = (exportParams: ExportParams): ExcelCsvParam => {
        return {
            columns: exportParams.columns,
            createHeaders: createHeaderLine,
            fieldsToDuplicateValues: exportParams.fieldsToDuplicateValues,
            toManyAssocExportType: detailRowsExport
        };
    }

    let elem: any[] = [];
    if (props.dialogState.dialogOpened) {
        if (exportType === ExportType.Excel || exportType === ExportType.Csv) {
            elem.push(
                <div key="expCreateHeaderLine" className="field grid">
                    <label className="col-fixed" style={{width: '12rem'}}>{localeOption('expCreateHeaderLine')}</label>
                    <Checkbox checked={createHeaderLine} onChange={(e: any) => setCreateHeaderLine(e.checked)}/>
                </div>
            );
            if (props.dialogState.exportParams?.existsToManyAssoc) {
                const options: ToManyAssocExportType[] = exportType === ExportType.Excel ? Utils.toManyAssocExportTypeExcelOptions : Utils.toManyAssocExportTypeCsvOptions;
                elem.push(
                    <div key="expDetailRowsExport" className="field grid">
                        <label className="col-fixed" style={{width: '12rem'}}>{localeOption('expDetailRowsExport')}</label>
                        <Dropdown value={detailRowsExport} options={Utils.options(options)} onChange={(e: any) => setDetailRowsExport(e.value)}/>
                    </div>
                );
            }
        }
        if (exportType === ExportType.Csv) {
            elem.push([
                <div key="expCsvSeparator" className="field grid">
                    <label className="col-fixed" style={{width:'12rem'}}>{localeOption('expCsvSeparator')}</label>
                    <Dropdown value={csvSeparator} options={Utils.options(Utils.csvSeparatorOptions)} onChange={(e: any) => setCsvSeparator(e.value)}/>
                </div>,
                <div key="expDecimalFormat" className="field grid">
                    <label className="col-fixed" style={{width:'12rem'}}>{localeOption('expDecimalFormat')}</label>
                    <Dropdown value={decimalFormat} options={Utils.options(Utils.decimalFormatOptions)} onChange={(e: any) => setDecimalFormat(e.value)}/>
                </div>,
                <div key="expEncoding" className="field grid">
                    <label className="col-fixed" style={{width:'12rem'}}>{localeOption('expEncoding')}</label>
                    <Dropdown value={csvEncoding} options={Utils.options(Utils.csvEncodingOptions)} onChange={(e: any) => setCsvEncoding(e.value)}/>
                </div>
            ]);
        }
    }

    // poznamka: renderovanie vnutornych komponentov Dialogu sa zavola az po otvoreni dialogu
    return (
        <Dialog visible={props.dialogState.dialogOpened} onShow={onShow} onHide={() => props.hideDialog()}>
            {props.dialogState.exportParams?.rowCount ?
                <div key="expRowCount" className="field grid">
                    <label className="col-fixed" style={{width:'12rem'}}>{localeOption('expRowCount')}</label>
                    <InputText value={numberAsUI(props.dialogState.exportParams?.rowCount ?? null, 0)} readOnly={true}/>
                </div>
                : null
            }
            <div key="expExportType" className="field grid">
                <label className="col-fixed" style={{width:'12rem'}}>{localeOption('expExportType')}</label>
                <Dropdown value={exportType} options={Utils.options(props.exportTypeOptions ?? Utils.exportTypeOptions)} onChange={onChangeExportType}/>
            </div>
            {elem}
            <div key="exportRows" className="flex justify-content-center">
                <Button label={localeOption('exportRows')} onClick={onExport}/>
            </div>
        </Dialog>
    );
}
