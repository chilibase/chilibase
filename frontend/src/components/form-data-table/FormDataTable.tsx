import {FormBase, FormProps} from "../form";
import {EntityRow} from "../../common/types";
import React, {Component, ReactChild} from "react";
import {DropdownDT} from "../dropdown/DropdownDT";
import {
    DataTable,
    DataTableFilterMeta,
    DataTableFilterMetaData,
    DataTableOperatorFilterMetaData, DataTableSortMeta
} from "primereact/datatable";
import {Column, ColumnBodyOptions} from "primereact/column";
import {XButton} from "../XButton";
import {InputTextDT} from "../input-text";
import {XSearchButtonDT} from "../XSearchButtonDT";
import {Assoc, Entity, Field} from "../../common/EntityMetadata";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {OperationType, ViewStatus, ViewStatusOrBoolean} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import {DropdownDTFilter} from "../dropdown/DropdownDTFilter";
import {InputDecimalDT} from "../input-decimal";
import {InputDateDT} from "../input-date";
import {CheckboxDT} from "../checkbox";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {FilterMatchMode, FilterOperator} from "primereact/api";
import {CustomFilter} from "../../common/FindParam";
import {AutoCompleteDT} from "../auto-complete";
import {FormComponentDT} from "./FormComponentDT";
import {XErrorMap} from "../XErrors";
import {XButtonIconNarrow} from "../XButtonIconNarrow";
import {IconType} from "primereact/utils";
import {ButtonProps} from "primereact/button";
import {UtilsCommon} from "../../common/UtilsCommon";
import {xLocaleOption} from "../XLocale";
import {InputIntervalDT} from "../input-interval/InputIntervalDT";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import {SearchBrowseProps} from "../lazy-data-table";
import {InputTextareaDT} from "../input-textarea";
import {SuggestionsLoadProp} from "../auto-complete";

// typ pre technicky field row.__x_rowTechData (row je item zoznamu editovaneho v FormDataTable)
export interface RowTechData {
    // zoznam komponentov na riadku tabulky (vcetne DropdownDT, XSearchButtonDT, ...)
    // po kliknuti na Save formulara sa iteruje tento zoznam a vola sa validacia pre kazdy komponent (input)
    // TODO - nebude to vadit react-u napr. koli performance? tento zoznam bude sucastou form.state.object, co nie je uplne idealne
    // (vyhoda ulozenia zoznamu do __x_rowTechData je to ze tento zoznam automaticky vznika a zanika pri inserte/delete noveho riadku
    formComponentDTList: Array<FormComponentDT<any>>;
    // zoznam validacnych chyb (to iste co form.state.errorMap na XFormBase.ts pre hlavny objekt formularu)
    // chyby sem zapisuje automaticka validacia a pripadna custom validacia
    // chyby sa zobrazia (vycervenenie + tooltip) vo formulari zavolanim this.setState({object: this.state.object});
    // chyby sa renderuju (vycervenenie + tooltip) v komponentoch tak ze komponent cita chyby z tohto errorMap
    errorMap: XErrorMap;
}

export interface DropdownOptionsMap {
    [assocField: string]: any[];
}

// POZNAMKA: parameter width?: string; neviem ako funguje (najme pri pouziti scrollWidth/scrollHeight), ani sa zatial nikde nepouziva
export interface FormDataTableProps {
    form: FormBase;
    assocField: string;
    dataKey?: string;
    paginator?: boolean;
    rows?: number;
    filterDisplay: "menu" | "row" | "none";
    sortable: boolean;
    sortField: string;
    scrollable: boolean; // default true, ak je false, tak je scrollovanie vypnute (scrollWidth/scrollHeight/formFooterHeight su ignorovane)
    scrollWidth?: string; // default 100%, hodnota "none" vypne horizontalne scrollovanie
    scrollHeight?: string; // default '200vh', hodnota "none" vypne vertikalne scrollovanie (ale lepsie je nechat '200vh')
    shrinkWidth: boolean; // default true - ak je true, nerozsiruje stlpce na viac ako je ich explicitna sirka (nevznikaju "siroke" tabulky na celu dlzku parent elementu)
    label?: string;
    readOnly?: boolean;
    showAddRemoveButtons?: boolean;
    onClickAddRow?: () => void;
    onClickRemoveRow?: (row: any) => void;
    removeButtonInRow: boolean; // default true, ak je true, na koniec kazdeho row-u sa zobrazi button X na remove (user nemusi selectovat row aby vykonal remove)
    addRowLabel?: string;
    addRowIcon?: IconType<ButtonProps>;
    removeRowLabel?: string;
    removeRowIcon?: IconType<ButtonProps>;
    width?: string;
    children: ReactChild[];
}

export class FormDataTable extends Component<FormDataTableProps> {

    public static defaultProps = {
        filterDisplay: "none",
        sortable: false,
        sortField: "idFieldOnUpdate",
        scrollable: true,
        //scrollWidth: '100%', // nefungovalo dobre - hodnota '100%' zapne horizontalne scrollovanie, ak je tabulka sirsia ako parent element (a ten by mal byt max 100vw) (hodnota 'auto' (podobna ako '100%') nefunguje dobre)
        scrollWidth: 'viewport', // zapne horizontalne scrollovanie, ak je tabulka sirsia ako display (dolezite pre mobil)
        scrollHeight: '200vh', // ak by sme dali 'none' (do DataTable by islo undefined), tak nam nezarovnava header a body (v body chyba disablovany vertikalny scrollbar),
                                // tym ze pouzivame 200vh (max-height pre body), tak realne scrollovanie sa zapne az pri velmi vela riadkoch
        shrinkWidth: true,
        showAddRemoveButtons: true,
        removeButtonInRow: true,
        addRowIcon: "pi pi-plus",
        removeRowIcon: "pi pi-times"
    };

    props: FormDataTableProps;
    entity?: string;
    dataKey?: string;
    dt: any;

    state: {
        selectedRow: {} | undefined;
        dropdownOptionsMap: DropdownOptionsMap;
        filters: DataTableFilterMeta;
    };

    constructor(props: FormDataTableProps) {
        super(props);
        this.props = props;
        this.dataKey = props.dataKey;
        const xEntityForm: Entity = UtilsMetadataCommon.getEntity(props.form.getEntity());
        const xAssocToMany: Assoc = UtilsMetadataCommon.getAssocToMany(xEntityForm, props.assocField);
        this.entity = xAssocToMany.entityName;
        if (this.dataKey === undefined) {
            this.dataKey = UtilsMetadataCommon.getEntity(this.entity).idField;
        }
        this.state = {
            selectedRow: undefined,
            dropdownOptionsMap: {},
            filters: this.createInitFilters()
        };
        this.onClickAddRow = this.onClickAddRow.bind(this);
        this.onClickRemoveRowBySelection = this.onClickRemoveRowBySelection.bind(this);
        this.removeRow = this.removeRow.bind(this);
        this.onSelectionChange = this.onSelectionChange.bind(this);
        this.onDropdownOptionsMapChange = this.onDropdownOptionsMapChange.bind(this);
        this.onFilter = this.onFilter.bind(this);
        this.onCheckboxFilterChange = this.onCheckboxFilterChange.bind(this);
        this.getCheckboxFilterValue = this.getCheckboxFilterValue.bind(this);
        this.onDropdownFilterChange = this.onDropdownFilterChange.bind(this);
        this.getDropdownFilterValue = this.getDropdownFilterValue.bind(this);
        this.bodyTemplate = this.bodyTemplate.bind(this);

        props.form.addFormDataTable(this);

        //props.form.addField(props.assocField + '.*FAKE*'); - vzdy mame aspon 1 field, nie je to potrebne
        for (const child of props.children) {
            const childColumn = child as {props: FormColumnBaseProps}; // nevedel som to krajsie...
            if (childColumn.props.type !== "custom") {
                const field = props.assocField + '.' + this.getPathForColumn(childColumn.props);
                props.form.addField(field);
            }
        }
    }

    getPathForColumn(columnProps: FormColumnBaseProps): string {
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as FormColumnProps);
            return columnPropsInputSimple.field;
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as FormDropdownColumnProps);
            return columnPropsDropdown.assocField + '.' + columnPropsDropdown.displayField;
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutoComplete = (columnProps as FormAutoCompleteColumnProps);
            // for simplicity we use here the first column (is used for filtering/sorting)
            // TODO - all columns add in constructor (through method props.form.addField(...))
            const displayField: string = Array.isArray(columnPropsAutoComplete.displayField) ? columnPropsAutoComplete.displayField[0] : columnPropsAutoComplete.displayField;
            return columnPropsAutoComplete.assocField + '.' + displayField;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as FormSearchButtonColumnProps);
            return columnPropsSearchButton.assocField + '.' + columnPropsSearchButton.displayField;
        }
        else if (columnProps.type === "textarea") {
            const columnPropsTextarea = (columnProps as FormTextareaColumnProps);
            return columnPropsTextarea.field;
        }
        else {
            throw "Unknown prop type = " + columnProps.type;
        }
    }

    static getHeader(columnProps: FormColumnBaseProps, xEntity: Entity, field: string, xField: Field): string {
        // poznamky - parametre field a xField by sme mohli vyratavat na zaklade columnProps ale kedze ich uz mame, setrime performance a neduplikujeme vypocet
        // nie je to tu uplne idealne nakodene, ale je to pomerne prehladne
        let isNullable: boolean = true;
        let readOnly: boolean = false;
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as FormColumnProps);
            isNullable = xField.isNullable;
            readOnly = FormDataTable.isReadOnlyHeader(columnPropsInputSimple.field, columnProps.readOnly);
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as FormDropdownColumnProps);
            const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOne(xEntity, columnPropsDropdown.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = FormDataTable.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutoComplete = (columnProps as FormAutoCompleteColumnProps);
            const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOne(xEntity, columnPropsAutoComplete.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = FormDataTable.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as FormSearchButtonColumnProps);
            const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOne(xEntity, columnPropsSearchButton.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = FormDataTable.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "textarea") {
            const columnPropsTextarea = (columnProps as FormTextareaColumnProps);
            isNullable = xField.isNullable;
            readOnly = FormDataTable.isReadOnlyHeader(columnPropsTextarea.field, columnProps.readOnly);
        }
        else {
            throw "Unknown prop type = " + columnProps.type;
        }

        let header = columnProps.header ?? field;
        if (!isNullable && !readOnly) {
            header = Utils.markNotNull(header);
        }
        return header;
    }

    // helper
    static isReadOnlyHeader(path: string | undefined , readOnly: TableFieldReadOnlyProp | undefined): boolean {
        let isReadOnly: boolean;

        if (path && !UtilsCommon.isSingleField(path)) {
            // if the length of field is 2 or more, then readOnly
            isReadOnly = true;
        }
            // formReadOnlyBase is called on the level FormDataTable
            // else if (this.props.form.formReadOnlyBase("xxx")) {
            //     isReadOnly = true;
        // }
        else if (typeof readOnly === 'boolean') {
            isReadOnly = readOnly;
        }
        else if (typeof readOnly === 'function') {
            isReadOnly = false;
        }
        else {
            // readOnly is undefined
            isReadOnly = false;
        }

        return isReadOnly;
    }

    getEntity(): string {
        if (this.entity === undefined) {
            throw `Unexpected error: this.entity is undefined`;
        }
        return this.entity;
    }

    createInitFilters(): DataTableFilterMeta {

        const initFilters: DataTableFilterMeta = {};

        if (this.props.filterDisplay === "none") {
            return initFilters;
        }

        const xEntity: Entity = UtilsMetadataCommon.getEntity(this.getEntity());

        // TODO - asi by bolo fajn si tieto field, xField niekam ulozit a iterovat ulozene hodnoty, pouziva sa to na viacerych miestach
        for (const child of this.props.children) {
            const childColumn = child as {props: FormColumnBaseProps}; // nevedel som to krajsie...
            // zatial nepodporujeme filter pre custom stlpce
            if (childColumn.props.type !== "custom") {
                const field: string | undefined = this.getPathForColumn(childColumn.props);
                const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, field);
                // TODO column.props.dropdownInFilter - pre "menu" by bolo fajn mat zoznam "enumov"
                const filterMatchMode: FilterMatchMode = this.getFilterMatchMode(xField);
                let filterItem: DataTableFilterMetaData | DataTableOperatorFilterMetaData;
                if (this.props.filterDisplay === "menu") {
                    // DataTableOperatorFilterMetaData: operator + filter values
                    filterItem = {
                        operator: FilterOperator.OR,
                        constraints: [{value: null, matchMode: filterMatchMode}]
                    };
                }
                else {
                    // props.filterDisplay === "row"
                    // DataTableFilterMetaData: filter value
                    filterItem = {value: null, matchMode: filterMatchMode};
                }
                initFilters[field] = filterItem;
            }
        }

        return initFilters;
    }

    getFilterMatchMode(xField: Field): FilterMatchMode {
        let filterMatchMode: FilterMatchMode;
        if (xField.type === "string" || xField.type === "jsonb") {
            filterMatchMode = FilterMatchMode.CONTAINS;
        }
        // zatial vsetky ostatne EQUALS
        else if (xField.type === "decimal" || xField.type === "number" || xField.type === "interval" || xField.type === "date" || xField.type === "datetime" || xField.type === "boolean") {
            filterMatchMode = FilterMatchMode.EQUALS;
        }
        else {
            throw `XField ${xField.name}: unknown xField.type = ${xField.type}`;
        }

        return filterMatchMode;
    }

    onSelectionChange(event: any): void {
        //console.log("zavolany onSelectionChange");
        //console.log(event.value);

        this.setState({selectedRow: event.value});
    }

    onDropdownOptionsMapChange(dropdownOptionsMap: DropdownOptionsMap) {
        this.setState({dropdownOptionsMap: dropdownOptionsMap})
    }

    onFilter(event: any) {

        //console.log("zavolany onFilter - this.state.filters = " + JSON.stringify(this.state.filters));
        //console.log("zavolany onFilter - event.filters = " + JSON.stringify(event.filters));

        // tymto zavolanim sa zapise znak zapisany klavesnicou do inputu filtra (ak prikaz zakomentujeme, input filtra zostane prazdny)
        this.setState({filters: event.filters});
    }

    onCheckboxFilterChange(field: string, checkboxValue: boolean | null) {
        // TODO - treba vyklonovat?
        const filtersCloned: DataTableFilterMeta = {...this.state.filters};
        if (checkboxValue !== null) {
            filtersCloned[field] = {value: checkboxValue ? "true" : "false", matchMode: FilterMatchMode.EQUALS};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny stav v checkboxe), zrusime polozku z filtra
            //delete filtersCloned[field];
            filtersCloned[field] = {value: null, matchMode: FilterMatchMode.EQUALS};
        }
        this.setState({filters: filtersCloned});
    }

    getCheckboxFilterValue(field: string) : boolean | null {
        let checkboxValue: boolean | null = null;
        const filterValue: DataTableFilterMetaData = this.state.filters[field] as DataTableFilterMetaData;
        if (filterValue !== undefined && filterValue !== null) {
            if (filterValue.value === 'true') {
                checkboxValue = true;
            }
            else if (filterValue.value === 'false') {
                checkboxValue = false;
            }
        }
        return checkboxValue;
    }

    onDropdownFilterChange(field: string, displayValue: any) {
        // TODO - treba vyklonovat?
        const filtersCloned: DataTableFilterMeta = {...this.state.filters};
        if (displayValue !== Utils.dropdownEmptyOptionValue) {
            filtersCloned[field] = {value: displayValue, matchMode: FilterMatchMode.EQUALS};
        }
        else {
            // pouzivatel zrusil hodnotu vo filtri (vybral prazdny riadok), zrusime polozku z filtra
            //delete filtersCloned[field];
            filtersCloned[field] = {value: null, matchMode: FilterMatchMode.EQUALS};
        }
        this.setState({filters: filtersCloned});
    }

    getDropdownFilterValue(field: string) : any {
        let dropdownValue: any = Utils.dropdownEmptyOptionValue;
        const filterValue: DataTableFilterMetaData = this.state.filters[field] as DataTableFilterMetaData;
        if (filterValue !== undefined && filterValue !== null) {
            if (filterValue.value !== null) {
                dropdownValue = filterValue.value;
            }
        }
        return dropdownValue;
    }

/*  pravdepodobne zombie
    onBodyValueChange (field: string, rowData: any, newValue: any) {
        //console.log("onBodyValueChange");

        // zmenime hodnotu v modeli (odtial sa hodnota cita)
        rowData[field] = newValue;
        // kedze "rowData" je sucastou "props.form.state.object", tak nam staci zavolat setState({object: object}), aby sa zmena prejavila
        this.props.form.onObjectDataChange();
    }
*/
    // body={(rowData: any) => bodyTemplate(childColumn.props.field, rowData)}
    bodyTemplate(columnProps: FormColumnBaseProps, tableReadOnly: boolean, rowData: any, xEntity: Entity): any {
        let body: any;
        // columnProps.columnViewStatus "ReadOnly" has higher prio then tableReadOnly
        // tableReadOnly has higher prio then property readOnly
        // (viewStatus "Hidden" - column is not rendered (bodyTemplate not called), viewStatus "ReadWrite" (default) - tableReadOnly/columnProps.readOnly is applied)
        let readOnly: TableFieldReadOnlyProp | undefined;
        if (Utils.xViewStatus(columnProps.columnViewStatus) === ViewStatus.ReadOnly) {
            readOnly = true;
        }
        else if (tableReadOnly) {
            readOnly = true;
        }
        else {
            readOnly = columnProps.readOnly;
        }
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as FormColumnProps);
            const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, columnPropsInputSimple.field);
            if (xField.type === "decimal" || xField.type === "number") {
                body = <InputDecimalDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "date" || xField.type === "datetime") {
                body = <InputDateDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "interval") {
                body = <InputIntervalDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "boolean") {
                body = <CheckboxDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else {
                // xField.type === "string", pripadne ine jednoduche typy
                body = <InputTextDT form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly}/>;
            }
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsDropdown = (columnProps as FormDropdownColumnProps);
                body = <DropdownDT form={this.props.form} entity={this.getEntity()} assocField={columnPropsDropdown.assocField} displayField={columnPropsDropdown.displayField} sortField={columnPropsDropdown.sortField} filter={columnPropsDropdown.filter} dropdownOptionsMap={this.state.dropdownOptionsMap} onDropdownOptionsMapChange={this.onDropdownOptionsMapChange} rowData={rowData} readOnly={readOnly}/>;
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutoComplete = (columnProps as FormAutoCompleteColumnProps);
            body = <AutoCompleteDT form={this.props.form} entity={this.getEntity()}
                                    assocField={columnPropsAutoComplete.assocField} displayField={columnPropsAutoComplete.displayField} itemTemplate={columnPropsAutoComplete.itemTemplate}
                                    SearchBrowse={columnPropsAutoComplete.SearchBrowse} searchBrowseElement={columnPropsAutoComplete.searchBrowseElement}
                                    AssocForm={columnPropsAutoComplete.AssocForm} assocFormElement={columnPropsAutoComplete.assocFormElement}
                                    addRowEnabled={columnPropsAutoComplete.addRowEnabled} filter={columnPropsAutoComplete.filter}
                                    sortField={columnPropsAutoComplete.sortField} fields={columnPropsAutoComplete.fields}
                                    scrollHeight={columnPropsAutoComplete.scrollHeight}
                                    suggestions={columnPropsAutoComplete.suggestions}
                                    suggestionsLoad={columnPropsAutoComplete.suggestionsLoad} lazyLoadMaxRows={columnPropsAutoComplete.lazyLoadMaxRows}
                                    rowData={rowData} readOnly={readOnly}/>;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as FormSearchButtonColumnProps);
            body = <XSearchButtonDT form={this.props.form} entity={this.getEntity()} assocField={columnPropsSearchButton.assocField} displayField={columnPropsSearchButton.displayField} searchBrowse={columnPropsSearchButton.searchBrowse} rowData={rowData} readOnly={readOnly}/>;
        }
        else if (columnProps.type === "textarea") {
            const columnPropsTextarea = (columnProps as FormTextareaColumnProps);
            body = <InputTextareaDT form={this.props.form} entity={this.getEntity()} field={columnPropsTextarea.field} rows={columnPropsTextarea.rows} autoResize={columnPropsTextarea.autoResize} rowData={rowData} readOnly={readOnly}/>;
        }
        else {
            throw "Unknown prop type = " + columnProps.type;
        }

        return body;
    }

    onClickAddRow(): void {
        if (this.props.onClickAddRow) {
            // custom add row
            this.props.onClickAddRow();
        }
        else {
            // default add row
            this.props.form.onTableAddRow(this.props.assocField, {}, this.dataKey, this.state.selectedRow);
        }
    };

    onClickRemoveRowBySelection(): void {
        if (this.state.selectedRow !== undefined) {
            this.removeRow(this.state.selectedRow);
        }
        else {
            alert("Please select the row.");
        }
    };

    removeRow(row: any) {
        if (this.props.onClickRemoveRow) {
            // custom remove
            this.props.onClickRemoveRow(row);
        }
        else {
            // default remove
            this.props.form.onTableRemoveRow(this.props.assocField, row);
        }
    }

    validate() {
        // zvalidujeme vsetky rows a pripadne chyby zapiseme do specialneho fieldu __x_rowTechData
        const entityRow: EntityRow = this.props.form.getEntityRow();
        const rowList: any[] = entityRow[this.props.assocField];
        for (const row of rowList) {
            const rowTechData: RowTechData = FormBase.getRowTechData(row);
            const xErrorMap: XErrorMap = {};
            for (const formComponentDT of rowTechData.formComponentDTList) {
                const errorItem = formComponentDT.validate();
                if (errorItem) {
                    //console.log("Mame field = " + errorItem.field);
                    xErrorMap[errorItem.field] = errorItem.xError;
                }
            }
            rowTechData.errorMap = xErrorMap;
        }
    }

    // getErrorMessages(): string {
    //     let msg: string = "";
    //     const entityRow: EntityRow = this.props.form.getEntityRow();
    //     const rowList: any[] = entityRow[this.props.assocField];
    //     for (const row of rowList) {
    //         const rowTechData: RowTechData = XFormBase.getRowTechData(row);
    //         msg += Utils.getErrorMessages(rowTechData.errorMap);
    //     }
    //     return msg;
    // }

    // TODO - velmi podobna funkcia ako XFormComponent.isReadOnly() - zjednotit ak sa da
    isReadOnly(): boolean {

        let readOnly: boolean;
        // the purpose of formReadOnly is to put the whole form to read only mode,
        // that's why the formReadOnly has higher prio then property this.props.readOnly
        if (this.props.form.formReadOnlyBase(this.props.assocField)) {
            readOnly = true;
        }
        else if (typeof this.props.readOnly === 'boolean') {
            readOnly = this.props.readOnly;
        }
        // TODO
        // else if (typeof this.props.readOnly === 'function') {
        //     // TODO - tazko povedat ci niekedy bude object === null (asi ano vid metodu getFilterBase)
        //     const entityRow: EntityRow = this.props.form.state.entityRow;
        //     if (object) {
        //         readOnly = this.props.readOnly(this.props.form.getEntityRow());
        //     }
        //     else {
        //         readOnly = true;
        //     }
        // }
        else {
            // readOnly is undefined
            readOnly = false;
        }

        return readOnly;
    }

    render() {
        const xEntity: Entity = UtilsMetadataCommon.getEntity(this.getEntity());

        const paginator: boolean = this.props.paginator !== undefined ? this.props.paginator : false;
        let rows: number | undefined = undefined;
        if (paginator) {
            if (this.props.rows !== undefined) {
                rows = this.props.rows;
            }
            else {
                rows = 5; // default
            }
        }
        const filterDisplay: "menu" | "row" | undefined = this.props.filterDisplay !== "none" ? this.props.filterDisplay : undefined;
        let sortField: string | undefined = this.props.sortField;
        if (sortField === "idFieldOnUpdate") {
            // default sortovanie - ak mame insert tak nesortujeme (drzime poradie v akom user zaznam vytvoril), ak mame update tak podla id zosortujeme (nech je to zobrazene vzdy rovnako)
            sortField = (this.props.form.isAddRow() ? undefined : xEntity.idField);
        }
        else if (sortField === "none") {
            sortField = undefined;
        }
        const readOnly = this.isReadOnly();

        // v bloku function (child) nejde pouzit priamo this, thisLocal uz ide pouzit
        const thisLocal = this;

        const entityRow: EntityRow | null = this.props.form.state.entityRow;
        const valueList = entityRow !== null ? entityRow[this.props.assocField] : [];

        let scrollWidth: string | undefined = undefined; // vypnute horizontalne scrollovanie
        let scrollHeight: string | undefined = undefined; // vypnute vertikalne scrollovanie

        if (this.props.scrollable) {
            if (this.props.scrollWidth !== "none") {
                scrollWidth = this.props.scrollWidth;
                if (scrollWidth === "viewport") {
                    let marginsWidth: number = Utils.isMobile() ? 1.2 : 2.2; // desktop - povodne bolo 1.4rem (20px okraje) namiesto 2.2 ale pri vela stlpcoch vznikal horizontalny scrollbar
                                                                            // mobil - padding 0.5rem body element, ale este bola tabulka moc siroka, tak sme dali 1.2
                    if (this.props.form.isTabViewUsed()) {
                        marginsWidth += 1; // TabPanel has padding 0.5rem (in css file) -> 1rem both margins
                    }
                    scrollWidth = `calc(100vw - ${marginsWidth}rem)`;
                }
            }
            if (this.props.scrollHeight !== "none") {
                scrollHeight = this.props.scrollHeight;
            }
        }

        let style: React.CSSProperties = {};
        if (scrollWidth !== undefined) {
            style.width = scrollWidth;
        }

        if (this.props.shrinkWidth) {
            style.maxWidth = 'min-content'; // ak nic nedame (nechame auto), tak (v pripade ak nebudeme mat horizontalny scrollbar) natiahne tabulku na celu sirku stranky, co nechceme
        }

        // pri prechode z Primereact 6.x na 9.x sa tableLayout zmenil z fixed na auto a nefungovalo nastavenie sirok stlpcov - docasne teda takto
        let tableStyle: React.CSSProperties = {tableLayout: 'fixed'};
        if (this.props.width !== undefined) {
            let width: string = this.props.width;
            if (!isNaN(Number(width))) { // if width is number
                width = width + 'rem';
            }
            tableStyle = {...tableStyle, width: width};
        }

        // pre lepsiu citatelnost vytvarame stlpce uz tu
        const columnElemList: JSX.Element[] = React.Children.map(
            this.props.children.filter((child: React.ReactChild) => Utils.xViewStatus((child as {props: FormColumnBaseProps}).props.columnViewStatus) !== ViewStatus.Hidden),
            function (child) {
                // ak chceme zmenit child element, tak treba bud vytvorit novy alebo vyklonovat
                // priklad je na https://soshace.com/building-react-components-using-children-props-and-context-api/
                // (vzdy musime robit manipulacie so stlpcom, lebo potrebujeme pridat filter={true} sortable={true}
                const childColumn = child as {props: FormColumnBaseProps}; // nevedel som to krajsie...
                const childColumnProps = childColumn.props;

                let fieldParam: string | undefined;
                let header: string | undefined;
                let filterElement;
                let showFilterMenu: boolean;
                let width: string | undefined;
                let align: "left" | "center" | "right" | undefined;
                let body;

                if (childColumnProps.type === "custom") {
                    // len jednoduche hodnoty, zatial nebude takmer ziadna podpora
                    const columnPropsCustom = (childColumnProps as FormCustomColumnProps);
                    fieldParam = columnPropsCustom.field;
                    header = columnPropsCustom.header;
                    filterElement = undefined;
                    showFilterMenu = false;
                    width = Utils.processPropWidth(columnPropsCustom.width);
                    align = undefined;
                    body = columnPropsCustom.body;
                }
                else {
                    // fieldy ktore su v modeli (existuje xField)

                    // je dolezite, aby field obsahoval cely path az po zobrazovany atribut, lebo podla neho sa vykonava filtrovanie a sortovanie
                    // (aj ked, da sa to prebit na stlpcoch (na elemente Column), su na to atributy)
                    const field: string = thisLocal.getPathForColumn(childColumnProps);

                    // TODO - toto by sa mohlo vytiahnut vyssie, aj v bodyTemplate sa vola metoda UtilsMetadata.getXFieldByPath
                    const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, field);

                    // *********** header ***********
                    header = FormDataTable.getHeader(childColumnProps, xEntity, field, xField);

                    // *********** filterElement ***********
                    if (thisLocal.props.filterDisplay !== "none") {
                        if (xField.type === "boolean") {
                            const checkboxValue: boolean | null = thisLocal.getCheckboxFilterValue(field);
                            filterElement = <TriStateCheckbox value={checkboxValue} onChange={(e: any) => thisLocal.onCheckboxFilterChange(field, e.value)}/>;
                        }
                        else if (childColumnProps.dropdownInFilter) {
                            const dropdownValue = thisLocal.getDropdownFilterValue(field);
                            filterElement = <DropdownDTFilter entity={thisLocal.getEntity()} path={field} value={dropdownValue} onValueChange={thisLocal.onDropdownFilterChange}/>
                        }
                    }

                    // *********** showFilterMenu ***********
                    showFilterMenu = false;
                    if (thisLocal.props.filterDisplay !== "none") {
                        if (childColumnProps.showFilterMenu !== undefined) {
                            showFilterMenu = childColumnProps.showFilterMenu;
                        } else {
                            showFilterMenu = true; // default
                            if (thisLocal.props.filterDisplay === "row") {
                                if (xField.type === "boolean" || childColumnProps.dropdownInFilter) {
                                    showFilterMenu = false;
                                }
                            }
                        }
                    }

                    // *********** width/headerStyle ***********
                    width = Utils.processPropWidth(childColumn.props.width);
                    if (width === undefined || width === "default") {
                        const filterMenuInFilterRow: boolean = thisLocal.props.filterDisplay === "row" && showFilterMenu;
                        const sortableButtonInHeader: boolean = thisLocal.props.sortable;
                        const filterButtonInHeader: boolean = thisLocal.props.filterDisplay === "menu";
                        width = UtilsMetadata.computeColumnWidth(xField, undefined, filterMenuInFilterRow, childColumnProps.type, header, sortableButtonInHeader, filterButtonInHeader);
                    }

                    // *********** align ***********
                    align = undefined; // default undefined (left)
                    // do buducna
                    // if (childColumnProps.align !== undefined) {
                    //     align = childColumnProps.align;
                    // }
                    // else {
                    // decimal defaultne zarovnavame doprava
                    // if (xField.type === "decimal") {
                    //     align = "right";
                    // }
                    // else
                    if (xField.type === "boolean") {
                        align = "center";
                    }
                    // }

                    // *********** body ***********
                    body = (rowData: any) => {return thisLocal.bodyTemplate(childColumnProps, readOnly, rowData, xEntity);};
                    fieldParam = field;
                }

                // *********** showClearButton ***********
                // pre filterDisplay = "row" nechceme clear button, chceme setrit miesto
                let showClearButton: boolean = thisLocal.props.filterDisplay === "menu";

                let headerStyle: React.CSSProperties = {};
                if (width !== undefined) {
                    headerStyle = {width: width};
                }

                return <Column field={fieldParam} header={header} filter={thisLocal.props.filterDisplay !== "none"} sortable={thisLocal.props.sortable}
                               filterElement={filterElement} showFilterMenu={showFilterMenu} showClearButton={showClearButton}
                               headerStyle={headerStyle} align={align} body={body}/>;
            }
        );

        if (this.props.showAddRemoveButtons && this.props.removeButtonInRow) {
            // je dolezite nastavit sirku header-a, lebo inac ma stlpec sirku 0 a nevidno ho
            columnElemList.push(<Column key="removeButton" headerStyle={{width: '2rem'}} body={(rowData: any) => <XButtonIconNarrow icon="pi pi-times" onClick={() => this.removeRow(rowData)} disabled={readOnly} addMargin={false}/>}/>);
        }

        let addRowLabel: string | undefined = undefined;
        let removeRowLabel: string | undefined = undefined;
        if (this.props.showAddRemoveButtons) {
            // calling xLocaleOption does not work in standard default values initialisation place (public static defaultProps)
            addRowLabel = this.props.addRowLabel ?? xLocaleOption('addRow');
            removeRowLabel = this.props.removeRowLabel ?? xLocaleOption('removeRow');
        }

        return (
            <div>
                {this.props.label !== undefined ?
                    <div className="flex justify-content-center">
                        <label>{this.props.label}</label>
                        {/*<XButton label="Filter" onClick={onClickFilter} />*/}
                    </div>
                    : undefined
                }
                <div className="flex justify-content-center">
                    <DataTable ref={(el) => this.dt = el} value={valueList} dataKey={this.dataKey} paginator={paginator} rows={rows}
                               totalRecords={valueList.length}
                               filterDisplay={filterDisplay} filters={this.state.filters} onFilter={this.onFilter}
                               sortMode="multiple" removableSort={true} multiSortMeta={sortField !== undefined ? [{field: sortField, order: 1}] : undefined}
                               selectionMode="single" selection={this.state.selectedRow} onSelectionChange={this.onSelectionChange}
                               className="p-datatable-sm x-form-datatable" resizableColumns columnResizeMode="expand" tableStyle={tableStyle}
                               scrollable={this.props.scrollable} scrollHeight={scrollHeight} style={style}>
                        {columnElemList}
                    </DataTable>
                </div>
                {this.props.showAddRemoveButtons ?
                    <div className="flex justify-content-center">
                        <XButton icon={this.props.addRowIcon} label={addRowLabel} onClick={this.onClickAddRow} disabled={readOnly}/>
                        {this.props.removeButtonInRow ? undefined : <XButton icon={this.props.removeRowIcon} label={removeRowLabel} onClick={this.onClickRemoveRowBySelection} disabled={readOnly}/>}
                    </div>
                    : undefined
                }
            </div>
        );
    }
}

// we use event to add additional props if needed
export interface TableFieldChangeEvent<ER = EntityRow, TR = any> {
    entityRow: ER;
    tableRow: TR;
    assocObjectChange?: OperationType
}

export type TableFieldOnChange = (e: TableFieldChangeEvent<any, any>) => void;

export type TableFieldReadOnlyProp = boolean | ((object: any, tableRow: any) => boolean);

// do buducna (kedze object mame vo formulari pristupny cez this.state.object, tak nepotrebujeme nutne pouzivat funkciu, vystacime si priamo s hodnotou)
//export type FormColumnViewStatusProp = ViewStatusOrBoolean | ((object: any) => ViewStatusOrBoolean);

// typ property pre vytvorenie filtra na assoc fieldoch (XAutoComplete, Dropdown, ...)
// pouzivame (zatial) parameter typu any aby sme na formulari vedeli pouzit konkretny typ (alebo EntityRow)
export type TableFieldFilterProp = CustomFilter | ((object: any, rowData: any) => CustomFilter | undefined);

export interface FormColumnBaseProps {
    type: "inputSimple" | "dropdown" | "autoComplete" | "searchButton" | "textarea" | "custom";
    header?: any;
    readOnly?: TableFieldReadOnlyProp;
    dropdownInFilter?: boolean; // moze byt len na stlpcoch ktore zobrazuju asociavany atribut (dlzka path >= 2)
    showFilterMenu?: boolean;
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
    onChange?: TableFieldOnChange;
    columnViewStatus: ViewStatusOrBoolean;
}

// default props for FormColumnBaseProps
const FormColumnBase_defaultProps = {
    columnViewStatus: true
};


export interface FormColumnProps extends FormColumnBaseProps {
    field: string;
}

export interface FormDropdownColumnProps extends FormColumnBaseProps {
    assocField: string;
    displayField: string;
    sortField?: string;
    filter?: CustomFilter;
}

export interface FormAutoCompleteColumnProps extends FormColumnBaseProps {
    assocField: string;
    displayField: string | string[];
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => React.ReactNode; // pouzivane ak potrebujeme nejaky custom format item-om (funkcia defaultValue rata default format)
    SearchBrowse?: React.ComponentType<SearchBrowseProps>;
    searchBrowseElement?: React.ReactElement;
    AssocForm?: React.ComponentType<FormProps>; // form for editing of the selected row and for adding new row
    assocFormElement?: React.ReactElement; // element version of AssocForm (for the case if additional (custom) props are needed)
    addRowEnabled: boolean; // ak dame false, tak nezobrazi insert button ani ked mame k dispozicii "valueForm" (default je true)
    filter?: TableFieldFilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // ak chceme pri citani suggestions nacitat aj asociovane objekty
    scrollHeight?: string; // Maximum height of the suggestions panel.
    suggestions?: any[]; // ak chceme overridnut suggestions ziskavane cez asociaciu (pozri poznamky v AutoCompleteDT)
    suggestionsLoad?: SuggestionsLoadProp; // ak nemame suggestions, pouzijeme suggestionsLoad (resp. jeho default)
    lazyLoadMaxRows?: number; // max pocet zaznamov ktore nacitavame pri suggestionsLoad = lazy
}

export interface FormSearchButtonColumnProps extends FormColumnBaseProps {
    assocField: string;
    displayField: string;
    searchBrowse: JSX.Element;
}

export interface FormTextareaColumnProps extends FormColumnBaseProps {
    field: string;
    rows: number;
    autoResize?: boolean;
}

// TODO - FormCustomColumnProps by nemal extendovat od FormColumnBaseProps, niektore propertiesy nedavaju zmysel
export interface FormCustomColumnProps extends FormColumnBaseProps {
    body: React.ReactNode | ((data: any, options: ColumnBodyOptions) => React.ReactNode); // the same type as type of property Column.body
    field?: string; // koli pripadnemu sortovaniu/filtrovaniu
}

export const FormColumn = (props: FormColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

FormColumn.defaultProps = {
    ...FormColumnBase_defaultProps,
    type: "inputSimple"
};

export const FormDropdownColumn = (props: FormDropdownColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

FormDropdownColumn.defaultProps = {
    ...FormColumnBase_defaultProps,
    type: "dropdown"
};

export const FormAutoCompleteColumn = (props: FormAutoCompleteColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

FormAutoCompleteColumn.defaultProps = {
    ...FormColumnBase_defaultProps,
    type: "autoComplete",
    addRowEnabled: true
};

export const FormSearchButtonColumn = (props: FormSearchButtonColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

FormSearchButtonColumn.defaultProps = {
    ...FormColumnBase_defaultProps,
    type: "searchButton"
};

export const FormTextareaColumn = (props: FormTextareaColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

FormTextareaColumn.defaultProps = {
    ...FormColumnBase_defaultProps,
    type: "textarea",
    rows: 1,
    autoResize: true
};

export const FormCustomColumn = (props: FormCustomColumnProps) => {
    // nevadi ze tu nic nevraciame, field a header vieme precitat a zvysok by sme aj tak zahodili lebo vytvarame novy element
    return (null);
}

FormCustomColumn.defaultProps = {
    ...FormColumnBase_defaultProps,
    type: "custom"
};

