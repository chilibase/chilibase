import React, {forwardRef, type ReactElement, type ReactNode, useEffect, useImperativeHandle, useRef, useState, type ComponentType, type CSSProperties, type Dispatch, type SetStateAction, Children, useContext} from 'react';
import {
    DataTable, type DataTableExpandedRows,
    type DataTableFilterMeta,
    type DataTableFilterMetaData,
    type DataTableOperatorFilterMetaData, type DataTableRowExpansionTemplate,
    type DataTableSortMeta, type DataTableStateEvent, type DataTableValueArray
} from 'primereact/datatable';
import {
    Column as PrimeColumn,
    type ColumnBodyOptions,
    type ColumnFilterElementTemplateOptions,
    type ColumnFilterMatchModeChangeEvent,
    type ColumnFilterMatchModeOptions
} from 'primereact/column';
import {Button} from "../button";
import {OperationType, type StorageType, ViewStatus, type ViewStatusOrBoolean} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import type {FieldFilter, SearchBrowseParams} from "../browse";
import {UtilsMetadata} from "../../utils/UtilsMetadata";
import {TableFilterSelectInput} from "../select-field/TableFilterSelectInput";
import type {Assoc, Entity, Field} from "../../common/EntityMetadata";
import {AsUIType, convertValue, numberAsUI, numberFromModel} from "../../common/UtilsConversions";
import type {FindResult} from "../../common/FindResult";
import {
    type FindParam,
    ResultType,
    type SimpleAggregateItem,
    AggregateFunction,
    type CustomFilter,
    type CustomFilterItem,
    type FullTextSearch, type ExtendedDataTableFilterMetaData, ExtendedFilterMatchMode, type ExtendedDataTableFilterMeta
} from "../../common/FindParam";
import {ButtonIconSmall} from "../button";
import {TriStateCheckbox} from "primereact/tristatecheckbox";
import {UtilsCommon} from "../../common/UtilsCommon";
import type {ExportColumnParam, LazyDataTableQueryParam} from "../../common/ExportImportParam";
import {type ExportParams, ExportRowsDialog, type ExportRowsDialogState} from "./ExportRowsDialog";
import PrimeReact, {type APIOptions, FilterMatchMode, FilterOperator, PrimeReactContext} from "primereact/api";
import type {FormProps, OnSaveOrCancelProp} from "../form";
import {DateInput} from "../date-field";
import {NumberInput} from "../number-field";
import {primeLocaleOption, localeOption} from "../locale/Locale";
import {FtsInput, type FtsInputValue} from "./FtsInput";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import type {IconType} from "primereact/utils";
import type {ButtonProps} from "primereact/button";
import {Editor} from "primereact/editor";
import {MultilineSwitch} from "./MultilineSwitch";
import {MultilineRenderer} from "./MultilineRenderer";
import {HtmlRenderer} from "./HtmlRenderer";
import {OcfDropdown} from "./OcfDropdown";
import {XFieldSetBase, type XFieldSetMeta, type XFieldXFieldMetaMap} from "../field-set/XFieldSetBase";
import {AutocompleteInput} from "../autocomplete-field";
import {TextInput} from "../text-field";
import {useStateStorage} from "../use-state/useStateStorage";
import {useStateStorageBase} from "../use-state/useStateStorageBase";
import * as _ from "lodash";
import type {XtDocTemplate} from "../../modules/doc-templates/xt-doc-template.entity";
import {DocTemplateButton} from "../../modules/doc-templates/DocTemplateButton";
import {FormDialog, type FormDialogState} from "../form";
import type {TextFormat} from '../../common';
import {ColumnToggleDialog, type ColumnToggleDialogItem} from "./ColumnToggleDialog";

// type used only in LazyDataTable
interface XFieldSetMaps {
    [field: string]: XFieldXFieldMetaMap;
}

export type BetweenFilterProp = "row" | "column" | undefined;
export type MultilineRenderType = "singleLine" | "fewLines" | "allLines";

export type OpenFormForInsert = (
    initValues?: object,
    onSaveOrCancel?: OnSaveOrCancelProp,
    Form?: ComponentType<FormProps>,
    formElement?: ReactElement
) => void;
export type OpenFormForUpdate = (
    id: number,
    onSaveOrCancel?: OnSaveOrCancelProp,
    Form?: ComponentType<FormProps>,
    formElement?: ReactElement
) => void;

// selectedRow is here in order to enable to copy some attributes from selected row into new row (selectedRow is null if no row is selected)
// filters are here in order to enable init some attributes of new row from filters values (if needed)
// function openFormForInsert can be used to open form from the body of the onAddRow method (no need to implement the whole boilerplate for opening form, it iś shortcut back into the framework)
export type OnAddRowFn = (selectedRow: any | null, filters: DataTableFilterMeta, openFormForInsert: OpenFormForInsert) => void;

export interface AddRowButton {
    key?: string;
    icon?: IconType<ButtonProps>;
    label: string;
    onClick: OnAddRowFn;
    style?: CSSProperties;
}

export type AppButtonForRowOnClick = (
    selectedRow: any,
    findParam: FindParam // query info for current filtered rows (can be used to run function over filtered rows)
) => void;

export interface AppButtonForRow {
    key?: string;
    icon?: IconType<ButtonProps>;
    label: string;
    onClick: AppButtonForRowOnClick;
    style?: CSSProperties;
}

export interface OptionalCustomFilter {
    label: string;
    filter: CustomFilter;
}

export interface AssocToSort {
    assoc: string;
    sortField: string;
}

export interface EditModeHandlers {
    onStart: () => void;
    onSave: () => void;
    onCancel: () => void;
    onAddColumn: (field: string) => void;
    onEditColumn: (field: string) => void;
    onRemoveColumn: (field: string) => void;
    onMoveColumnLeft: (field: string) => void;
    onMoveColumnRight: (field: string) => void;
}

// special properties that are available in the <entity>Browse components
// displayed and openForm are added by XFormNavigator3
// searchBrowseParams adds the choose button
// properties displayed and searchBrowseParams are (manually) transferred into LazyDataTable (purely technical matters)
// property openForm is used to open a further "subform", very often <entity>Form (from there we then return back to <entity>Browse by calling openForm(null))
// if we want to use the same <entity>Browse both as a classic Browse and as a SearchBrowse, we need to use the type (props: BrowseProps & SearchBrowseProps) - union of the properties

/**
 * @deprecated was used to send props displayed and openForm to *Browse when using XFormNavigator (deprecated)
 */
export interface BrowseProps {
    displayed?: boolean;
    openForm?: (newFormElement: ReactElement | null) => void;
}

export interface SearchBrowseProps {
    searchBrowseParams?: SearchBrowseParams;
}

export enum StateKeySuffix {
    filters = 'filters',
    ftsInputValue = 'fts-input-value',
    optionalCustomFilter = 'optional-custom-filter',
    multiSortMeta = 'multi-sort-meta',
    pagingFirst = 'paging-first',
    selectedRow = 'selected-row',
    multilineSwitchValue = 'multiline-switch-value',
    columnToggles = 'column-toggles'
}

// exposed methods
export interface LazyDataTableRef {
    reread: () => void;
    setupExpandedRows: () => void;
}

export interface LazyDataTableProps {
    entity: string;
    stateStorage?: StorageType; // default is session
    stateKey?: string; // key used to save the state into session (or local), default is entity, but sometimes we have more then 1 browse/LazyDataTable for 1 entity
    label?: string;
    labelStyle?: CSSProperties; // used to override default style or add new style
    dataKey?: string;
    rowExpansionTemplate?: (row: any, options: DataTableRowExpansionTemplate) => ReactNode;
    showExpandedRow?: (row: any, multilineSwitchValue: MultilineRenderType) => boolean;
    paginator?: boolean;
    rows?: number;
    filterDisplay?: "menu" | "row";
    betweenFilter?: BetweenFilterProp; // placement of the from-to inputs: "row" - next to each other, "column" - one under the other; applies to all columns of type date/datetime/decimal/number if they don't have their own betweenFilter defined
    autoFilter?: boolean; // if true, filtering starts immediately after setting filter value (button Filter is not used/rendered) (default false)
    showFilterButtons?: boolean; // if true, Filter/Clear filter buttons are rendered (default true)
    showColumnToggleButton?: boolean; // if true, column toggle button is rendered (default true) (for mobile the button can take too much space)
    showExportRows?: boolean; // true - export button rendered, false - export button not rendered, undefined (default) - Export button rendered only on desktop (not on mobile)
    scrollable?: boolean; // default true, if it is false, scrolling is turned off (scrollWidth/scrollHeight/formFooterHeight are ignored)
    scrollWidth?: string; // the value "none" turns off horizontal scrolling
    scrollHeight?: string; // the value "none" turns off vertical scrolling
    formFooterHeight?: string; // used (for now) only in the demo - the height of the links to the sources (SourceCodeLinkForm, SourceCodeLinkEntity) is entered here so that they are visible during automatic calculation of the table height
    shrinkWidth?: boolean; // default true - if true, it does not widen columns beyond their explicit width ("wide" tables across the whole length of the parent element do not arise)
    onResetTable?: () => void; // called when clicking the button resetTable (Reset filter)
    EditForm?: ComponentType<FormProps>; // form for editing of the selected row and for adding new row; using this prop creates add row button and edit row button (if they are not suppressed by props onAddRow or onEditRow)
    editFormElement?: ReactElement; // element version of editForm (for the case if additional (custom) props are needed)
    onAddRow?: OnAddRowFn | AddRowButton[] | false; // creates add row button (or overrides default add row function used by editForm); if false, no add row button is created
                                                        // array form (like appButtonsForRow) renders multiple add buttons instead of the standard "Add" button
    onEditRow?: ((selectedRow: any, openFormForUpdate: OpenFormForUpdate) => void) | false; // creates edit row button (or overrides default edit function used by editForm); if false, no edit row button is created
                                                            // function openFormForUpdate can be used to open form from the body of the onEditRow method (no need to implement the whole boilerplate for opening form, it iś shortcut back into the framework)
    onRemoveRow?: ((selectedRow: any) => Promise<boolean>) | boolean; // if onRemoveRow is function or onRemoveRow = true, then remove row button is created
    postRemoveRow?: OnSaveOrCancelProp; // function called after removing row
    docTemplates?: true | ((entity: string) => Promise<XtDocTemplate[]>); // if true, doc template button is rendered; function param: function returning list of templates that can be used by user (for the case if we need project specific way of fetching templates)
    appButtonsForRow?: AppButtonForRow[]; // the selected row is sent into the functions of these buttons
    appButtons?: any; // general buttons (no need to send them the selected row) - maybe they should be called appButtonsGeneral
    filters?: DataTableFilterMeta; // user filter
    customFilter?: CustomFilter; // (programmatic) filter that is applied to the displayed data (the user cannot change it)
    optionalCustomFilters?: OptionalCustomFilter[]; // filters prepared by the programmer, the user can choose a prepared filter in the dropdown next to the Filter/Clear buttons
    sortField?: string | DataTableSortMeta[];
    fullTextSearch?: boolean | string[]; // false - we don't have full-text search, true - we have full-text search on the default columns, string[] - full-text search on the given columns
    fullTextSearchWidth?: string; // width of the full text search input (sometimes we need to save the space on mobile)
    fields?: string[]; // if we want to also load associated objects besides those that are loaded because of some of the columns
    assocsToSort?: AssocToSort[]; // oneToMany assocs for sorting detail rows of after fetching data from backend (only first level assocs are supported, only default asc order supported)
    multilineSwitch?: boolean; // default false, if true it displays a switch with which the display of multiline texts in a wide row can be turned off
    multilineSwitchInitValue?: MultilineRenderType; // default "allLines"
    multilineSwitchFewLinesCount?: number; // max count of rendered lines for render type "fewLines" (default 2)
    // if we want to have access to the state of the multilineSwitch, we need to pull "const [multilineSwitchValue, setMultilineSwitchValue] = useState<MultilineRenderType>(...);" into the browse component
    multilineSwitchValue?: [MultilineRenderType, Dispatch<SetStateAction<MultilineRenderType>>]; // TODO - create a special type, e.g. XuseState<boolean>
    headerBodyTop?: ReactNode; // adds stuff above input for full text search and search buttons (used for mobile if there is not enaugh space in headerBodyLeft or headerBodyRight)
    headerBodyLeft?: ReactNode; // adds stuff before input for full text search
    headerBodyRight?: ReactNode; // it is added right after multilineSwitch, e.g. a custom switch can be added here
    searchBrowseParams?: SearchBrowseParams;
    width?: string; // I don't know how it works (especially when using scrollWidth/scrollHeight), and it is not used anywhere for now
    rowClassName?: (data: any) => object | string | undefined;
    exportFieldsToDuplicateValues?: string[]; // list of fields (columns), values in these columns will be duplicated in case the row is multiline because of toMany associations
                                            // it would be nicer to mark these columns directly with some {true} property but I don't want to invest that much into it
                                            // it is because of some contingency tables in excel that need it
    editMode?: boolean;
    editModeHandlers?: EditModeHandlers;
    /**
     * @deprecated was used to reread data after save/cancel of the form when using XFormNavigator (deprecated),
     * now method reread() is exposed and supposed to be called in onSaveOrCancel of the form
     */
    displayed?: boolean;
    children: ReactElement | ReactElement[];
}

export const LazyDataTable = forwardRef<LazyDataTableRef, LazyDataTableProps>((
    {
        stateStorage = "session",
        paginator = true,
        rows = 30,
        filterDisplay = "row",
        autoFilter = false,
        showFilterButtons = true,
        showColumnToggleButton = true,
        fullTextSearch = true,
        multilineSwitch = false,
        multilineSwitchInitValue = "allLines",
        multilineSwitchFewLinesCount = 2,
        scrollable = true,
        scrollWidth = 'viewport', // sets the table width to (100vw - something) (if the content is wider, it turns on a horizontal scrollbar)
        scrollHeight = 'viewport', // sets the table height to (100vh - something) (if the content is taller, it turns on a vertical scrollbar)
        shrinkWidth = true,
        ...propsRest
    },
    ref
) => {

    const props: LazyDataTableProps = {
        stateStorage,
        paginator,
        rows,
        filterDisplay,
        autoFilter,
        showFilterButtons,
        showColumnToggleButton,
        fullTextSearch,
        multilineSwitch,
        multilineSwitchInitValue,
        multilineSwitchFewLinesCount,
        scrollable,
        scrollWidth,
        scrollHeight,
        shrinkWidth,
        ...propsRest
    };

    // must be here, is used in createFiltersInit()
    const xEntity: Entity = UtilsMetadataCommon.getEntity(props.entity);
    const propsColumns: ReactElement[] = Utils.applyDefaultProps(Children.toArray(props.children) as ReactElement[]);

    const createAggregateItems = (): SimpleAggregateItem[] => {

        let aggregateItems: SimpleAggregateItem[] = [];

        for (let columnChild of propsColumns) {
            const column = columnChild as ColumnType;
            if (column.props.aggregateType) {
                aggregateItems.push({field: column.props.field, aggregateFunction: column.props.aggregateType});
            }
        }

        return aggregateItems;
    }

    const overrideFilters = (filters: DataTableFilterMeta, filtersHigherPrio: DataTableFilterMeta | undefined) : DataTableFilterMeta => {
        if (filtersHigherPrio) {
            // deep clone is needed, otherwise filter elements write into "filters" and override the values in filtersHigherPrio ("props.filters") (simple cloning "..." is not enough to create 2 instances of filter values)
            filters = {...filters, ..._.cloneDeep(filtersHigherPrio)}; // items from filtersHigherPrio will replace existing items in filters
        }
        return filters;
    }

    const createFiltersInit = () : DataTableFilterMeta => {

        let filtersInit: DataTableFilterMeta = {};

        // warning note: props.children are used to get props of Column whereas dataTableEl.current.props.children are used to get props of Primereact DataTable
        //let columns = dataTableEl.current.props.children; - does not work
        for (let columChild of propsColumns) {
            const column = columChild as ColumnType;
            // in some situations, this would be suitable, but for dynamic hide/show columns it can cause crash
            // better place for initializing filters is probably creating columns - function(child)
            //if (Utils.xViewStatus(xLazyColumn.props.columnViewStatus) !== ViewStatus.Hidden) {
                const field: string = column.props.field;
                const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, field);
                // TODO column.props.dropdownInFilter - for "menu" it would be nice to have a list of "enums"
                const filterMatchMode: FilterMatchMode = getInitFilterMatchMode(column.props, xField);
                filtersInit[field] = createFilterItem(props.filterDisplay!, {value: null, matchMode: filterMatchMode});
            //}
        }

        filtersInit = overrideFilters(filtersInit, props.filters);

        if (props.searchBrowseParams !== undefined) {
            const displayFieldFilter: FieldFilter | undefined = props.searchBrowseParams.displayFieldFilter;
            if (displayFieldFilter !== undefined) {
                filtersInit[displayFieldFilter.field] = createFilterItem(props.filterDisplay!, displayFieldFilter.constraint);
            }
        }

        return filtersInit;
    }

    const getInitFilterMatchMode = (columnProps: ColumnProps, xField: Field) : FilterMatchMode => {
        let filterMatchMode: FilterMatchMode;
        if (columnProps.filterElement !== undefined) {
            filterMatchMode = ExtendedFilterMatchMode.FILTER_ELEMENT as unknown as FilterMatchMode; // little hack
        }
        else if (isAutoCompleteInFilterEnabled(columnProps)) {
            filterMatchMode = ExtendedFilterMatchMode.AUTO_COMPLETE as unknown as FilterMatchMode; // little hack
        }
        else if (xField.type === "string" || xField.type === "jsonb") {
            filterMatchMode = FilterMatchMode.CONTAINS;
        }
        // for now all the others EQUALS
        else if (xField.type === "decimal" || xField.type === "number" || xField.type === "interval" || xField.type === "date" || xField.type === "datetime" || xField.type === "boolean") {
            filterMatchMode = FilterMatchMode.EQUALS;
        }
        else {
            throw `Field ${xField.name}: unknown xField.type = ${xField.type}`;
        }

        return filterMatchMode;
    }

    const isAutoCompleteInFilterEnabled = (columnProps: ColumnProps): boolean => {
        return columnProps.autoComplete !== undefined;
    }

/*  old version - created for automatical use of autocomplete on every *toOne assoc with string attribute
                - extra property was used: autoCompleteEnabled: true | false | "forStringOnly"
    const isAutoCompleteInFilterEnabled = (xLazyColumnProps: ColumnProps, xField: XField): boolean => {
        let autoCompleteEnabled: boolean = false; // default
        // condition1: field has to have the length >= 2
        if (!XUtilsCommon.isSingleField(xLazyColumnProps.field)) {
            // condition2: used assoc must be *toOne
            let assocField: string;
            if (xLazyColumnProps.autoComplete?.assocField) {
                assocField = xLazyColumnProps.autoComplete?.assocField;
            }
            else {
                const [assocFieldTemp, displayFieldTemp] = XUtilsCommon.getPathToAssocAndField(xLazyColumnProps.field);
                assocField = assocFieldTemp!;
            }
            const xAssoc: XAssoc = XUtilsMetadataCommon.getXAssocToOneByPath(xEntity, assocField);
            if (xAssoc.relationType === "many-to-one" || xAssoc.relationType === "one-to-one") {
                if (xLazyColumnProps.autoCompleteEnabled === true) {
                    autoCompleteEnabled = true; // explicit enabled - works for all types (usually has not big sense)
                }
                else if (xLazyColumnProps.autoCompleteEnabled === "forStringOnly") {
                    // default usecase - the last attribute must be of type string
                    if (xField.type === "string") {
                        autoCompleteEnabled = true;
                    }
                }
            }
        }
        return autoCompleteEnabled;
    }
*/
    const createFilterItem = (filterDisplay: "menu" | "row", constraint: DataTableFilterMetaData): DataTableFilterMetaData | DataTableOperatorFilterMetaData => {
        let filterItem: DataTableFilterMetaData | DataTableOperatorFilterMetaData;
        if (filterDisplay === "menu") {
            // DataTableOperatorFilterMetaData: operator + filter values
            filterItem = {
                operator: FilterOperator.OR, // default
                constraints: [constraint]
            };
        }
        else {
            // props.filterDisplay === "row"
            // DataTableFilterMetaData: filter value
            filterItem = constraint;
        }
        return filterItem;
    }

    const createInitFtsInputValue = (): FtsInputValue => {
        return {value: null, matchMode: "contains"};
    }

    const createInitColumnToggles = (): boolean[] => {
        const columns: ColumnType[] = propsColumns as ColumnType[];
        return columns.map((column: ColumnType) => column.props.initColumnToggle !== false);
    }

/*
    // TODO turn off/on storage
    const saveValueIntoStorage = (stateKeySuffix: StateKeySuffix, value: any) => {
        Utils.saveValueIntoStorage(`${getTableStateKey()}-${stateKeySuffix}`, value);
    }

    // TODO turn off/on storage
    const getValueFromStorage = (stateKeySuffix: StateKeySuffix, initValue: any): any => {
        return Utils.getValueFromStorage(`${getTableStateKey()}-${stateKeySuffix}`, initValue);
    }
*/
    const getStateKey = (stateKeySuffix: StateKeySuffix): string => {
        return `x-ldt-state-${props.stateKey ?? props.entity}-${stateKeySuffix}`;
    }

    const removePagingFromStorage = () => {
        Utils.removeValueFromStorage(props.stateStorage!, getStateKey(StateKeySuffix.pagingFirst));
    }

    // variables valid for the whole component (analogous to member variables in a class)
    const primeReactContext: APIOptions = useContext(PrimeReactContext); // probably does not work and deprecated PrimeReact.filterMatchModeOptions is used
    const dataTableEl = useRef<any>(null);
    let customFilterItems: CustomFilterItem[] | undefined = UtilsCommon.createCustomFilterItems(props.customFilter);
    if (props.searchBrowseParams !== undefined) {
        // if we have props.searchBrowseParams.customFilterFunction, we add a filter
        if (props.searchBrowseParams.customFilter) {
            customFilterItems = UtilsCommon.filterAnd(customFilterItems, Utils.evalFilter(props.searchBrowseParams.customFilter));
        }
    }
    let aggregateItems: SimpleAggregateItem[] = createAggregateItems();

    // if we have fieldSet columns (columns that have fieldSetId set and display values according to the fieldSet),
    // we load here maps that make it possible to get labels of the checked fields
    // note: it would already be useful to have objects (instances) created for the columns and write a possible XFieldSetMap, filter into them (now it is in "filters")
    const [xFieldSetMaps, setXFieldSetMaps] = useState<XFieldSetMaps>({});

    const [value, setValue] = useState<FindResult>({rowList: [], totalRecords: 0, aggregateValues: []});
    const [expandedRows, setExpandedRows] = useState<DataTableExpandedRows | DataTableValueArray | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [first, setFirst] = useStateStorage(props.stateStorage!, getStateKey(StateKeySuffix.pagingFirst), 0);
    const [rowsLocal, setRowsLocal] = useState(props.paginator ? props.rows : undefined);
    // "filters" have special initialState function different from that used in useStateStorage
    const filtersInitialStateFunction = (): DataTableFilterMeta => {
        let filtersInit: DataTableFilterMeta | null = Utils.getValueFromStorage(props.stateStorage!, getStateKey(StateKeySuffix.filters), null);
        if (filtersInit != null) {
            // we have filters from session - if we have props.filters, we always override the values from session (values from props.filters have higher priority)
            filtersInit = overrideFilters(filtersInit, props.filters);
        }
        else {
            // no filters in session
            filtersInit = createFiltersInit();
        }
        return filtersInit;
    }
    const [filters, setFilters] = useStateStorageBase<DataTableFilterMeta>(props.stateStorage!, getStateKey(StateKeySuffix.filters), filtersInitialStateFunction); // filtering in a "controlled manner" (some value can be initialized here)
    const matchModeChangeFieldRef = useRef<string | null>(null);
    const initFtsInputValue: FtsInputValue | undefined = props.fullTextSearch ? createInitFtsInputValue() : undefined;
    const [ftsInputValue, setFtsInputValue] = useStateStorage<FtsInputValue | undefined>(props.stateStorage!, getStateKey(StateKeySuffix.ftsInputValue), initFtsInputValue);
    const [optionalCustomFilter, setOptionalCustomFilter] = useStateStorage<OptionalCustomFilter | undefined>(props.stateStorage!, getStateKey(StateKeySuffix.optionalCustomFilter), undefined);
    const [multilineSwitchValue, setMultilineSwitchValue] = props.multilineSwitchValue ?? useStateStorage<MultilineRenderType>(props.stateStorage!, getStateKey(StateKeySuffix.multilineSwitchValue), props.multilineSwitchInitValue!);
    const [multiSortMeta, setMultiSortMeta] = useStateStorage<DataTableSortMeta[] | undefined>(props.stateStorage!, getStateKey(StateKeySuffix.multiSortMeta), UtilsCommon.createMultiSortMeta(props.sortField));
    const [selectedRow, setSelectedRow] = useStateStorage<any>(props.stateStorage!, getStateKey(StateKeySuffix.selectedRow), null);
    const [columnToggles, setColumnToggles] = useStateStorage<boolean[]>(props.stateStorage!, getStateKey(StateKeySuffix.columnToggles), createInitColumnToggles());
    /**
     * @deprecated was used to reread data after save/cancel of the form when using XFormNavigator (deprecated)
     */
    const [dataLoaded, setDataLoaded] = useState<boolean>(false); // flag where we write whether we have already loaded the data
    const [exportRowsDialogState, setExportRowsDialogState] = useState<ExportRowsDialogState>({dialogOpened: false});
    //const [exportRowsDialogRowCount, setExportRowsDialogRowCount] = useState<number>(); // param for the dialog
    const [filtersAfterFiltering, setFiltersAfterFiltering] = useState<DataTableFilterMeta>(filters); // here we store the filter state after clicking the button Filter (we want to export exactly what is visible filtered)
    const [ftsInputValueAfterFiltering, setFtsInputValueAfterFiltering] = useState<FtsInputValue | undefined>(ftsInputValue); // the same as filtersAfterFiltering
    const [optionalCustomFilterAfterFiltering, setOptionalCustomFilterAfterFiltering] = useState<OptionalCustomFilter | undefined>(optionalCustomFilter); // the same as filtersAfterFiltering
    const [formDialogState, setFormDialogState] = useState<FormDialogState>({opened: false});
    const [columnToggleDialogOpened, setColumnToggleDialogOpened] = useState<boolean>(false);

    // the parameter [] ensures that the method is called only after the first rendering (and not after every state change (calling setSomething()))
    useEffect(() => {
        // simple way - we don't use the parameter props.displayed and the flag dataLoaded
        if (props.displayed === undefined) {
            loadData();
            //console.log("LazyDataTable - data loaded (simple)");
        }
    },[]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        // way used with XFormNavigator (we need to refresh the data when returning from the form)
        if (props.displayed !== undefined) {
            if (props.displayed) {
                if (!dataLoaded) {
                    loadData();
                    //console.log("LazyDataTable - data loaded (used displayed)");
                    setDataLoaded(true);
                }
            }
            else {
                // the dataTable is hidden - when we return to it, we want the flag dataLoaded set to false, so that we see fresh data
                if (dataLoaded) {
                    setDataLoaded(false);
                }
            }
        }
    }); // eslint-disable-line react-hooks/exhaustive-deps

    useImperativeHandle(ref, () => ({
        reread: reread,
        setupExpandedRows: () => setupExpandedRows(value, multilineSwitchValue)
    }));

    // TODO - why is it here? move it down if possible...
    const dataKey = props.dataKey !== undefined ? props.dataKey : UtilsMetadataCommon.getEntity(props.entity).idField;

    const onPage = async (event: any) => {

        //console.log("called onPage");

        setFirst(event.first);
        const findParam: FindParam = createFindParam();
        findParam.first = event.first; // we overwrite first, because the old value is there (calling setFirst does not change first immediately)
        loadDataBase(findParam);
    }

    const onFilter = (e: DataTableStateEvent) => {

        // HEY! this method is not called (on filter value change) since we use filterElement on component Column (in filter there are always custom components those call direct setFilters(...))
        // this method is called (probably) only when user changes match mode

        //console.log("called onFilter - this.state.filters = " + JSON.stringify(filters));
        //console.log("called onFilter - event.filters = " + JSON.stringify(e.filters));

        let filtersChanged: boolean = false;

        const changedField: string | null = matchModeChangeFieldRef.current;
        if (changedField) {
            // method onFilterMatchModeChange was called (user changed match mode)
            const filterValueOld: DataTableFilterMetaData | DataTableOperatorFilterMetaData = filters[changedField];
            const filterValue: DataTableFilterMetaData | DataTableOperatorFilterMetaData = e.filters[changedField];
            if (filterValueOld && filterValue) { // should be always true
                const xFilterValueOld: ExtendedDataTableFilterMetaData = filterValueOld as ExtendedDataTableFilterMetaData; // works only for filterDisplay="row"
                const xFilterValue: ExtendedDataTableFilterMetaData = filterValue as ExtendedDataTableFilterMetaData; // works only for filterDisplay="row"
                if (xFilterValue.matchMode !== xFilterValueOld.matchMode) {
                    const isNotNullValueAlias: string = `<${localeOption('xIsNotNull')}>`;
                    const isNullValueAlias: string = `<${localeOption('xIsNull')}>`;
                    const xFilterMatchMode: ExtendedFilterMatchMode = xFilterValue.matchMode as unknown as ExtendedFilterMatchMode;
                    if (xFilterMatchMode === ExtendedFilterMatchMode.IS_NOT_NULL || xFilterMatchMode === ExtendedFilterMatchMode.IS_NULL) {
                        let newValue: any = null;
                        // for string types we set alias, for other types we set null (alias is not displayed -> NaN or Invalid date are displayed)
                        const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, changedField);
                        if (xField.type === "string" || xField.type === "jsonb") {
                            if (xFilterMatchMode === ExtendedFilterMatchMode.IS_NOT_NULL) {
                                newValue = isNotNullValueAlias;
                            }
                            else {
                                // xFilterMatchMode === ExtendedFilterMatchMode.IS_NULL
                                newValue = isNullValueAlias;
                            }
                        }

                        xFilterValue.value = newValue;
                        filtersChanged = true;
                    }
                    else if (xFilterMatchMode === ExtendedFilterMatchMode.AUTO_COMPLETE) {
                        xFilterValue.value = null;
                        filtersChanged = true;
                    }
                    // all other match modes - change to null, if previous match mode was IS_NOT_NULL or IS_NULL or AUTO_COMPLETE
                    else if (xFilterValue.value === isNotNullValueAlias || xFilterValue.value === isNullValueAlias || typeof xFilterValue.value === 'object') {
                        xFilterValue.value = null;
                        filtersChanged = true;
                    }
                }
            }

            matchModeChangeFieldRef.current = null;
        }

        let filtersNew: DataTableFilterMeta = e.filters;
        if (filtersChanged) {
            // clone needed if there was change, otherwise react does not show the change
            filtersNew = {...filtersNew};
        }
        // by this call the character typed on the keyboard is written into the filter input (if we comment out the command, the filter input stays empty)
        setFilters(filtersNew);
        removePagingFromStorage();
        loadDataBaseIfAutoFilter(filtersNew, false); // TODO - pass value Column.props.autoFilter here
    }

    const onSort = (event: any) => {

        //console.log("called onSort - this.state.multiSortMeta = " + JSON.stringify(multiSortMeta));
        //console.log("called onSort - event.multiSortMeta = " + JSON.stringify(event.multiSortMeta));

        setMultiSortMeta(event.multiSortMeta);
        const findParam: FindParam = createFindParam();
        findParam.multiSortMeta = event.multiSortMeta; // we overwrite multiSortMeta, because the old value is there (calling setMultiSortMeta does not change multiSortMeta immediately)
        loadDataBase(findParam);
    }

    const loadDataBaseIfAutoFilter = (filters: ExtendedDataTableFilterMeta, fieldAutoFilter: boolean) => {
        if (props.autoFilter || fieldAutoFilter) {
            const findParam: FindParam = createFindParam();
            findParam.filters = filters; // we overwrite filters, because the old value is there
            loadDataBase(findParam);
        }
    }

    const onClickFilter = () => {

        //console.log("called onClickFilter");

        loadData();
    };

/*  original method, which only cleared the filter
    const onClickClearFilter = () => {
        // the simplest way - it also changes possibly set matchMode values
        let filtersInit: DataTableFilterMeta = createFiltersInit();
        setFilters(filtersInit);

        if (ftsInputValue) {
            setFtsInputValue(createInitFtsInputValue());
        }

        if (props.optionalCustomFilters) {
            setOptionalCustomFilter(undefined);
        }
    };
*/

    const onClickResetTable = () => {
        // every session state variable set to init value from "props" or default value
        // (this code corresponds to init values in useStateSession hooks)

        const firstLocal: number = 0;
        setFirst(firstLocal);

        const filtersLocal: DataTableFilterMeta = createFiltersInit();
        setFilters(filtersLocal);

        const ftsInputValueLocal: FtsInputValue = createInitFtsInputValue();
        setFtsInputValue(ftsInputValueLocal);

        const optionalCustomFilterLocal: OptionalCustomFilter | undefined = undefined;
        setOptionalCustomFilter(optionalCustomFilterLocal);

        setMultilineSwitchValue(props.multilineSwitchInitValue!);

        const multiSortMetaLocal: DataTableSortMeta[] | undefined = UtilsCommon.createMultiSortMeta(props.sortField);
        setMultiSortMeta(multiSortMetaLocal);

        setSelectedRow(null);

        // custom operations
        if (props.onResetTable) {
            props.onResetTable();
        }

        // at least because of sort change (icon shows sorting column) we have to read data from db right now
        const findParam: FindParam = createFindParam();
        // overwrite first, filters, ... with (potentially) new values
        findParam.first = firstLocal;
        findParam.filters = filtersLocal;
        findParam.fullTextSearch = createXFullTextSearch(ftsInputValueLocal);
        findParam.customFilterItems = createXCustomFilterItems(customFilterItems, optionalCustomFilterLocal);
        findParam.multiSortMeta = multiSortMetaLocal;
        loadDataBase(findParam);
    };

    const onColumnTogglesOk = (columnTogglesLocal: boolean[]) => {
        setColumnToggles(columnTogglesLocal);

        // fields depend on columnToggles - override, setState does not update columnToggles immediately
        const findParam: FindParam = createFindParam();
        findParam.fields = getFields(true, columnTogglesLocal);
        loadDataBase(findParam);
    };

    // API function
    const reread = () => {
        loadData();
    }

    const loadData = async () => {
        // for good measure we serialize both operations (even though theoretically it should work without serializing too)
        await loadXFieldSetMaps();
        await loadDataBase(createFindParam());
    }

    const createFindParam = (): FindParam => {
        return {
            resultType: ResultType.RowCountAndPagedRows,
            first: first,
            rows: rowsLocal,
            filters: filters,
            fullTextSearch: createXFullTextSearch(ftsInputValue),
            customFilterItems: createXCustomFilterItems(customFilterItems, optionalCustomFilter),
            multiSortMeta: multiSortMeta,
            entity: props.entity,
            fields: getFields(true),
            aggregateItems: aggregateItems
        };
    }

    const loadXFieldSetMaps = async () => {
        const fieldSetIds: string[] = getFieldSetIds();
        if (fieldSetIds.length > 0) {
            // in the future - take from some cache, not from DB
            const xFieldSetMetaList: XFieldSetMeta[] = await Utils.fetchRows('XFieldSetMeta', {where: "[fieldSetId] IN (:...fieldSetIdList)", params: {fieldSetIdList: fieldSetIds}});
            // check
            if (xFieldSetMetaList.length !== fieldSetIds.length) {
                throw `One or more of fieldSetIds "${fieldSetIds.join(", ")}" was not found in DB in the table for Entity XFieldSetMeta`;
            }
            const xFieldSetMapsLocal: XFieldSetMaps = {};
            for (const xFieldSetMeta of xFieldSetMetaList) {
                xFieldSetMapsLocal[xFieldSetMeta.fieldSetId] = XFieldSetBase.createXFieldXFieldMetaMap(xFieldSetMeta);
            }
            // save created structures
            setXFieldSetMaps(xFieldSetMapsLocal);
        }
    }

    const loadDataBase = async (findParam: FindParam) => {
        //console.log("called loadDataBase - startIndex = " + findParam.first + ", endIndex = " + ((findParam.first ?? 0) + (findParam.rows ?? 0)) + ", filters = " + JSON.stringify(findParam.filters) + ", multiSortMeta = " + JSON.stringify(findParam.multiSortMeta) + ", fields = " + JSON.stringify(findParam.fields));
        setLoading(true);
        const findResult = await findByFilter(findParam);
        sortAssocsToSort(findResult);
        setValue(findResult);
        setupExpandedRows(findResult, multilineSwitchValue);
        setLoading(false);
        // save table state into session/local
        //saveTableState(findParam); <- old solution, state is saved immediately after change of some filter field, sorting, etc.
        // we store the filter values for a possible export (maybe simple cloning is enough, but to be sure we use deep)
        setFiltersAfterFiltering(_.cloneDeep(filters));
        setFtsInputValueAfterFiltering(ftsInputValue ? {...ftsInputValue} : undefined);
        setOptionalCustomFilterAfterFiltering(optionalCustomFilter ? _.cloneDeep(optionalCustomFilter) : undefined);
        // async check for new version - the purpose is to get new version of app to the browser (if available) in short time (10 minutes)
        // (if there is no new version, the check will run async (as the last operation) and nothing will happen)
        Utils.reloadIfNewVersion();
    }

    const sortAssocsToSort = (findResult: FindResult) => {
        if (props.assocsToSort) {
            if (findResult.rowList) {
                for (const row of findResult.rowList) {
                    // sorting in javascript (avoid of sorting in DB)
                    for (const assocToSort of props.assocsToSort) {
                        const assocRowList: any[] = row[assocToSort.assoc];
                        if (assocRowList) {
                            row[assocToSort.assoc] = UtilsCommon.arraySort(assocRowList, assocToSort.sortField);
                        }
                    }
                }
            }
        }
    }

    const setupExpandedRows = (findResult: FindResult, multilineSwitchValue: MultilineRenderType) => {
        if (props.rowExpansionTemplate) {
            const expandedRowsLocal: DataTableExpandedRows = {};
            if (findResult.rowList) {
                for (const row of findResult.rowList) {
                    let showExpandedRow: boolean = true; // default
                    if (props.showExpandedRow) {
                        showExpandedRow = props.showExpandedRow(row, multilineSwitchValue);
                    }
                    if (showExpandedRow) {
                        expandedRowsLocal[`${row[dataKey]}`] = true;
                    }
                }
            }
            setExpandedRows(expandedRowsLocal);
        }
    }

    const findByFilter = async (findParam: FindParam) : Promise<FindResult> => {

        // the result is of type FindResult
        const findResult: FindResult = await Utils.fetchOne('x-lazy-data-table-find-rows', findParam);
        findResult.totalRecords = parseInt(findResult.totalRecords as any as string);
        return findResult;
    }

/*
    const saveTableState = (findParam: FindParam) => {
        saveValueIntoStorage(StateKeySuffix.filters, findParam.filters);
        saveValueIntoStorage(StateKeySuffix.ftsInputValue, ftsInputValue);
        saveValueIntoStorage(StateKeySuffix.optionalCustomFilter, optionalCustomFilter);
    }
*/

    const createXFullTextSearch = (ftsInputValue: FtsInputValue | undefined): FullTextSearch | undefined => {
        let xFullTextSearch: FullTextSearch | undefined = undefined; // default
        if (ftsInputValue && ftsInputValue.value !== null) {
            xFullTextSearch = {
                fields: Array.isArray(props.fullTextSearch) ? props.fullTextSearch : undefined,
                value: ftsInputValue.value,
                splitValue: true,
                matchMode: ftsInputValue.matchMode
            }
        }
        return xFullTextSearch;
    }

    const createXCustomFilterItems = (customFilterItems: CustomFilterItem[] | undefined, optionalCustomFilter: OptionalCustomFilter | undefined): CustomFilterItem[] | undefined => {
        return UtilsCommon.filterAnd(customFilterItems, optionalCustomFilter?.filter);
    }

    const getFields = (addPropsFields: boolean, columnTogglesParam?: boolean[]): string[] => {

        // remark: fields are computed from columns of LazyDataTable (props.children), not from columns of Primereact DataTable (dataTableEl.current.props.children),
        // because this method is called from onColumnTogglesOk (columnTogglesParam !== undefined) and in this case columns of Primereact DataTable are still not updated to the new column toggle state

        const toggles: boolean[] = columnTogglesParam ?? columnToggles;
        const fields = [];
        const columns: ColumnType[] = propsColumns as ColumnType[];
        for (let index = 0; index < columns.length; index++) {
            const column: ColumnType = columns[index];
            if (Utils.xViewStatus(column.props.columnViewStatus) === ViewStatus.Hidden) {
                continue;
            }
            if (toggles[index] === false) {
                continue;
            }
            fields.push(column.props.field);
        }
        if (addPropsFields) {
            if (props.fields) {
                fields.push(...props.fields);
            }
        }
        return fields;
    }

    // const getHeaders = (): string[] => {
    //
    //     // nicely displays the whole object!
    //     //console.log(dataTableEl.current);
    //
    //     let headers = [];
    //     let columns = dataTableEl.current.props.children;
    //     for (let column of columns) {
    //         // warning! we pull headers from primereact DataTable and e.g. during editing the header attribute may not be a string
    //         headers.push(column.props.header);
    //     }
    //     return headers;
    // }

    // const getWidths = (): string[] => {
    //     // returns column widths e.g. ['7.75rem', '20rem', '8.5rem', '8.5rem', '6rem']
    //     // does not return the current column widths (after manual widening) but those that were set/computed in the code
    //     let widths = [];
    //     let columns = dataTableEl.current.props.children;
    //     for (let column of columns) {
    //         widths.push(column.props.headerStyle?.width);
    //     }
    //     return widths;
    // }

    const createExportColumns = (): ExportColumnParam[] => {

        // nicely displays the whole object!
        //console.log(dataTableEl.current);

        // warning note: props.children are used to get props of XLazyColumn whereas dataTableEl.current.props.children are used to get props of Primereact DataTable

        const exportColumns: ExportColumnParam[] = [];
        const columnsDataTable = dataTableEl.current.props.children;
        const columnsLazyDataTable: ColumnType[] = propsColumns as ColumnType[];
        for (const columnDataTable of columnsDataTable) {
            // match by field - indexes may differ when some columns are hidden (columnViewStatus / columnToggles)
            const columnLazyDataTable: ColumnType | undefined = columnsLazyDataTable.find(
                (column: ColumnType) => column.props.field === columnDataTable.props.field
            );
            exportColumns.push({
                // warning! we pull headers from primereact DataTable and e.g. during editing the header attribute may not be a string
                header: columnDataTable.props.header,
                // returns the width of the column e.g. '7.75rem', '20rem', '125px'
                // does not return the current widths (after manual extending by user) but those widths that were set/computed in source code
                width: columnDataTable.props.headerStyle?.width,
                textFormat: columnLazyDataTable?.props.textFormat
            });
        }
        return exportColumns;
    }

    const getFieldSetIds = (): string[] => {
        const fieldSetIds = [];
        // warning note: props.children are used to get props of Column whereas dataTableEl.current.props.children are used to get props of Primereact DataTable
        const columns: ColumnType[] = propsColumns as ColumnType[];
        for (let column of columns) {
            if (column.props.fieldSetId) {
                fieldSetIds.push(column.props.fieldSetId);
            }
        }
        return fieldSetIds;
    }

    const hasTextFormatHtml = (): boolean => {

        const columns: ColumnType[] = propsColumns as ColumnType[];
        return columns.some((column: ColumnType) => column.props.textFormat === "html");
    }

    const createColumnToggleDialogItems = (): ColumnToggleDialogItem[] => {
        const items: ColumnToggleDialogItem[] = [];
        const columns: ColumnType[] = propsColumns as ColumnType[];
        for (let index = 0; index < columns.length; index++) {
            const column: ColumnType = columns[index];
            if (Utils.xViewStatus(column.props.columnViewStatus) === ViewStatus.Hidden) {
                continue;
            }
            items.push({
                index: index,
                label: column.props.header ?? column.props.field
            });
        }
        return items;
    }

    const onSelectionChange = (event: any) => {
        //console.log("called onSelectionChange");
        //console.log(event.value);

        setSelectedRow(event.value);
    }

    const onRowDoubleClick = (event: any) => {
        //console.log("called onRowDoubleClick");
        //console.log(event.data);

        onRowDoubleClickBase(event.data);
    }

    const onRowDoubleClickBase = (row: any) => {
        if (props.searchBrowseParams === undefined) {
            editRow(row);
        }
        else {
            props.searchBrowseParams.onChoose(row);
        }
    }

    const onClickAddRow = () => {
        //console.log("called onClickAddRow");

        if (typeof props.onAddRow === 'function') {
            props.onAddRow(selectedRow, filters, openFormForInsert);
        }
        else if ((props.EditForm !== undefined || props.editFormElement !== undefined) && props.onAddRow !== false) {
            openFormForInsert();
        }
    }

    const openFormForInsert: OpenFormForInsert = (
        initValues?: object,
        onSaveOrCancel?: OnSaveOrCancelProp,
        Form?: ComponentType<FormProps>,
        formElement?: ReactElement
    ): void => {
        if (props.EditForm === undefined && Form === undefined && props.editFormElement === undefined && formElement === undefined) {
            throw `No form declared. LazyDataTable.EditForm/editFormElement is undefined and also Form/formElement in call of the method openFormForInsert is undefined.`;
        }
        setFormDialogState({
            opened: true,
            id: undefined, // insert
            initValues: initValues, // undefined or {} is the same (no attributes to initialise)
            onSaveOrCancel: onSaveOrCancel ?? editRowOnSaveOrCancel,
            Form: Form ?? props.EditForm,
            formElement: formElement ?? props.editFormElement
        });
    }

    const onClickEditRow = () => {
        //console.log("called onClickEditRow");

        if (selectedRow !== null) {
            editRow(selectedRow);
        }
        else {
            alert(localeOption('pleaseSelectRow'));
        }
    }

    const editRow = (row: any) => {
        if (typeof props.onEditRow === 'function') {
            props.onEditRow(row, openFormForUpdate);
        }
        else if ((props.EditForm !== undefined || props.editFormElement !== undefined) && props.onEditRow !== false) {
            openFormForUpdate(row[dataKey]);
        }
    }

    const openFormForUpdate: OpenFormForUpdate = (
        id: number,
        onSaveOrCancel?: OnSaveOrCancelProp,
        Form?: ComponentType<FormProps>,
        formElement?: ReactElement
    ): void => {
        if (props.EditForm === undefined && Form === undefined && props.editFormElement === undefined && formElement === undefined) {
            throw `No form declared. LazyDataTable.EditForm/editFormElement is undefined and also Form/formElement in call of the method openFormForUpdate is undefined.`;
        }
        setFormDialogState({
            opened: true,
            id: id, // update
            initValues: undefined, // must be undefined for update
            onSaveOrCancel: onSaveOrCancel ?? editRowOnSaveOrCancel,
            Form: Form ?? props.EditForm,
            formElement: formElement ?? props.editFormElement
        });
    }

    const editRowOnSaveOrCancel = (object: any | null, objectChange: OperationType) => {
        if (object !== null) {
            // save was pressed, reread from DB
            loadData();
        }
        // if object === null, then cancel was pressed, we do nothing, we just close the dialog
        setFormDialogState({opened: false});
    }

    const onClickRemoveRow = async () => {
        //console.log("called onClickRemoveRow");

        if (selectedRow !== null) {
            if (props.onRemoveRow instanceof Function) {
                let reread = true;
                try {
                    reread = await props.onRemoveRow(selectedRow);
                }
                catch (e) {
                    Utils.showErrorMessage(localeOption('removeRowFailed'), e);
                }
                if (reread) {
                    loadData();
                    if (props.postRemoveRow) {
                        props.postRemoveRow(selectedRow, OperationType.Remove);
                    }
                }
            }
            else {
                if (window.confirm(localeOption('removeRowConfirm'))) {
                    try {
                        // note: thanks to await, loadData() will run only after the removeRow request finishes
                        await Utils.removeRow(props.entity, selectedRow);
                    }
                    catch (e) {
                        Utils.showErrorMessage(localeOption('removeRowFailed'), e);
                    }
                    loadData();
                    if (props.postRemoveRow) {
                        props.postRemoveRow(selectedRow, OperationType.Remove);
                    }
                }
            }
        }
        else {
            alert(localeOption('pleaseSelectRow'));
        }
    }

    const onClickAppButtonForRow = (onClick: AppButtonForRowOnClick) => {

        if (selectedRow !== null) {
            onClick(selectedRow, createFindParamUsingAfterFiltering());
        }
        else {
            alert(localeOption('pleaseSelectRow'));
        }
    }

    const onClickExport = async () => {

        // we export records matching the filter
        // first we find out the number of records
        const findParam: FindParam = createFindParamUsingAfterFiltering();
        //setLoading(true); - it only flickers, we don't need it
        const findResult = await findByFilter(findParam);
        //setLoading(false);

        const exportParams: ExportParams = createExportParams(getFields(false), findResult.totalRecords!);
        setExportRowsDialogState({dialogOpened: true, exportParams: exportParams});
    }

    const createFindParamUsingAfterFiltering = (): FindParam => {
        return {
            resultType: ResultType.OnlyRowCount,
            first: first,
            rows: rowsLocal,
            filters: filtersAfterFiltering,
            fullTextSearch: createXFullTextSearch(ftsInputValueAfterFiltering),
            customFilterItems: createXCustomFilterItems(customFilterItems, optionalCustomFilterAfterFiltering),
            multiSortMeta: multiSortMeta,
            entity: props.entity,
            fields: getFields(false),
            aggregateItems: aggregateItems
        };
    }

    const createExportParams = (fields: string[], rowCount: number): ExportParams => {
        const queryParam: LazyDataTableQueryParam = {
            filters: filtersAfterFiltering,
            fullTextSearch: createXFullTextSearch(ftsInputValueAfterFiltering),
            customFilterItems: createXCustomFilterItems(customFilterItems, optionalCustomFilterAfterFiltering),
            multiSortMeta: multiSortMeta,
            entity: props.entity,
            fields: fields
        };
        return {
            rowCount: rowCount,
            existsToManyAssoc: existsToManyAssoc(fields),
            queryParam: queryParam,
            columns: createExportColumns(),
            fieldsToDuplicateValues: props.exportFieldsToDuplicateValues,
            fileName: `${props.entity}`
        };
    }

    const existsToManyAssoc = (fields: string[]): boolean => {
        const xEntity: Entity = UtilsMetadataCommon.getEntity(props.entity);
        return fields.some((value: string) => UtilsMetadataCommon.hasPathToManyAssoc(xEntity, value));
    }

    const onClickChoose = () => {
        //console.log("called onClickChoose");

        if (selectedRow !== null) {
            if (props.searchBrowseParams !== undefined) {
                props.searchBrowseParams.onChoose(selectedRow);
            }
        }
        else {
            console.log("Nie je vyselectovany ziaden zaznam.");
        }
    }

    // ****** dropdown in the filter ********
    // used only for simple filtering (filterDisplay="row")

    const onDropdownFilterChange = (field: string, displayValue: any, fieldAutoFilter: boolean) => {
        const filterValue: any | null = displayValue !== Utils.dropdownEmptyOptionValue ? displayValue : null;
        setFilterValue(field, filterValue, FilterMatchMode.EQUALS, undefined, fieldAutoFilter);
    }

    const getDropdownFilterValue = (field: string) : any => {
        const filterValue: any | null = getFilterValue(field);
        return filterValue !== null ? filterValue : Utils.dropdownEmptyOptionValue;
    }

    // ****** general methods for set/get into/from the filter ********
    // for now it works only for simple filtering (filterDisplay="row")

    // general special method used for a custom filter (Column.filterElement)
    // I didn't manage to pass autoFilter in such a way that the app programmer wouldn't have to set autoFilter
    const setFilterItem: SetFilterItem = (field: string, filterItem: DataTableFilterMetaData | DataTableOperatorFilterMetaData, autoFilter: boolean) => {
        filters[field] = filterItem;
        // I didn't try whether this also needs to be cloned but probably yes
        const filtersCloned: DataTableFilterMeta = {...filters};
        setFilters(filtersCloned);
        removePagingFromStorage();
        loadDataBaseIfAutoFilter(filtersCloned, autoFilter);
    }

    // general special method used for a custom filter (Column.filterElement)
    const getFilterItem = (field: string): DataTableFilterMetaData | DataTableOperatorFilterMetaData => {
        return filters[field];
    }

    // general method - sets a value into the filter
    // if matchMode === undefined, it keeps the original matchMode value
    const setFilterValue = (field: string, value: any | null, matchMode: any | undefined, customFilterItems: CustomFilterItem[] | undefined, fieldAutoFilter: boolean) => {

        const filterValue: ExtendedDataTableFilterMetaData = filters[field] as ExtendedDataTableFilterMetaData; // works only for filterDisplay="row"
        filterValue.value = value;
        if (matchMode !== undefined) {
            filterValue.matchMode = matchMode;
        }
        filterValue.customFilterItems = customFilterItems;
        // need to clone, otherwise react will not show the changed value
        const filtersCloned: DataTableFilterMeta = {...filters};
        setFilters(filtersCloned);
        // we had problem when page was set to e.g. 3 (more than 1), after setting some filter value that caused that only 1 page should be returned
        // - after returning back to browse no rows were displayed (because requested page was 3) (this is quick fix)
        removePagingFromStorage();
        loadDataBaseIfAutoFilter(filtersCloned, fieldAutoFilter);
    }

    // general method - reads a value from the filter (returns e.g. type Date | null)
    const getFilterValue = (field: string) : any | null => {
        const filterValue: DataTableFilterMetaData = filters[field] as DataTableFilterMetaData; // works only for filterDisplay="row"
        return filterValue.value;
    }

    // general method - returns the set match mode
    const getFilterMatchMode = (field: string) : any => {
        const filterValue: DataTableFilterMetaData = filters[field] as DataTableFilterMetaData; // works only for filterDisplay="row"
        return filterValue.matchMode;
    }

    // ****** general methods for set/get into/from the filter - for betweenFilter ********
    // into DataTableFilterMetaData.value we store a two-element array [value1, value2]
    // on the backend we process this two-element array

    const setFilterValue1 = (field: string, value: any | null, fieldAutoFilter: boolean) => {
        // at the beginning (after lazy table initialization) filterValue = null
        let filterValue: any[2] | null = getFilterValue(field);
        if (filterValue !== null) {
            filterValue[0] = value;
        }
        else {
            filterValue = [value, null];
        }
        setFilterValue(field, filterValue, FilterMatchMode.BETWEEN, undefined, fieldAutoFilter);
    }

    const setFilterValue2 = (field: string, value: any | null, fieldAutoFilter: boolean) => {
        // at the beginning (after lazy table initialization) filterValue = null
        let filterValue: any[2] | null = getFilterValue(field);
        if (filterValue !== null) {
            filterValue[1] = value;
        }
        else {
            filterValue = [null, value];
        }
        setFilterValue(field, filterValue, FilterMatchMode.BETWEEN, undefined, fieldAutoFilter);
    }

    const getFilterValue1 = (field: string) : any | null => {
        return getFilterValue1or2(field, 0);
    }

    const getFilterValue2 = (field: string) : any | null => {
        return getFilterValue1or2(field, 1);
    }

    const getFilterValue1or2 = (field: string, index: 0 | 1) : any | null => {
        let filterValue: any[2] | null = getFilterValue(field);
        return filterValue !== null ? filterValue[index] : null;
    }

    const getBetweenFilter = (columnBetweenFilter: BetweenFilterProp | "noBetween", tableBetweenFilter: BetweenFilterProp): BetweenFilterProp => {
        let betweenFilter: BetweenFilterProp = undefined;
        // columnBetweenFilter has higher prio than tableBetweenFilter
        if (columnBetweenFilter !== undefined) {
            if (columnBetweenFilter === "row" || columnBetweenFilter === "column") {
                betweenFilter = columnBetweenFilter;
            }
            // for "noBetween" stays betweenFilter = undefined (simple filter used)
        }
        else {
            betweenFilter = tableBetweenFilter; // betweenFilter from LazyDataTable property
        }
        return betweenFilter;
    }

    const onFilterMatchModeChange = (e: ColumnFilterMatchModeChangeEvent): void => {
        //console.log(e.matchMode);
        //console.log(e.field);

        // warning: we can not change/set the filter value for the column where match mode was changed
        // if we call setFilters in this method, then after finishing this method primereact calls another setting of "filters" and that second call overwrites our change
        // this method is only "read only" and the change must be done in onFilter method
        // we only save the field of the column where the match mode was changed - it is used later in onFilter method
        matchModeChangeFieldRef.current = e.field;
    }


    const valueAsUI = (value: any, xField: Field, textFormat: TextFormat | undefined, fieldSetId: string | undefined): ReactNode => {
        let valueResult: ReactNode;
        if (xField.type === "boolean") {
            // TODO - it would be more efficient to render only the corresponding icons
            valueResult = <TriStateCheckbox value={value} disabled={true}/>
        }
        else if (xField.type === "jsonb" && fieldSetId) {
            // for now we put it here; we could also put it deeper into convertValue/convertValueBase (so that it works for excel too) but there is a problem that we don't have "xFieldSetMaps" available
            // note: it would be nicer to take fieldSetId from xField but we would have to create a decorator on the backend...
            valueResult = <div className={multilineSwitchValue === "fewLines" || multilineSwitchValue === "allLines" ? "x-multiline-content" : undefined}>{XFieldSetBase.xFieldSetValuesAsUI(value, xFieldSetMaps[fieldSetId])}</div>;
        }
        else {
            if (textFormat === "html") {
                // value should be always string (xField.type === "string")
                valueResult = <HtmlRenderer htmlValue={value} renderType={multilineSwitchValue} fewLinesCount={props.multilineSwitchFewLinesCount!}/>;
            }
            else {
                // other types - convertValue returns a string
                // we have fromModel conversion turned on, because objects of type string come to us from json (e.g. for dates)
                valueResult = convertValue(xField, value, true, AsUIType.Form);
                // if we have multiline text and multilineSwitch set to more than 1 line (by default it is set to "allLines") we use MultilineRenderer
                if (textFormat === "multiline" && multilineSwitchValue !== "singleLine") {
                    if (xField.type === "string" && typeof valueResult === "string" && valueResult) {
                        const lines: string[] = valueResult.split(UtilsCommon.newLine);
                        valueResult = <MultilineRenderer valueList={lines} renderType={multilineSwitchValue} fewLinesCount={props.multilineSwitchFewLinesCount!} multilineContent={true}/>;
                    }
                }
            }
        }
        return valueResult;
    }

    const bodyTemplate = (columnProps: ColumnProps, rowData: any, xField: Field): ReactNode => {
        let bodyValue: ReactNode;
        const rowDataValue: any | any[] = UtilsCommon.getValueOrValueListByPath(rowData, columnProps.field);
        if (Array.isArray(rowDataValue)) {
            const elemList: ReactNode[] = rowDataValue.map((value: any) => valueAsUI(value, xField, columnProps.textFormat, columnProps.fieldSetId));
            bodyValue = <MultilineRenderer valueList={elemList} renderType={multilineSwitchValue} fewLinesCount={props.multilineSwitchFewLinesCount!}/>;
        }
        else {
            bodyValue = valueAsUI(rowDataValue, xField, columnProps.textFormat, columnProps.fieldSetId);
        }
        if (columnProps.className || columnProps.style) {
            bodyValue = <div className={columnProps.className} style={columnProps.style}>{bodyValue}</div>;
        }
        return bodyValue;
    }

    // in order that row expansion works like standard row, we wrap row expansion into div
    const rowExpansionTemplate = (row: any, options: DataTableRowExpansionTemplate): ReactNode => {
        return (
            <div onClick={() => setSelectedRow(row)} onDoubleClick={() => onRowDoubleClickBase(row)}>
                {props.rowExpansionTemplate!(row, options)}
            </div>
        );
    };

    // if we have scrollWidth/scrollHeight = viewport (default), we calculate scrollWidth/scrollHeight so that the table "fits" into the window (viewport)

    const isMobile: boolean = Utils.isMobile();

    let scrollWidthLocal: string | undefined = undefined; // horizontal scrolling turned off
    let scrollHeightLocal: string | undefined = undefined; // vertical scrolling turned off

    if (props.scrollable) {
        if (props.scrollWidth !== "none") {
            scrollWidthLocal = props.scrollWidth;
            if (scrollWidthLocal === "viewport") {
                scrollWidthLocal = `calc(100vw - ${isMobile ? 1 : 2.2}rem)`; // desktop - originally it was 1.4rem (20px margins) instead of 2.2 but with many columns a horizontal scrollbar appeared
                                                                        // mobile - padding 0.5rem of the body element
            }
        }

        if (props.scrollHeight !== "none") {
            scrollHeightLocal = props.scrollHeight;
            if (scrollHeightLocal === "viewport") {
                // the calculation is approximate, made for mobile, desktop may have a different one
                //const headerHeight = Utils.toPX0('12.7rem');
                //let footerHeight = Utils.toPX0('3.7rem') + Utils.toPX0('3rem'); // table footer (paging) + buttons Add row, Edit, ...
                // on desktop it doesn't want to subtract the taskbar height from window.screen.availHeight, so we solve it with this hack:
                // if (!Utils.isMobile()) {
                //     footerHeight += Utils.toPX0('6rem'); // approximate taskbar height (if I have 2 rows of buttons)
                // }
                let viewHeight: string;
                let headerFooterHeight: number;
                if (props.searchBrowseParams === undefined) {
                    // we are in a standard form
                    viewHeight = '100vh';
                    // experimentally determined height of header/footer
                    // it can be calculated as the height of the body (the whole page) - the height of the div that is scrolled (the div that has style="max-height: calc(100vh - 266.42px);)
                    // (need to subtract the paginator height and formFooterHeight (because those are subtracted below))
                    headerFooterHeight = Utils.toPX0('10.89rem');
                }
                else {
                    // we are in a dialog
                    if (isMobile) {
                        viewHeight = '98vh'; // .p-dialog for mobile has max-height: 98%
                        headerFooterHeight = Utils.toPX0('12.03rem'); // counted manually
                    }
                    else {
                        viewHeight = '90vh'; // .p-dialog for desktop has max-height: 90%
                        headerFooterHeight = Utils.toPX0('13.03rem'); // counted manually (desktop has a bigger margin at the bottom of the dialog)
                    }
                }
                // we add the paging height, if needed
                if (props.paginator) {
                    headerFooterHeight += Utils.toPX0('3.71rem');
                }
                // we also add the height of the source links, if needed
                if (props.formFooterHeight !== undefined) {
                    headerFooterHeight += Utils.toPX0(Utils.processGridBreakpoints(props.formFooterHeight));
                }
                scrollHeightLocal = `calc(${viewHeight} - ${headerFooterHeight}px)`;
            }
        }
    }

    let style: CSSProperties = {};
    if (scrollWidthLocal !== undefined) {
        style.width = scrollWidthLocal;
    }

    if (props.shrinkWidth) {
        style.maxWidth = 'min-content'; // if we don't set anything (leave auto), then (in case we don't have a horizontal scrollbar) it stretches the table to the full page width, which we don't want
    }

    // when moving from Primereact 6.x to 9.x, tableLayout changed from fixed to auto and setting column widths stopped working - temporarily like this
    let tableStyle: CSSProperties = {tableLayout: 'fixed'};
    if (props.width !== undefined) {
        let width: string = props.width;
        if (!isNaN(Number(width))) { // if width is number
            width = width + 'rem';
        }
        tableStyle = {...tableStyle, width: width};
    }

    // check
    if ((props.editMode === true || props.editMode === false) && props.editModeHandlers === undefined) {
        throw "LazyDataTable: for props.editMode = true/false, props.editModeHandlers must be defined.";
    }

    // we use both paginatorLeft and paginatorRight (even an empty one), so that the default paginator is in the center (without paginatorLeft the default paginator is shifted to the left and vice versa)
    // we also set the width of the divs in css to 10rem
    let paginatorLeft: ReactElement;
    let paginatorRight: ReactElement | undefined;
    let pageLinkSize: number;
    if (!isMobile) {
        paginatorLeft = <div>{localeOption('totalRecords')}: {value.totalRecords}</div>;
        paginatorRight = <div/>;
        pageLinkSize = 5; // default
        if (props.editMode === true) {
            paginatorRight = <div>
                <ButtonIconSmall icon="pi pi-save" onClick={() => props.editModeHandlers?.onSave()} tooltip="Save form"/>
                <ButtonIconSmall icon="pi pi-times" onClick={() => props.editModeHandlers?.onCancel()} tooltip="Cancel editing"/>
            </div>;
        }
        else if (props.editMode === false) {
            paginatorRight = <div>
                <ButtonIconSmall icon="pi pi-pencil" onClick={() => props.editModeHandlers?.onStart()} tooltip="Edit form"/>
            </div>;
        }
        // else - editMode is undefined - browse is not editable
    }
    else {
        // on mobile we save space
        paginatorLeft = <div style={{minWidth: '3rem'}}>{value.totalRecords}</div>;
        paginatorRight = <div style={{minWidth: '3rem'}}/>;
        pageLinkSize = 3;
    }

    const editFormExists: boolean = props.EditForm !== undefined || props.editFormElement !== undefined;

    let exportRows: boolean;
    if (props.searchBrowseParams !== undefined) {
        // for now we turn off export for search buttons
        exportRows = false;
    }
    else if (props.showExportRows !== undefined) {
        // we have explicitly defined whether yes or no
        exportRows = props.showExportRows;
    }
    else {
        // we display it only on desktop
        exportRows = !isMobile;
    }

    // for better readability we create the columns already here
    const columnElemList: ReactElement[] = Children.map(
        // props.children are columns of LazyDataTable
        // the column is rendered (Primereact DataTable column created) if viewStatus is not hidden and the column is not off via column toggle
        propsColumns.filter((child: ReactElement, index: number) => {
            const columnProps: ColumnProps = (child as {props: ColumnProps}).props;
            if (Utils.xViewStatus(columnProps.columnViewStatus) === ViewStatus.Hidden) {
                return false;
            }
            // columnToggles[index] === undefined -> treat as displayed (e.g. shorter array from older session)
            return columnToggles[index] !== false;
        }),
        function(child) {
            // if we want to change a child element, we need to either create a new one or clone it
            // an example is at https://soshace.com/building-react-components-using-children-props-and-context-api/
            // (we always have to manipulate the column, because we need to add filter={true} sortable={true}
            const childColumn = child as any as {props: ColumnProps}; // I couldn't do it more nicely...
            const xField: Field = UtilsMetadataCommon.getFieldByPath(xEntity, childColumn.props.field);

            // *********** header ***********
            const headerLabel = childColumn.props.header !== undefined ? childColumn.props.header : childColumn.props.field;
            let header;
            if (props.editMode === true) {
                header = <div>
                    <div>
                        <ButtonIconSmall icon="pi pi-plus" onClick={() => props.editModeHandlers?.onAddColumn(childColumn.props.field)} tooltip="Add column"/>
                        <ButtonIconSmall icon="pi pi-pencil" onClick={() => props.editModeHandlers?.onEditColumn(childColumn.props.field)} tooltip="Edit column"/>
                        <ButtonIconSmall icon="pi pi-trash" onClick={() => props.editModeHandlers?.onRemoveColumn(childColumn.props.field)} tooltip="Remove column"/>
                    </div>
                    <div>
                        <ButtonIconSmall icon="pi pi-chevron-left" onClick={() => props.editModeHandlers?.onMoveColumnLeft(childColumn.props.field)} tooltip="Move column left"/>
                        <ButtonIconSmall icon="pi pi-chevron-right" onClick={() => props.editModeHandlers?.onMoveColumnRight(childColumn.props.field)} tooltip="Move column right"/>
                    </div>
                    <div>{headerLabel}</div>
                </div>;
            }
            else {
                header = headerLabel;
            }

            // *********** filterElement ***********
            let betweenFilter: BetweenFilterProp = undefined;
            let filterElement:  ReactNode | ((options: ColumnFilterElementTemplateOptions) => ReactNode) | null = null;
            if (childColumn.props.filterElement !== undefined) {
                // if we use matchModeLabel and this special match mode is chosen then we use custom filter element
                // if we don't use matchModeLabel (undefined) then we use custom filter element always
                if ((childColumn.props.filterElement.matchModeLabel && getFilterMatchMode(childColumn.props.field) === ExtendedFilterMatchMode.FILTER_ELEMENT)
                        || childColumn.props.filterElement.matchModeLabel === undefined) {
                    filterElement = (options: ColumnFilterElementTemplateOptions): ReactNode => {
                        // the compiler complained that childColumn.props.filterElement can be undefined, that's why I added "!"
                        return childColumn.props.filterElement!.element({getFilterItem: getFilterItem, setFilterItem: setFilterItem, options: options, autoFilter: childColumn.props.autoFilter});
                    };
                }
            }
            if (filterElement === null) {
                if (getFilterMatchMode(childColumn.props.field) === ExtendedFilterMatchMode.AUTO_COMPLETE) {
                    let assocField: string | undefined = undefined; // path to manyToOne assoc
                    let displayField: string | string[] | undefined = undefined; // field/fields displayed in autocomplete (can be path)
                    // if childColumn.props.autoComplete = true, then autoComplete = undefined and default autocomplete is created
                    const autoComplete: AutoCompleteInFilterProps | undefined = (typeof childColumn.props.autoComplete === 'object' ? childColumn.props.autoComplete : undefined);
                    if (autoComplete) {
                        if (autoComplete.field) {
                            displayField = autoComplete.field;
                        }

                        if (autoComplete.assocField) {
                            // check - autoComplete.assocField must be prefix (part) of childColumn.props.field
                            if (!childColumn.props.field.startsWith(autoComplete.assocField + ".")) {
                                throw `Column with field "${childColumn.props.field}": autoComplete.assocField "${autoComplete.assocField}" is not prefix of the field`;
                            }
                            assocField = autoComplete.assocField;
                            if (displayField === undefined) {
                                // take displayField from childColumn.props.field (rest of the path)
                                displayField = childColumn.props.field.substring(autoComplete.assocField.length + 1);
                            }
                        }
                    }
                    if (assocField === undefined) {
                        // default - take assocField/displayField from childColumn.props.field
                        const [assocFieldTemp, displayFieldTemp] = UtilsCommon.getPathToAssocAndField(childColumn.props.field);
                        if (assocFieldTemp === null) {
                            throw `Column with field "${childColumn.props.field}": unexpected error - path of length >= 2 expected`;
                        }
                        assocField = assocFieldTemp;
                        if (displayField === undefined) {
                            displayField = displayFieldTemp;
                        }
                    }
                    const xAssoc: Assoc = UtilsMetadataCommon.getAssocToOneByPath(xEntity, assocField);
                    const object: any | null = getFilterValue(childColumn.props.field);
                    filterElement = <AutocompleteInput value={object}
                                                       onChange={(object: any, objectChange: OperationType) => setFilterValue(childColumn.props.field, object, undefined, object !== null ? [{
                                                           where: `[${assocField}] = ${object['id']}`,
                                                           params: {}
                                                       }] : undefined, childColumn.props.autoFilter)}
                                                       error={undefined} onErrorChange={(error: string | undefined) => {}}
                                                       idField="id" field={displayField!} itemTemplate={autoComplete?.itemTemplate} inputClassName={autoComplete?.inputClassName}
                                                       suggestionsQuery={{
                                                           entity: xAssoc.entityName,
                                                           filter: autoComplete?.filter,
                                                           sortField: autoComplete?.sortField,
                                                           fields: autoComplete?.fields
                                                       }}
                                                       SearchBrowse={autoComplete?.SearchBrowse} searchBrowseElement={autoComplete?.searchBrowseElement}
                                                       ValueForm={autoComplete?.ValueForm} valueFormElement={autoComplete?.valueFormElement}
                                                       addRowEnabled={false}
                                                       width="100%" scrollHeight={autoComplete?.scrollHeight}
                                                       suggestionsLoad="lazy"
                                                       lazyLoadMaxRows={autoComplete?.lazyLoadMaxRows}
                                                       minLength={autoComplete?.minLength}/>
                } else {
                    if (xField.type === "boolean") {
                        const checkboxValue: boolean | null = getFilterValue(childColumn.props.field);
                        filterElement = <TriStateCheckbox value={checkboxValue}
                                                          onChange={(e: any) => setFilterValue(childColumn.props.field, e.value, FilterMatchMode.EQUALS, undefined, childColumn.props.autoFilter)}/>;
                    } else if (childColumn.props.dropdownInFilter) {
                        const dropdownValue = getDropdownFilterValue(childColumn.props.field);
                        filterElement = <TableFilterSelectInput entity={props.entity} path={childColumn.props.field}
                                                           value={dropdownValue}
                                                           onValueChange={(field: string, displayValue: any) => onDropdownFilterChange(field, displayValue, childColumn.props.autoFilter)}
                                                           filter={childColumn.props.dropdownFilter}
                                                           sortField={childColumn.props.dropdownSortField}/>
                    } else if (xField.type === "string") {
                        const stringValue: string | null = getFilterValue(childColumn.props.field);
                        const xFilterMatchMode: ExtendedFilterMatchMode = getFilterMatchMode(childColumn.props.field);
                        filterElement = <TextInput value={stringValue}
                                                        onChange={(value: string | null) => setFilterValue(childColumn.props.field, value, undefined, undefined, childColumn.props.autoFilter)}
                                                        readOnly={xFilterMatchMode === ExtendedFilterMatchMode.IS_NOT_NULL || xFilterMatchMode === ExtendedFilterMatchMode.IS_NULL}/>
                    } else if (xField.type === "date" || xField.type === "datetime") {
                        betweenFilter = getBetweenFilter(childColumn.props.betweenFilter, props.betweenFilter);
                        if (betweenFilter !== undefined) {
                            // display: 'flex' places the DateInput elements next to each other
                            filterElement =
                                <div style={betweenFilter === "row" ? {display: 'flex'} : undefined}>
                                    <DateInput value={getFilterValue1(childColumn.props.field)}
                                               onChange={(value: Date | null) => setFilterValue1(childColumn.props.field, value, childColumn.props.autoFilter)}
                                               scale={xField.scale} datetime={xField.type === "datetime"}/>
                                    <DateInput value={getFilterValue2(childColumn.props.field)}
                                               onChange={(value: Date | null) => setFilterValue2(childColumn.props.field, value, childColumn.props.autoFilter)}
                                               scale={xField.scale} datetime={xField.type === "datetime"}/>
                                </div>;
                        } else {
                            const dateValue: Date | null = getFilterValue(childColumn.props.field);
                            filterElement = <DateInput value={dateValue}
                                                       onChange={(value: Date | null) => setFilterValue(childColumn.props.field, value, undefined, undefined, childColumn.props.autoFilter)}
                                                       scale={xField.scale} datetime={xField.type === "datetime"}/>
                        }
                    } else if (xField.type === "decimal" || xField.type === "number") {
                        const params = UtilsMetadata.getParamsForInputNumber(xField);
                        betweenFilter = getBetweenFilter(childColumn.props.betweenFilter, props.betweenFilter);
                        if (betweenFilter !== undefined) {
                            // display: 'flex' places the input elements one under the other (betweenFilter = "column") or next to each other (betweenFilter = "row")
                            filterElement =
                                <div style={{display: 'flex', flexDirection: betweenFilter}}>
                                    <NumberInput value={getFilterValue1(childColumn.props.field)}
                                                       onChange={(value: number | null) => setFilterValue1(childColumn.props.field, value, childColumn.props.autoFilter)} {...params}/>
                                    <NumberInput value={getFilterValue2(childColumn.props.field)}
                                                       onChange={(value: number | null) => setFilterValue2(childColumn.props.field, value, childColumn.props.autoFilter)} {...params}/>
                                </div>;
                        } else {
                            const numberValue: number | null = getFilterValue(childColumn.props.field);
                            filterElement = <NumberInput value={numberValue}
                                                               onChange={(value: number | null) => setFilterValue(childColumn.props.field, value, undefined, undefined, childColumn.props.autoFilter)} {...params}/>
                        }
                    }
                }
            } // if (filterElement === null)

            // ************** dataType **************
            // depending on the dataType of the column, suitable match modes are displayed in filter
            let dataType: "text" | "numeric" | "date" = "text";
            if (xField.type === "decimal" || xField.type === "number") {
                dataType = "numeric";
            }
            else if (xField.type === "date" || xField.type === "datetime") {
                dataType = "date";
            }

            // *********** showFilterMenu ***********
            let showFilterMenu: boolean;
            if (childColumn.props.showFilterMenu !== undefined) {
                showFilterMenu = childColumn.props.showFilterMenu;
            }
            else {
                showFilterMenu = true; // default
                if (props.filterDisplay === "row") {
                    if (xField.type === "boolean" || childColumn.props.dropdownInFilter || betweenFilter !== undefined) {
                        showFilterMenu = false;
                    }
                }
            }

            // *********** filterMatchModeOptions ***********
            // we use the same match mode lists like the default lists in primereact, but in case of ManyToOne assoc we add match mode for autocomplete
            let filterMatchModeOptions: ColumnFilterMatchModeOptions[] | undefined = undefined;
            if (showFilterMenu) {
                // copy of primereact code (ColumnFilter.js)
                //filterMatchModeOptions = primeReactContext.filterMatchModeOptions![dataType].map((key) => ({ label: primeLocaleOption(key), value: key }));
                filterMatchModeOptions = (primeReactContext && primeReactContext.filterMatchModeOptions![dataType].map((key) => ({ label: primeLocaleOption(key), value: key }))) ||
                                            PrimeReact.filterMatchModeOptions![dataType].map((key) => ({ label: primeLocaleOption(key), value: key }));

                filterMatchModeOptions.push({label: localeOption('xIsNotNull'), value: ExtendedFilterMatchMode.IS_NOT_NULL});
                filterMatchModeOptions.push({label: localeOption('xIsNull'), value: ExtendedFilterMatchMode.IS_NULL});
                if (isAutoCompleteInFilterEnabled(childColumn.props)) {
                    filterMatchModeOptions.push({label: localeOption('xAutoComplete'), value: ExtendedFilterMatchMode.AUTO_COMPLETE});
                }
                if (childColumn.props.filterElement?.matchModeLabel) {
                    filterMatchModeOptions.push({label: childColumn.props.filterElement?.matchModeLabel, value: ExtendedFilterMatchMode.FILTER_ELEMENT});
                }
            }

            // *********** showClearButton ***********
            // for filterDisplay = "row" we don't want a clear button, we want to save space
            let showClearButton: boolean = props.filterDisplay === "menu";

            // *********** body ***********
            let body;
            if (childColumn.props.body !== undefined) {
                body = childColumn.props.body;
            }
            else {
                body = (rowData: any) => {return bodyTemplate(childColumn.props, rowData, xField);};
            }

            // *********** width/headerStyle ***********
            let width: string | undefined = Utils.processPropWidth(childColumn.props.width);
            if (width === undefined || width === "default") {
                // TODO - if filter not used at all, then buttons flags should be false
                const filterMenuInFilterRow: boolean = props.filterDisplay === "row" && showFilterMenu;
                const filterButtonInHeader: boolean = props.filterDisplay === "menu";
                width = UtilsMetadata.computeColumnWidth(xField, betweenFilter, filterMenuInFilterRow, undefined, headerLabel, true, filterButtonInHeader);
            }
            let headerStyle: CSSProperties = {};
            if (width !== undefined) {
                headerStyle = {width: width};
            }

            // *********** align ***********
            let align: "left" | "center" | "right" | undefined = undefined; // default undefined (left)
            if (childColumn.props.align !== undefined && childColumn.props.align !== null) {
                align = childColumn.props.align;
            }
            else {
                // by default we align decimal to the right
                if (xField.type === "decimal") {
                    align = "right";
                }
                else if (xField.type === "boolean") {
                    align = "center";
                }
            }

            // *********** footer ***********
            let footer: any = undefined;
            if (childColumn.props.aggregateType && value.aggregateValues) {
                let aggregateValue: any = value.aggregateValues[childColumn.props.field];
                if (aggregateValue !== undefined && aggregateValue !== null) {
                    if (xField.type === "decimal" || xField.type === "number") {
                        // in the json file there are strings (a number in ""), we convert so that we change 123.45 to 123,45
                        aggregateValue = numberAsUI(numberFromModel(aggregateValue), xField.scale);
                    }
                }
                else {
                    aggregateValue = ""; // we don't have the data loaded yet
                }
                footer = aggregateValue;
            }

            return <PrimeColumn field={childColumn.props.field} header={header} footer={footer} filter={true} sortable={true}
                           filterElement={filterElement} dataType={dataType} showFilterMenu={showFilterMenu}
                           filterMatchModeOptions={filterMatchModeOptions} showClearButton={showClearButton} onFilterMatchModeChange={onFilterMatchModeChange}
                           body={body} headerStyle={headerStyle} align={align}/>;
        }
    );

    let addRowButton: ReactNode = null;
    if (props.onAddRow !== false && props.searchBrowseParams === undefined) { // onAddRow is not off (false) and browse is not in search mode
        if (Array.isArray(props.onAddRow)) {
            // more add row buttons
            addRowButton = props.onAddRow.map((addRowButtonItem: AddRowButton) => <Button key={addRowButtonItem.key} icon={addRowButtonItem.icon ?? "pi pi-plus"} label={addRowButtonItem.label} onClick={() => addRowButtonItem.onClick(selectedRow, filters, openFormForInsert)} style={addRowButtonItem.style}/>);
        }
        else if (editFormExists || typeof props.onAddRow === 'function') {
            // either EditForm/editFormElement or onAddRow (custom add row) used
            addRowButton = <Button key="addRow" icon="pi pi-plus" label={localeOption('addRow')} onClick={onClickAddRow}/>;
        }
    }

    // align-items-center centers vertically (shifts downward to the center)
    // x-lazy-datatable-label-right-compensation - offsets the label, so that items in the center go at least approximately to the center
    return (
        <div>
            {props.headerBodyTop ?
            <div className="flex justify-content-center align-items-center">
                {props.headerBodyTop}
            </div> : null}
            <div className="flex justify-content-center align-items-center">
                {props.label ? <div className="x-lazy-datatable-label" style={props.labelStyle}>{props.label}</div> : null}
                {props.headerBodyLeft}
                {ftsInputValue ? <FtsInput value={ftsInputValue} onChange={(value: FtsInputValue) => setFtsInputValue(value)} width={props.fullTextSearchWidth}/> : null}
                {props.showFilterButtons ? <Button key="filter" icon={isMobile ? "pi pi-search" : undefined} label={!isMobile ? localeOption('filter') : undefined} onClick={onClickFilter} /> : null}
                {props.showFilterButtons ? <Button key="resetTable" icon={isMobile ? "pi pi-ban" : undefined} label={!isMobile ? localeOption('resetTable') : undefined} onClick={onClickResetTable} /> : null}
                {props.optionalCustomFilters ? <OcfDropdown optionalCustomFilters={props.optionalCustomFilters} value={optionalCustomFilter} onChange={(value: OptionalCustomFilter | undefined) => setOptionalCustomFilter(value)} className="m-1"/> : null}
                {props.multilineSwitch ? <MultilineSwitch value={multilineSwitchValue} onChange={(switchValue: MultilineRenderType) => {
                        setMultilineSwitchValue(switchValue);
                        setupExpandedRows(value, switchValue);
                    }} className="m-1"/> : null}
                {props.headerBodyRight}
                {props.label && !isMobile ? <div className="x-lazy-datatable-label-right-compensation"/> : null}
                {props.showColumnToggleButton ? [
                    <div className="m-1"/>,
                    <ButtonIconSmall key="columnToggle" icon="pi pi-table" onClick={() => setColumnToggleDialogOpened(true)}
                                      tooltip={!Utils.isMobile() ? localeOption('columnToggle') : undefined}
                                      tooltipShowDelay={!Utils.isMobile() ? 1000 : undefined}/>
                ] : null}
            </div>
            <div className="flex justify-content-center">
                <DataTable value={value.rowList} dataKey={dataKey}
                           expandedRows={expandedRows} rowExpansionTemplate={props.rowExpansionTemplate ? rowExpansionTemplate : undefined}
                           paginator={props.paginator} pageLinkSize={pageLinkSize}
                           rows={rowsLocal} totalRecords={value.totalRecords}
                           lazy={true} first={first} onPage={onPage} loading={loading}
                           filterDisplay={props.filterDisplay} filters={filters} onFilter={onFilter}
                           sortMode="multiple" removableSort={true} multiSortMeta={multiSortMeta} onSort={onSort}
                           selectionMode="single" selection={selectedRow} onSelectionChange={onSelectionChange}
                           onRowDoubleClick={onRowDoubleClick} rowClassName={props.rowClassName}
                           ref={dataTableEl} className="p-datatable-sm x-lazy-datatable" resizableColumns columnResizeMode="expand" tableStyle={tableStyle}
                           paginatorLeft={paginatorLeft} paginatorRight={paginatorRight}
                           scrollable={props.scrollable} scrollHeight={scrollHeightLocal} style={style}>
                    {columnElemList}
                </DataTable>
            </div>
            <div className="flex justify-content-center">
                {addRowButton}
                {(props.onEditRow !== false && (editFormExists || props.onEditRow !== undefined)) && props.searchBrowseParams === undefined ? <Button key="editRow" icon="pi pi-pencil" label={localeOption('editRow')} onClick={onClickEditRow}/> : null}
                {(props.onRemoveRow !== false && (props.onRemoveRow !== undefined)) && props.searchBrowseParams === undefined ? <Button key="removeRow" icon="pi pi-times" label={localeOption('removeRow')} onClick={onClickRemoveRow}/> : null}
                {exportRows ? <Button key="exportRows" icon="pi pi-file-export" label={localeOption('exportRows')} onClick={onClickExport} /> : null}
                {props.docTemplates && !isMobile && props.searchBrowseParams === undefined ? <DocTemplateButton key="docTemplates" entity={props.entity} rowId={selectedRow ? selectedRow[dataKey] : undefined} docTemplates={typeof props.docTemplates === 'function' ? props.docTemplates : undefined}/> : null}
                {props.appButtonsForRow && props.searchBrowseParams === undefined ? props.appButtonsForRow.map((xAppButton: AppButtonForRow) => <Button key={xAppButton.key} icon={xAppButton.icon} label={xAppButton.label} onClick={() => onClickAppButtonForRow(xAppButton.onClick)} style={xAppButton.style}/>) : null}
                {props.searchBrowseParams === undefined ? props.appButtons : null}
                {props.searchBrowseParams !== undefined ? <Button key="choose" label={localeOption('chooseRow')} onClick={onClickChoose}/> : null}
                {editFormExists ? <FormDialog key="formDialog" dialogState={formDialogState} entity={props.entity}/> : null}
                {exportRows ? <ExportRowsDialog key="exportRowsDialog" dialogState={exportRowsDialogState} hideDialog={() => setExportRowsDialogState({dialogOpened: false})}/> : null}
                {props.showColumnToggleButton ?
                    <ColumnToggleDialog key="columnToggleDialog" dialogOpened={columnToggleDialogOpened}
                                     items={createColumnToggleDialogItems()} columnToggles={columnToggles}
                                     initColumnToggles={createInitColumnToggles()}
                                     onOk={onColumnTogglesOk}
                                     onHide={() => setColumnToggleDialogOpened(false)}/> : null}
            </div>
            {hasTextFormatHtml() ? <Editor style={{display: 'none'}} showHeader={false}/> : null /* we want to import css if needed (<style type="text/css" data-primereact-style-id="editor">) */}
        </div>
    );
});

// property filterElement is of type function, this functions returns custom filter input (e.g. AutoComplete, type ReactNode),
// setFilterItem is function that the custom filter input calls upon onChange - the function setFilterItem sets the selected filter value into "filters"
// and from "filters" goes the value to lazy service
// remark: this complicated way is used only to get filter value from custom filter input to "filters" in LazyDataTable
// remark2: filter value transfer "custom filter input" -> "filters" is (temporary?) only one way, if some third party changes filter value in "filters",
// the change will be not visible in custom filter input!
// remark3: autoFilter is just copy of column property autoFilter, should by send to setFilterItem as last param but the constant true/false can be also sent
export type GetFilterItem = (field: string) => DataTableFilterMetaData | DataTableOperatorFilterMetaData;
export type SetFilterItem = (field: string, filterItem: DataTableFilterMetaData | DataTableOperatorFilterMetaData, autoFilter: boolean) => void;
export type FilterElementParams = {getFilterItem: GetFilterItem; setFilterItem: SetFilterItem; options: ColumnFilterElementTemplateOptions; autoFilter: boolean};
export type FilterElementProp = {element: (params: FilterElementParams) => ReactNode; matchModeLabel?: string};

export type AutoCompleteInFilterProps = {
    // copy of some props in XAutoComplete (?)
    assocField?: string; // overrides default splitting of field prop (example: if field is "assocA.assocB.attrC", default assocField is "assocA.assocB", using this prop we can set assocField="assocA")
    filter?: CustomFilter;
    sortField?: string | DataTableSortMeta[];
    fields?: string[];
    // copy of some props in AutocompleteInput (?)
    lazyLoadMaxRows?: number; // max number of records that we load when suggestionsLoad = lazy
    field?: string | string[]; // field that we display in the input (one of the fields of the object from value/suggestions)
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => ReactNode; // used if we need some custom format of items (function defaultValue computes the default format)
    inputClassName?: string;
    SearchBrowse?: ComponentType<SearchBrowseProps>; // browse for searching row after clicking on search button
    searchBrowseElement?: ReactElement; // element version of SearchBrowse (for the case if additional (custom) props are needed)
    ValueForm?: ComponentType<FormProps>; // form for editing of the selected row and for adding new row; if ValueForm is undefined, autocomplete is not editable
    valueFormElement?: ReactElement; // element version of ValueForm (for the case if additional (custom) props are needed)
    minLength?: number; // Minimum number of characters to initiate a search (default 1)
    scrollHeight?: string; // Maximum height of the suggestions panel.
};

export interface ColumnProps {
    field: string;
    header?: any;
    align?: "left" | "center" | "right";
    dropdownInFilter?: boolean;
    dropdownFilter?: CustomFilter;
    dropdownSortField?: string;
    autoComplete?: AutoCompleteInFilterProps | true; // if autoComplete = true, the autocomplete is created automatically according to "field"
    //autoCompleteEnabled: true | false | "forStringOnly"; // default is "forStringOnly" (autocomplete enabled only on attributes of string type)
    showFilterMenu?: boolean;
    betweenFilter?: BetweenFilterProp | "noBetween"; // creates 2 inputs from to, only for type date/datetime/decimal/number implemented, "row"/"column" - position of inputs from to
    autoFilter: boolean; // if true, filtering starts immediately after setting filter value (user does not have to click the button Filter) (default false)
    width?: string; // for example 150px or 10rem or 10% (value 10 means 10rem)
    textFormat?: TextFormat; // multiline (output from MultilineTextField) - wraps the content; html (output from Editor) - for rendering raw html
    fieldSetId?: string; // in case that we render json attribute (output from XFieldSet), here is id of XFieldSet (saved in x_field_set_meta), fieldSet metadata is needed to get labels of field set attributes
                        // note: better solution would be take fieldSetId from json attribute from model, but we would have to create decorator for this purpose...
    aggregateType?: AggregateFunction;
    columnViewStatus: ViewStatusOrBoolean; // so that we can have a Hidden column (I didn't manage to "if-out" the column directly in the code), for now a function is not needed, it is called columnViewStatus because e.g. in an Edit table viewStatus can be at the row level
    initColumnToggle: boolean; // initial value for column toggle - if false, column is not displayed initially (user can display it via column toggle dialog) (default true)
    filterElement?: FilterElementProp;
    className?: string; // wraps the content of the column cell with div element with this className (prop is not applied if prop body is used)
    style?: CSSProperties; // wraps the content of the column cell with div element with this style (prop is not applied if prop body is used)
    body?: ReactNode | ((data: any, options: ColumnBodyOptions) => ReactNode); // the same type as type of property Column.body
}

export type ColumnType = {props: ColumnProps};

export const Column = (props: ColumnProps) => {
    // it doesn't matter that we return nothing here, we can read field and header and we would throw away the rest anyway because we create a new element
    return (null);
}

Column.defaultProps = {
    //autoCompleteEnabled: "forStringOnly",
    columnViewStatus: true,  // ViewStatus.ReadWrite
    initColumnToggle: true,
    autoFilter: false
};
