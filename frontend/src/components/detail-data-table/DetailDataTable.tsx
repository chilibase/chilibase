import {FormBase, type FormProps} from "../form/FormBase";
import type {EntityRow} from "../../common/types";
import React, {Component, type ReactElement, type ReactNode, Children, type CSSProperties, type ComponentType} from "react";
import {TableSelectField} from "../select-field/TableSelectField";
import {
    DataTable,
    type DataTableFilterMeta,
    type DataTableFilterMetaData,
    type DataTableOperatorFilterMetaData, type DataTableSortMeta
} from "primereact/datatable";
import {Column as PrimeColumn, type ColumnBodyOptions} from "primereact/column";
import {Button} from "../button";
import {TableTextField} from "../text-field";
import {TableSearchField} from "../search-field";
import type {Assoc, Entity, Field} from "../../common/EntityMetadata";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {OperationType, ViewStatus, type ViewStatusOrBoolean} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import {TableFilterSelectInput} from "../select-field/TableFilterSelectInput";
import {TableNumberField} from "../number-field";
import {TableDateField} from "../date-field";
import {TableCheckboxField} from "../checkbox-field";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {FilterMatchMode, FilterOperator} from "primereact/api";
import type {CustomFilter} from "../../common/FindParam";
import {TableAutocompleteField} from "../autocomplete-field";
import {TableFormField} from "./TableFormField";
import type {FieldErrorMap} from "../form/FormErrors";
import {ButtonIconNarrow} from "../button";
import type {IconType} from "primereact/utils";
import type {ButtonProps} from "primereact/button";
import {UtilsCommon} from "../../common/UtilsCommon";
import {localeOption} from "../locale/Locale";
import {TableIntervalField} from "../interval-field";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import type {SearchBrowseProps} from "../lazy-data-table";
import {TableMultilineTextField} from "../multiline-text-field";
import type {SuggestionsLoadProp} from "../autocomplete-field";

// type for the technical field row.__x_rowTechData (row is an item of the list edited in DetailDataTable)
export interface RowTechData {
    // list of components on the table row (including TableSelectField, TableSearchField, ...)
    // after clicking Save of the form this list is iterated and validation is called for each component (input)
    // TODO - won't this bother react e.g. because of performance? this list will be part of form.state.object, which is not entirely ideal
    // (the advantage of storing the list in __x_rowTechData is that this list automatically appears and disappears on insert/delete of a new row
    tableFormFieldList: Array<TableFormField<any>>;
    // list of validation errors (the same as form.state.errorMap in XFormBase.ts for the main object of the form)
    // automatic validation and possible custom validation write errors here
    // errors are displayed (turning red + tooltip) in the form by calling this.setState({object: this.state.object});
    // errors are rendered (turning red + tooltip) in the components by the component reading errors from this errorMap
    errorMap: FieldErrorMap;
}

export interface DropdownOptionsMap {
    [assocField: string]: any[];
}

// NOTE: parameter width?: string; I don't know how it works (especially when using scrollWidth/scrollHeight), and it is not used anywhere for now
export interface DetailDataTableProps {
    form: FormBase;
    assocField: string;
    dataKey?: string;
    paginator?: boolean;
    rows?: number;
    filterDisplay: "menu" | "row" | "none";
    sortable: boolean;
    sortField: string;
    scrollable: boolean; // default true, if it is false, scrolling is turned off (scrollWidth/scrollHeight/formFooterHeight are ignored)
    scrollWidth?: string; // default 100%, the value "none" turns off horizontal scrolling
    scrollHeight?: string; // default '200vh', the value "none" turns off vertical scrolling (but it is better to leave '200vh')
    shrinkWidth: boolean; // default true - if true, it does not widen columns beyond their explicit width ("wide" tables across the whole length of the parent element do not arise)
    label?: string;
    readOnly?: boolean;
    showAddRemoveButtons?: boolean;
    onClickAddRow?: () => void;
    onClickRemoveRow?: (row: any) => void;
    removeButtonInRow: boolean; // default true, if true, a button X for remove is displayed at the end of each row (the user does not have to select the row in order to perform remove)
    addRowLabel?: string;
    addRowIcon?: IconType<ButtonProps>;
    removeRowLabel?: string;
    removeRowIcon?: IconType<ButtonProps>;
    width?: string;
    children: ReactElement | ReactElement[];
}

export class DetailDataTable extends Component<DetailDataTableProps> {

    public static defaultProps = {
        filterDisplay: "none",
        sortable: false,
        sortField: "idFieldOnUpdate",
        scrollable: true,
        //scrollWidth: '100%', // did not work well - the value '100%' turns on horizontal scrolling if the table is wider than the parent element (and that should be max 100vw) (the value 'auto' (similar to '100%') does not work well)
        scrollWidth: 'viewport', // turns on horizontal scrolling if the table is wider than the display (important for mobile)
        scrollHeight: '200vh', // if we set 'none' (undefined would go into DataTable), then the header and body are not aligned (the body is missing a disabled vertical scrollbar),
                                // by using 200vh (max-height for the body), real scrolling turns on only with a very large number of rows
        shrinkWidth: true,
        showAddRemoveButtons: true,
        removeButtonInRow: true,
        addRowIcon: "pi pi-plus",
        removeRowIcon: "pi pi-times"
    };

    props: DetailDataTableProps;
    entity?: string;
    dataKey?: string;
    dt: any;

    state: {
        selectedRow: {} | undefined;
        dropdownOptionsMap: DropdownOptionsMap;
        filters: DataTableFilterMeta;
    };

    constructor(props: DetailDataTableProps) {
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

        props.form.addDetailDataTable(this);

        //props.form.addField(props.assocField + '.*FAKE*'); - we always have at least 1 field, it is not needed
        for (const child of this.columnElements()) {
            const childColumn = child as {props: ColumnBaseProps}; // I couldn't do it more nicely...
            if (childColumn.props.type !== "custom") {
                const field = props.assocField + '.' + this.getPathForColumn(childColumn.props);
                props.form.addField(field);
            }
        }
    }

    columnElements(): ReactElement[] {
        return Utils.applyDefaultProps(Children.toArray(this.props.children) as ReactElement[]);
    }

    getPathForColumn(columnProps: ColumnBaseProps): string {
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as ColumnProps);
            return columnPropsInputSimple.field;
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsSelect = (columnProps as SelectColumnProps);
            return columnPropsSelect.assocField + '.' + columnPropsSelect.displayField;
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutocomplete = (columnProps as AutocompleteColumnProps);
            // for simplicity we use here the first column (is used for filtering/sorting)
            // TODO - all columns add in constructor (through method props.form.addField(...))
            const displayField: string = Array.isArray(columnPropsAutocomplete.displayField) ? columnPropsAutocomplete.displayField[0] : columnPropsAutocomplete.displayField;
            return columnPropsAutocomplete.assocField + '.' + displayField;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as SearchButtonColumnProps);
            return columnPropsSearchButton.assocField + '.' + columnPropsSearchButton.displayField;
        }
        else if (columnProps.type === "textarea") {
            const columnPropsMultilineText = (columnProps as MultilineTextColumnProps);
            return columnPropsMultilineText.field;
        }
        else {
            throw `DetailDataTable.getPathForColumn - unknown prop type = ${columnProps.type}, header = ${columnProps.header}`;
        }
    }

    static getHeader(columnProps: ColumnBaseProps, xEntity: Entity, field: string, xField: Field): string {
        // notes - we could compute the parameters field and xField based on columnProps but since we already have them, we save performance and don't duplicate the computation
        // it is not coded entirely ideally here, but it is fairly clear
        let isNullable: boolean = true;
        let readOnly: boolean = false;
        if (columnProps.type === "inputSimple") {
            const columnPropsInputSimple = (columnProps as ColumnProps);
            isNullable = xField.isNullable;
            readOnly = DetailDataTable.isReadOnlyHeader(columnPropsInputSimple.field, columnProps.readOnly);
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsSelect = (columnProps as SelectColumnProps);
            const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOne(xEntity, columnPropsSelect.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = DetailDataTable.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutocomplete = (columnProps as AutocompleteColumnProps);
            const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOne(xEntity, columnPropsAutocomplete.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = DetailDataTable.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as SearchButtonColumnProps);
            const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOne(xEntity, columnPropsSearchButton.assocField);
            isNullable = xAssoc.isNullable;
            readOnly = DetailDataTable.isReadOnlyHeader(undefined, columnProps.readOnly);
        }
        else if (columnProps.type === "textarea") {
            const columnPropsMultilineText = (columnProps as MultilineTextColumnProps);
            isNullable = xField.isNullable;
            readOnly = DetailDataTable.isReadOnlyHeader(columnPropsMultilineText.field, columnProps.readOnly);
        }
        else {
            throw `DetailDataTable.getHeader - unknown prop type = ${columnProps.type}, header = ${columnProps.header}`;
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
            // formReadOnlyBase is called on the level DetailDataTable
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

        // TODO - it would probably be nice to store these field, xField somewhere and iterate the stored values, it is used in several places
        for (const child of this.columnElements()) {
            const childColumn = child as {props: ColumnBaseProps}; // I couldn't do it more nicely...
            // for now we don't support a filter for custom columns
            if (childColumn.props.type !== "custom") {
                const field: string | undefined = this.getPathForColumn(childColumn.props);
                const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, field);
                // TODO column.props.dropdownInFilter - for "menu" it would be nice to have a list of "enums"
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
        // for now all the others EQUALS
        else if (xField.type === "decimal" || xField.type === "number" || xField.type === "interval" || xField.type === "date" || xField.type === "datetime" || xField.type === "boolean") {
            filterMatchMode = FilterMatchMode.EQUALS;
        }
        else {
            throw `XField ${xField.name}: unknown xField.type = ${xField.type}`;
        }

        return filterMatchMode;
    }

    onSelectionChange(event: any): void {
        //console.log("called onSelectionChange");
        //console.log(event.value);

        this.setState({selectedRow: event.value});
    }

    onDropdownOptionsMapChange(dropdownOptionsMap: DropdownOptionsMap) {
        this.setState({dropdownOptionsMap: dropdownOptionsMap})
    }

    onFilter(event: any) {

        //console.log("called onFilter - this.state.filters = " + JSON.stringify(this.state.filters));
        //console.log("called onFilter - event.filters = " + JSON.stringify(event.filters));

        // by this call the character typed on the keyboard is written into the filter input (if we comment out the command, the filter input stays empty)
        this.setState({filters: event.filters});
    }

    onCheckboxFilterChange(field: string, checkboxValue: boolean | null) {
        // TODO - need to clone?
        const filtersCloned: DataTableFilterMeta = {...this.state.filters};
        if (checkboxValue !== null) {
            filtersCloned[field] = {value: checkboxValue ? "true" : "false", matchMode: FilterMatchMode.EQUALS};
        }
        else {
            // the user cleared the value in the filter (selected the empty state in the checkbox), we remove the item from the filter
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
        // TODO - need to clone?
        const filtersCloned: DataTableFilterMeta = {...this.state.filters};
        if (displayValue !== Utils.dropdownEmptyOptionValue) {
            filtersCloned[field] = {value: displayValue, matchMode: FilterMatchMode.EQUALS};
        }
        else {
            // the user cleared the value in the filter (selected an empty row), we remove the item from the filter
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

/*  probably a zombie
    onBodyValueChange (field: string, rowData: any, newValue: any) {
        //console.log("onBodyValueChange");

        // we change the value in the model (the value is read from there)
        rowData[field] = newValue;
        // since "rowData" is part of "props.form.state.object", it is enough to call setState({object: object}) for the change to show up
        this.props.form.onObjectDataChange();
    }
*/
    // body={(rowData: any) => bodyTemplate(childColumn.props.field, rowData)}
    bodyTemplate(columnProps: ColumnBaseProps, tableReadOnly: boolean, rowData: any, xEntity: Entity): any {
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
            const columnPropsInputSimple = (columnProps as ColumnProps);
            const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, columnPropsInputSimple.field);
            if (xField.type === "decimal" || xField.type === "number") {
                body = <TableNumberField form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "date" || xField.type === "datetime") {
                body = <TableDateField form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "interval") {
                body = <TableIntervalField form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else if (xField.type === "boolean") {
                body = <TableCheckboxField form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly} onChange={columnPropsInputSimple.onChange}/>;
            }
            else {
                // xField.type === "string", or other simple types
                body = <TableTextField form={this.props.form} entity={this.getEntity()} field={columnPropsInputSimple.field} rowData={rowData} readOnly={readOnly}/>;
            }
        }
        else if (columnProps.type === "dropdown") {
            const columnPropsSelect = (columnProps as SelectColumnProps);
                body = <TableSelectField form={this.props.form} entity={this.getEntity()} assocField={columnPropsSelect.assocField} displayField={columnPropsSelect.displayField} sortField={columnPropsSelect.sortField} filter={columnPropsSelect.filter} dropdownOptionsMap={this.state.dropdownOptionsMap} onDropdownOptionsMapChange={this.onDropdownOptionsMapChange} rowData={rowData} readOnly={readOnly}/>;
        }
        else if (columnProps.type === "autoComplete") {
            const columnPropsAutocomplete = (columnProps as AutocompleteColumnProps);
            body = <TableAutocompleteField form={this.props.form} entity={this.getEntity()}
                                    assocField={columnPropsAutocomplete.assocField} displayField={columnPropsAutocomplete.displayField} itemTemplate={columnPropsAutocomplete.itemTemplate}
                                    SearchBrowse={columnPropsAutocomplete.SearchBrowse} searchBrowseElement={columnPropsAutocomplete.searchBrowseElement}
                                    AssocForm={columnPropsAutocomplete.AssocForm} assocFormElement={columnPropsAutocomplete.assocFormElement}
                                    addRowEnabled={columnPropsAutocomplete.addRowEnabled} filter={columnPropsAutocomplete.filter}
                                    sortField={columnPropsAutocomplete.sortField} fields={columnPropsAutocomplete.fields}
                                    scrollHeight={columnPropsAutocomplete.scrollHeight}
                                    suggestions={columnPropsAutocomplete.suggestions}
                                    suggestionsLoad={columnPropsAutocomplete.suggestionsLoad} lazyLoadMaxRows={columnPropsAutocomplete.lazyLoadMaxRows}
                                    rowData={rowData} readOnly={readOnly}/>;
        }
        else if (columnProps.type === "searchButton") {
            const columnPropsSearchButton = (columnProps as SearchButtonColumnProps);
            body = <TableSearchField form={this.props.form} entity={this.getEntity()} assocField={columnPropsSearchButton.assocField} displayField={columnPropsSearchButton.displayField} searchBrowse={columnPropsSearchButton.searchBrowse} rowData={rowData} readOnly={readOnly}/>;
        }
        else if (columnProps.type === "textarea") {
            const columnPropsMultilineText = (columnProps as MultilineTextColumnProps);
            body = <TableMultilineTextField form={this.props.form} entity={this.getEntity()} field={columnPropsMultilineText.field} rows={columnPropsMultilineText.rows} autoResize={columnPropsMultilineText.autoResize} rowData={rowData} readOnly={readOnly}/>;
        }
        else {
            throw `DetailDataTable.bodyTemplate - unknown prop type = ${columnProps.type}, header = ${columnProps.header}`;
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
        // we validate all rows and write possible errors into the special field __x_rowTechData
        const entityRow: EntityRow = this.props.form.getEntityRow();
        const rowList: any[] = entityRow[this.props.assocField];
        for (const row of rowList) {
            const rowTechData: RowTechData = FormBase.getRowTechData(row);
            const fieldErrorMap: FieldErrorMap = {};
            for (const tableFormField of rowTechData.tableFormFieldList) {
                const errorItem = tableFormField.validate();
                if (errorItem) {
                    //console.log("We have field = " + errorItem.field);
                    fieldErrorMap[errorItem.field] = errorItem.fieldError;
                }
            }
            rowTechData.errorMap = fieldErrorMap;
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

    // TODO - a function very similar to FormField.isReadOnly() - unify if possible
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
        //     // TODO - hard to say whether object === null will ever happen (probably yes, see method getFilterBase)
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
            // default sorting - if we have insert we don't sort (we keep the order in which the user created the record), if we have update we sort by id (so that it is always displayed the same way)
            sortField = (this.props.form.isAddRow() ? undefined : xEntity.idField);
        }
        else if (sortField === "none") {
            sortField = undefined;
        }
        const readOnly = this.isReadOnly();

        // in the function (child) block this cannot be used directly, thisLocal can be used
        const thisLocal = this;

        const entityRow: EntityRow | null = this.props.form.state.entityRow;
        const valueList = entityRow !== null ? entityRow[this.props.assocField] : [];

        let scrollWidth: string | undefined = undefined; // horizontal scrolling turned off
        let scrollHeight: string | undefined = undefined; // vertical scrolling turned off

        if (this.props.scrollable) {
            if (this.props.scrollWidth !== "none") {
                scrollWidth = this.props.scrollWidth;
                if (scrollWidth === "viewport") {
                    let marginsWidth: number = Utils.isMobile() ? 1.2 : 2.2; // desktop - originally it was 1.4rem (20px margins) instead of 2.2 but with many columns a horizontal scrollbar appeared
                                                                            // mobile - padding 0.5rem of the body element, but the table was still too wide, so we set 1.2
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

        let style: CSSProperties = {};
        if (scrollWidth !== undefined) {
            style.width = scrollWidth;
        }

        if (this.props.shrinkWidth) {
            style.maxWidth = 'min-content'; // if we don't set anything (leave auto), then (in case we don't have a horizontal scrollbar) it stretches the table to the full page width, which we don't want
        }

        // when moving from Primereact 6.x to 9.x, tableLayout changed from fixed to auto and setting column widths stopped working - temporarily like this
        let tableStyle: CSSProperties = {tableLayout: 'fixed'};
        if (this.props.width !== undefined) {
            let width: string = this.props.width;
            if (!isNaN(Number(width))) { // if width is number
                width = width + 'rem';
            }
            tableStyle = {...tableStyle, width: width};
        }

        // for better readability we create the columns already here
        const columnElemList: ReactElement[] = Children.map(
            this.columnElements().filter((child: ReactElement) => Utils.xViewStatus((child as {props: ColumnBaseProps}).props.columnViewStatus) !== ViewStatus.Hidden),
            function (child) {
                // if we want to change a child element, we need to either create a new one or clone it
                // an example is at https://soshace.com/building-react-components-using-children-props-and-context-api/
                // (we always have to manipulate the column, because we need to add filter={true} sortable={true}
                const childColumn = child as {props: ColumnBaseProps}; // I couldn't do it more nicely...
                const childColumnProps = childColumn.props;

                let fieldParam: string | undefined;
                let header: string | undefined;
                let filterElement;
                let showFilterMenu: boolean;
                let width: string | undefined;
                let align: "left" | "center" | "right" | undefined;
                let body;

                if (childColumnProps.type === "custom") {
                    // only simple values, for now there will be almost no support
                    const columnPropsCustom = (childColumnProps as CustomColumnProps);
                    fieldParam = columnPropsCustom.field;
                    header = columnPropsCustom.header;
                    filterElement = undefined;
                    showFilterMenu = false;
                    width = Utils.processPropWidth(columnPropsCustom.width);
                    align = undefined;
                    body = columnPropsCustom.body;
                }
                else {
                    // fields that are in the model (xField exists)

                    // it is important that field contains the whole path up to the displayed attribute, because filtering and sorting are performed according to it
                    // (although it can be overridden on the columns (on the Column element), there are attributes for that)
                    const field: string = thisLocal.getPathForColumn(childColumnProps);

                    // TODO - this could be pulled higher, the method UtilsMetadata.getXFieldByPath is also called in bodyTemplate
                    const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, field);

                    // *********** header ***********
                    header = DetailDataTable.getHeader(childColumnProps, xEntity, field, xField);

                    // *********** filterElement ***********
                    if (thisLocal.props.filterDisplay !== "none") {
                        if (xField.type === "boolean") {
                            const checkboxValue: boolean | null = thisLocal.getCheckboxFilterValue(field);
                            filterElement = <TriStateCheckbox value={checkboxValue} onChange={(e: any) => thisLocal.onCheckboxFilterChange(field, e.value)}/>;
                        }
                        else if (childColumnProps.dropdownInFilter) {
                            const dropdownValue = thisLocal.getDropdownFilterValue(field);
                            filterElement = <TableFilterSelectInput entity={thisLocal.getEntity()} path={field} value={dropdownValue} onValueChange={thisLocal.onDropdownFilterChange}/>
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
                    // for the future
                    // if (childColumnProps.align !== undefined) {
                    //     align = childColumnProps.align;
                    // }
                    // else {
                    // by default we align decimal to the right
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
                // for filterDisplay = "row" we don't want a clear button, we want to save space
                let showClearButton: boolean = thisLocal.props.filterDisplay === "menu";

                let headerStyle: CSSProperties = {};
                if (width !== undefined) {
                    headerStyle = {width: width};
                }

                return <PrimeColumn field={fieldParam} header={header} footer={childColumnProps.footer}
                                    filter={thisLocal.props.filterDisplay !== "none"} sortable={thisLocal.props.sortable}
                                    filterElement={filterElement} showFilterMenu={showFilterMenu} showClearButton={showClearButton}
                                    headerStyle={headerStyle} align={align} body={body}/>;
            }
        );

        if (this.props.showAddRemoveButtons && this.props.removeButtonInRow) {
            // it is important to set the header width, otherwise the column has width 0 and it is not visible
            columnElemList.push(<PrimeColumn key="removeButton" headerStyle={{width: '2rem'}} body={(rowData: any) => <ButtonIconNarrow icon="pi pi-times" onClick={() => this.removeRow(rowData)} disabled={readOnly} addMargin={false}/>}/>);
        }

        let addRowLabel: string | undefined = undefined;
        let removeRowLabel: string | undefined = undefined;
        if (this.props.showAddRemoveButtons) {
            // calling localeOption does not work in standard default values initialisation place (public static defaultProps)
            addRowLabel = this.props.addRowLabel ?? localeOption('addRow');
            removeRowLabel = this.props.removeRowLabel ?? localeOption('removeRow');
        }

        return (
            <div>
                {this.props.label !== undefined ?
                    <div className="flex justify-content-center">
                        <label>{this.props.label}</label>
                        {/*<Button label="Filter" onClick={onClickFilter} />*/}
                    </div>
                    : undefined
                }
                {/* cellMemo={false} - memoizing causes that SelectColumn does not rerender after fetching assoc rows, because row does not change during fetching assoc rows (fetching is called after first render) */}
                <div className="flex justify-content-center">
                    <DataTable ref={(el) => { this.dt = el; }} value={valueList} dataKey={this.dataKey} paginator={paginator} rows={rows}
                               totalRecords={valueList.length}
                               filterDisplay={filterDisplay} filters={this.state.filters} onFilter={this.onFilter}
                               sortMode="multiple" removableSort={true} multiSortMeta={sortField !== undefined ? [{field: sortField, order: 1}] : undefined}
                               selectionMode="single" selection={this.state.selectedRow} onSelectionChange={this.onSelectionChange}
                               className="p-datatable-sm x-detail-datatable" resizableColumns columnResizeMode="expand" tableStyle={tableStyle}
                               scrollable={this.props.scrollable} scrollHeight={scrollHeight} style={style}
                               cellMemo={false}>
                        {columnElemList}
                    </DataTable>
                </div>
                {this.props.showAddRemoveButtons ?
                    <div className="flex justify-content-center">
                        <Button icon={this.props.addRowIcon} label={addRowLabel} onClick={this.onClickAddRow} disabled={readOnly}/>
                        {this.props.removeButtonInRow ? undefined : <Button icon={this.props.removeRowIcon} label={removeRowLabel} onClick={this.onClickRemoveRowBySelection} disabled={readOnly}/>}
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

// for the future (since we have object accessible in the form via this.state.object, we don't necessarily need to use a function, we can get by directly with the value)
//export type FormColumnViewStatusProp = ViewStatusOrBoolean | ((object: any) => ViewStatusOrBoolean);

// type of the property for creating a filter on assoc fields (XAutoComplete, Dropdown, ...)
// we use (for now) a parameter of type any so that on the form we can use a concrete type (or EntityRow)
export type TableFieldFilterProp = CustomFilter | ((object: any, rowData: any) => CustomFilter | undefined);

export interface ColumnBaseProps {
    type: "inputSimple" | "dropdown" | "autoComplete" | "searchButton" | "textarea" | "custom";
    header?: any;
    footer?: ReactNode;
    readOnly?: TableFieldReadOnlyProp;
    dropdownInFilter?: boolean; // can be only on columns that display an associated attribute (path length >= 2)
    showFilterMenu?: boolean;
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
    onChange?: TableFieldOnChange;
    columnViewStatus: ViewStatusOrBoolean;
}

// default props for ColumnBaseProps
const ColumnBase_defaultProps = {
    columnViewStatus: true
};


export interface ColumnProps extends ColumnBaseProps {
    field: string;
}

export interface SelectColumnProps extends ColumnBaseProps {
    assocField: string;
    displayField: string;
    sortField?: string;
    filter?: CustomFilter;
}

export interface AutocompleteColumnProps extends ColumnBaseProps {
    assocField: string;
    displayField: string | string[];
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => ReactNode; // used if we need some custom format of items (function defaultValue computes the default format)
    SearchBrowse?: ComponentType<SearchBrowseProps>;
    searchBrowseElement?: ReactElement;
    AssocForm?: ComponentType<FormProps>; // form for editing of the selected row and for adding new row
    assocFormElement?: ReactElement; // element version of AssocForm (for the case if additional (custom) props are needed)
    addRowEnabled: boolean; // if we set false, it does not display the insert button even when we have "valueForm" available (default is true)
    filter?: TableFieldFilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // if we want to also load associated objects when reading suggestions
    scrollHeight?: string; // Maximum height of the suggestions panel.
    suggestions?: any[]; // if we want to override suggestions obtained via the association (see the notes in TableAutocompleteField)
    suggestionsLoad?: SuggestionsLoadProp; // if we don't have suggestions, we use suggestionsLoad (or its default)
    lazyLoadMaxRows?: number; // max number of records that we load when suggestionsLoad = lazy
}

export interface SearchButtonColumnProps extends ColumnBaseProps {
    assocField: string;
    displayField: string;
    searchBrowse: ReactElement;
}

export interface MultilineTextColumnProps extends ColumnBaseProps {
    field: string;
    rows: number;
    autoResize?: boolean;
}

// TODO - CustomColumnProps should not extend ColumnBaseProps, some properties don't make sense
export interface CustomColumnProps extends ColumnBaseProps {
    body: ReactNode | ((data: any, options: ColumnBodyOptions) => ReactNode); // the same type as type of property Column.body
    field?: string; // for possible sorting/filtering
}

export const Column = (props: ColumnProps) => {
    // it doesn't matter that we return nothing here, we can read field and header and we would throw away the rest anyway because we create a new element
    return (null);
}

Column.defaultProps = {
    ...ColumnBase_defaultProps,
    type: "inputSimple"
};

export const SelectColumn = (props: SelectColumnProps) => {
    // it doesn't matter that we return nothing here, we can read field and header and we would throw away the rest anyway because we create a new element
    return (null);
}

SelectColumn.defaultProps = {
    ...ColumnBase_defaultProps,
    type: "dropdown"
};

export const AutocompleteColumn = (props: AutocompleteColumnProps) => {
    // it doesn't matter that we return nothing here, we can read field and header and we would throw away the rest anyway because we create a new element
    return (null);
}

AutocompleteColumn.defaultProps = {
    ...ColumnBase_defaultProps,
    type: "autoComplete",
    addRowEnabled: true
};

export const SearchButtonColumn = (props: SearchButtonColumnProps) => {
    // it doesn't matter that we return nothing here, we can read field and header and we would throw away the rest anyway because we create a new element
    return (null);
}

SearchButtonColumn.defaultProps = {
    ...ColumnBase_defaultProps,
    type: "searchButton"
};

export const MultilineTextColumn = (props: MultilineTextColumnProps) => {
    // it doesn't matter that we return nothing here, we can read field and header and we would throw away the rest anyway because we create a new element
    return (null);
}

MultilineTextColumn.defaultProps = {
    ...ColumnBase_defaultProps,
    type: "textarea",
    rows: 1,
    autoResize: true
};

export const CustomColumn = (props: CustomColumnProps) => {
    // it doesn't matter that we return nothing here, we can read field and header and we would throw away the rest anyway because we create a new element
    return (null);
}

CustomColumn.defaultProps = {
    ...ColumnBase_defaultProps,
    type: "custom"
};

