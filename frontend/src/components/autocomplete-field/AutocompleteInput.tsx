import React, {Component, type ReactElement, type ReactNode, type ComponentType, createRef, type FocusEvent} from "react";
import {AutoComplete, type AutoCompleteChangeEvent} from "primereact/autocomplete";
import {SplitButton} from "primereact/splitbutton";
import {OperationType, type Query} from "../../utils/types";
import {Utils} from "../../utils/Utils";
import {Button as PrimeButton} from "primereact/button";
import type {MenuItem, MenuItemCommandEvent} from "primereact/menuitem";
import {type SearchBrowseParams, SearchBrowseDialog, type SearchBrowseDialogState} from "../browse";
import type {CustomFilter, LazyAutoCompleteSuggestionsRequest} from "../../common/FindParam";
import type {DataTableSortMeta} from "primereact/datatable";
import type {FindResult} from "../../common/FindResult";
import {UtilsCommon} from "../../common/UtilsCommon";
import type {Entity} from "../../common/EntityMetadata";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import {FormDialog, type FormDialogState} from "../form";
import type {FormProps} from "../form";
import type {SearchBrowseProps} from "../lazy-data-table";

// helper
interface ButtonItem {
    icon: any | undefined;
    tooltip?: string;
    command(event: MenuItemCommandEvent): void;
}

// type of suggestions load from DB:
// suggestions - custom suggestions from parent component - no DB load used
// eager - in this.componentDidMount(), before user starts searching (this type can save some requests to DB during user typing (usually several ms))
// onSerachStart (default) - suggestions are being loaded (always) when user starts typing or when user clicks on dropdown button (only one request is invoked in compare to lazy load)
// lazy - suggestions are being loaded always when user types some character (at least "minLength" characters must be typed), only first "lazyLoadMaxRows" rows are loaded, if there is more rows then special row ... is added, (default for "lazyLoadMaxRows" is 10)
//      -> this options must be used in the case if large amount of suggestions can be loaded
export type SuggestionsLoadProp = "eager" | "onSearchStart" | "lazy";
export type SuggestionsLoadType = "suggestions" | SuggestionsLoadProp;

export interface AutocompleteInputProps {
    value: any;
    onChange: (object: any, objectChange: OperationType) => void; // passes the selected object; if the selected object was changed through the dialog (also in the DB), it returns objectChange !== OperationType.None
    suggestions?: any[]; // if suggestions are provided directly, suggestionsLoad and suggestionsQuery are not used (exception: if we also have searchBrowse, then we send the filter (and sortField?) into searchBrowse)
    suggestionsEntity?: string; // if suggestions are provided directly, suggestionsLoad and suggestionsQuery are not used and the entity can be specified here - the entity is needed to look up XFields (those are needed to convert the value of attribute "field" into a string); if we do not specify the entity, dates for example are converted incorrectly (only via toString)
    suggestionsLoad?: SuggestionsLoadProp; // if we do not have suggestions, we use suggestionsLoad (or its default) and suggestionsQuery (that one must be specified)
    suggestionsQuery?: Query; // must be specified if suggestions are not provided (note: filter (and sortField?) are sent into searchBrowse)
    lazyLoadMaxRows: number; // max number of rows loaded when suggestionsLoad = lazy
    field: string | string[]; // field displayed in the input (one of the fields of the object from value/suggestions)
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => ReactNode; // used when we need some custom format for items (the defaultValue function computes the default format)
    splitQueryValue: boolean; // if true, splits the typed value by space and all partial values must occur in the given suggestion (default is true)
    SearchBrowse?: ComponentType<SearchBrowseProps>; // browse for searching row after clicking on search button
    searchBrowseElement?: ReactElement; // element version of SearchBrowse (for the case if additional (custom) props are needed)
    ValueForm?: ComponentType<FormProps>; // form for editing of the selected row and for adding new row; if ValueForm is undefined, autocomplete is not editable
    valueFormElement?: ReactElement; // element version of ValueForm (for the case if additional (custom) props are needed)
    idField?: string; // id field (attribute name) of the object from value/suggestions - needed when opening the form for editing; the form needs the id to load/update the row from the DB
    addRowEnabled: boolean; // if set to false, the insert button is not shown even when "valueForm" is available (default is true)
    onAddRow?: (inputValue: string) => void; // override of the handler attached to the "plus" button (the question is whether to somehow push the created/obtained row into this autocomplete - not for now)
    dropdownButtonEnabled: boolean; // if set to false, the dropdown button is not shown (default is true), but if we would have no button at all then we (for now) show it readOnly so it is visible that we have an autocomplete
    insertButtonTooltip?: string;
    updateButtonTooltip?: string;
    searchButtonTooltip?: string;
    minLength?: number; // Minimum number of characters to initiate a search (default 1)
    buttonsLayout: "splitButton" | "buttons";
    width?: string;
    maxWidth?: string;
    scrollHeight?: string; // Maximum height of the suggestions panel.
    inputClassName?: string;
    readOnly?: boolean;
    error?: string; // error message, if we want to mark the field as invalid (warning! do not put the error from onErrorCahnge here, AutocompleteInput handles that itself)
    onErrorChange: (error: string | undefined) => void; // "output" for the validation error that AutocompleteInput "reports"; the error should be reported whenever this.state.inputChanged = true (and the input does not have focus)
    setFocusOnCreate?: boolean; // if true, sets focus into the input after the component is created
}

export class AutocompleteInput extends Component<AutocompleteInputProps> {

    private static valueMoreSuggestions: string = "...";

    public static defaultProps = {
        lazyLoadMaxRows: 10,
        splitQueryValue: true,
        addRowEnabled: true,
        dropdownButtonEnabled: true,
        minLength: 1,
        buttonsLayout: "buttons",
        scrollHeight: '15rem'   // primereact has 200px
    };

    autoCompleteRef: any;
    autoCompleteInputRef: any;

    state: {
        inputChanged: boolean; // flag whether the user changed the value in the input by typing
        inputValueState: string | undefined; // used only if inputChanged === true; the changed value in the input is stored here
        notValid: boolean; // true if the autocomplete is in an inconsistent state - the user typed something into the input based on which we cannot select an existing value
                            // (the typed value matches 2 or more items or no item) and the user left the input
                            // if true, the input is red
                            // the change is reported via onErrorChange to the parent; the parent should ensure that if we have some invalid autocomplete, the form cannot be saved on pressing Save
        suggestions: any[] | undefined; // used if suggestionsLoad = eager or onSearchStart, not used if we have this.props.suggestions or suggestionsLoad = lazy
        filteredSuggestions: any[] | undefined;
        formDialogState: FormDialogState;
        searchBrowseDialogState: SearchBrowseDialogState;
    };

    suggestionsLoadedForOSS: boolean; // helper flag - we record here whether we have already called loadSuggestions if we use suggestionsLoad = onSearchStart
    wasOnChangeCalled: boolean; // helper flag - bug fix for when onChange was called twice
                                // - once from onBlur - if the user by typing "selected" exactly one row into the suggestions dropdown
                                // and a second time from onSelect when the user clicked this one "selected" row

    xEntity: Entity | undefined;

    constructor(props: AutocompleteInputProps) {
        super(props);

        this.autoCompleteRef = createRef();
        this.autoCompleteInputRef = createRef();

        this.state = {
            inputChanged: false,
            inputValueState: undefined,
            notValid: false,
            suggestions: undefined,
            filteredSuggestions: undefined,
            formDialogState: {opened: false},
            searchBrowseDialogState: {opened: false}
        };

        this.suggestionsLoadedForOSS = false;
        this.wasOnChangeCalled = false;

        let entity: string | undefined;
        if (this.getSuggestionsLoadType() === "suggestions") {
            // if (this.props.suggestionsEntity === undefined) {
            //     throw "If prop suggestions is used, then also prop suggestionsEntity must be defined.";
            // }
            entity = this.props.suggestionsEntity;
        }
        else {
            if (this.props.suggestionsQuery === undefined) {
                throw "prop suggestionsQuery must be defined. (prop suggestions is not used)";
            }
            entity = this.props.suggestionsQuery.entity;
        }
        this.xEntity = entity ? UtilsMetadataCommon.getEntity(entity) : undefined;

        this.completeMethod = this.completeMethod.bind(this);
        this.onChange = this.onChange.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.onBlur = this.onBlur.bind(this);
        this.itemTemplate = this.itemTemplate.bind(this);
        this.itemTemplateString = this.itemTemplateString.bind(this);
        this.computeDefaultDisplayValue = this.computeDefaultDisplayValue.bind(this);
        this.formDialogOnSaveOrCancel = this.formDialogOnSaveOrCancel.bind(this);
        this.searchDialogOnChoose = this.searchDialogOnChoose.bind(this);
        this.searchDialogOnHide = this.searchDialogOnHide.bind(this);
    }

    hasSearchBrowse(): boolean {
        return this.props.SearchBrowse !== undefined || this.props.searchBrowseElement !== undefined;
    }

    hasValueForm(): boolean {
        return this.props.ValueForm !== undefined || this.props.valueFormElement !== undefined;
    }

    getSuggestionsLoadType(): SuggestionsLoadType {
        let suggestionsLoadType: SuggestionsLoadType;
        if (this.props.suggestions) {
            suggestionsLoadType = "suggestions";
        }
        else if (!this.props.suggestionsLoad) {
            suggestionsLoadType = "onSearchStart"; // default
        }
        else {
            suggestionsLoadType = this.props.suggestionsLoad;
        }
        return suggestionsLoadType;
    }

    // helper
    getFields(): string[] {
        return Array.isArray(this.props.field) ? this.props.field : [this.props.field];
    }

    getFirstField(): string {
        return this.getFields()[0];
    }

    componentDidMount() {
        if (this.getSuggestionsLoadType() === "eager") {
            this.loadSuggestions();
        }
        if (this.props.setFocusOnCreate) {
            this.setFocusToInput();
        }
    }

    async loadSuggestions() {
        const suggestions: any[] = await this.fetchSuggestions();
        this.setState({suggestions: suggestions});
    }

    async fetchSuggestions(): Promise<any[]> {
        if (!this.props.suggestionsQuery) {
            throw `AutocompleteInput.loadSuggestions: unexpected error - prop suggestionsQuery is undefined`;
        }
        return Utils.fetchRows(
            this.props.suggestionsQuery.entity,
            Utils.evalFilter(this.props.suggestionsQuery.filter),
            this.getSortField(),
            this.props.suggestionsQuery.fields
        );
    }

    getSortField(): string | DataTableSortMeta[] | undefined {
        let sortField: string | DataTableSortMeta[] | undefined = this.props.suggestionsQuery!.sortField;
        if (!sortField) {
            // only for non-lazy we use the first displayField as the default sort
            // for lazy it slows down selects in the case that the LIMIT clause significantly restricts the resulting suggestions list
            // for lazy we sort on the frontend in AutocompleteInput
            if (this.getSuggestionsLoadType() !== "lazy") {
                sortField = this.getFirstField();
            }
        }
        return sortField;
    }

    async completeMethod(event: {query: string;}) {
        let filteredSuggestions: any[];
        const suggestionsLoadType: SuggestionsLoadType = this.getSuggestionsLoadType();
        if (suggestionsLoadType !== "lazy") {
            let suggestions: any[];
            if (suggestionsLoadType === "suggestions") {
                suggestions = this.props.suggestions!;
            }
            else if (suggestionsLoadType === "eager") {
                suggestions = this.state.suggestions!;
            }
            else if (suggestionsLoadType === "onSearchStart") {
                if (!this.suggestionsLoadedForOSS) {
                    suggestions = await this.fetchSuggestions();
                    // we store it
                    this.setState({suggestions: suggestions});
                    this.suggestionsLoadedForOSS = true; // if the user keeps typing, we do not want to load suggestions again
                }
                else {
                    // already loaded
                    suggestions = this.state.suggestions!;
                }
            }
            else {
                throw 'Unexpected error - unknown xSuggestionsLoadType';
            }
            if (!event.query.trim().length) {
                // input is empty - the call here happens if the user opens the dropdown via the dropdown button
                filteredSuggestions = [...suggestions];
            }
            else {
                const queryNormalized = Utils.normalizeString(event.query);
                // if we have multiple values separated by space, each value must occur separately
                // (similar principle as for lazy, or full text search - see backend lazyAutoCompleteSuggestions or XMainQueryData.createFtsWhereItem)
                let queryNormalizedList: string[];
                if (this.props.splitQueryValue) {
                    queryNormalizedList = queryNormalized.split(' ').filter((value: string) => value !== ''); // we do not want possible empty strings ''
                }
                else {
                    queryNormalizedList = [queryNormalized]; // we do not split
                }
                filteredSuggestions = suggestions.filter((suggestion) => {
                    const fieldValue: string = this.itemTemplateString(suggestion);
                    // special null item (empty object) - we put the test after the fieldValue === undefined test - for performance
                    if (fieldValue === undefined && Object.keys(suggestion).length === 0) {
                        return false;
                    }
                    const fieldValueNormalized: string = Utils.normalizeString(fieldValue);
                    // all partial query values must match
                    let match: boolean = true;
                    for (const queryItemNormalized of queryNormalizedList) {
                        // look for substring
                        if (fieldValueNormalized.indexOf(queryItemNormalized) === -1) {
                            match = false;
                            break;
                        }
                    }
                    return match;
                });
            }
        }
        else {
            // ************* lazy ***************

            // in the backend SELECT we use the clause LIMIT <maxRows + 1>
            // if we find fewer than <maxRows + 1> rows then we know we found all of them
            // if we find exactly <maxRows + 1> rows, at the end we show the user a special item "..."
            // which warns them that there are more rows matching the condition
            // quirk - if the query is very broad (the select without LIMIT <maxRows + 1> would return many rows),
            // such a select is very cheap (a few ms) - it is enough to find the first e.g. 20 rows matching the condition, i.e. no full-table scan is needed
            // but that holds only if we do not use ORDER BY - when using ORDER BY it does a full-table scan (filters) and then sorts
            // this can be avoided with a special select:
            // select t.* from (select t0.* from table t0 order by t0.<attr1>) t where <full-text-condition> limit 20
            // (first sorts and only then filters the first 20 rows - the assumption is that we have an index on t0.<attr1> so it sorts quickly)
            // we can add this special select in the future (on the backend) if we want to support (fast) sorting in the DB for autocomplete

            if (!this.props.suggestionsQuery) {
                throw `AutocompleteInput.loadSuggestions: unexpected error - prop suggestionsQuery is undefined`;
            }
            let filter: CustomFilter | undefined = Utils.evalFilter(this.props.suggestionsQuery.filter);
            const suggestionsRequest: LazyAutoCompleteSuggestionsRequest = {
                maxRows: this.props.lazyLoadMaxRows + 1,
                fullTextSearch: {fields: this.getFields(), value: event.query.trim(), splitValue: this.props.splitQueryValue, matchMode: "contains"},
                entity: this.props.suggestionsQuery.entity,
                filterItems: UtilsCommon.createCustomFilterItems(filter),
                multiSortMeta: UtilsCommon.createMultiSortMeta(this.getSortField()),
                fields: this.props.suggestionsQuery.fields
            };
            const findResult: FindResult = await Utils.fetchOne('x-lazy-auto-complete-suggestions', suggestionsRequest);
            filteredSuggestions = findResult.rowList!;
            // if we did not sort in the DB (which is an expensive operation) then we sort now
            // (itemTemplateString is called twice but for those approx. 20 rows it is ok)
            if (this.props.suggestionsQuery.sortField === undefined) {
                filteredSuggestions = UtilsCommon.arraySort(filteredSuggestions, this.itemTemplateString);
            }
            // if we have 1 row more than lazyLoadMaxRows, we change the last row to ...
            // TODO - it would be better to drop the last row and show the label ... in the footer (problems with possible selection of the pseudo-row would go away)
            if (filteredSuggestions.length > this.props.lazyLoadMaxRows) {
                filteredSuggestions[filteredSuggestions.length - 1] = AutocompleteInput.valueMoreSuggestions; // for now directly a string
            }
        }

        this.setState({filteredSuggestions: filteredSuggestions});
    }

    onChange(e: AutoCompleteChangeEvent) {
        if (typeof e.value === 'string' && !AutocompleteInput.isMoreSuggestions(e.value)) {
            this.setState({inputChanged: true, inputValueState: e.value});
            this.wasOnChangeCalled = false; // reset to the default value
        }
    }

    onSelect(e: any) {
        // we do not call this.setObjectValue if it was already called from onBlur
        if (!this.wasOnChangeCalled) {
            // we do not allow selecting the special row ...
            if (!AutocompleteInput.isMoreSuggestions(e.value)) {
                this.setObjectValue(e.value, OperationType.None);
                // if we are on mobile, we do not want the mobile keyboard to open, therefore we call removeFocus
                // we use setTimeout, a direct call did not work
                if (Utils.isMobile()) {
                    setTimeout(() => {
                        this.removeFocusFromInput();
                    }, 0); // Delaying blur to allow PrimeReact to finish its focus logic
                }
            }
        }
    }

    onBlur(e: FocusEvent<HTMLInputElement>) {
        // optimization - we test only if inputChanged === true
        if (this.state.inputChanged) {
            if (e.target.value === '') {
                this.setObjectValue(null, OperationType.None); // an empty string means a null value
            } else {

                // we try whether filteredSuggestions have exactly one element
                const filteredSuggestions = this.state.filteredSuggestions;
                if (filteredSuggestions && filteredSuggestions.length === 1) {
                    this.setObjectValue(filteredSuggestions[0], OperationType.None);
                    // if this this.setObjectValue was triggered by a click into the suggestions dropdown,
                    // onSelect will still be called afterwards and there we want to prevent calling this.setObjectValue,
                    // therefore we set this flag
                    // we set the flag back to false if the user starts doing anything with the autocomplete (starts typing into it or clicks the dropdown)
                    this.wasOnChangeCalled = true;
                }
                else {
                    // here we could try to compute the result for filteredSuggestions once more, maybe the filteredSuggestions computation has not finished yet
                    // we could: show all allowed values (in a dialog/in the dropdown list), show some alert

                    //alert("invalid value");

                    // we would like to stop further events (e.g. pressing a button that caused the loss of focus), but it did not work for us
                    //e.preventDefault();
                    //e.stopPropagation();

                    // this does not work either
                    //console.log('stop propagation');
                    //console.log(e);
                    //e.nativeEvent.stopImmediatePropagation();
                    //e.preventDefault();

                    // we show the dropdown list to let the user know they should select some value
                    // this is not very practical if we have many items in the dropdown - a confirm whether to add a new item to the DB would probably be better
                    // I removed it, because when selecting from the dropdown by click this onBlur is called (still before onSelect), a different dropdown is shown than the user sees and a different item is selected than the one the user clicked
                    //this.autoCompleteRef.current.onDropdownClick();

                    // we return focus to the input
                    // an ordinary setting of focus does not work, focus has to be set in a separate event
                    // TODO - also try some stop event
                    //console.log('onBlur - setting timeout');
                    //setTimeout(() => {this.onBlurInvalidInput();}, 100);

                    // newest approach
                    // TODO - problem - if I type some characters and select some row, a red flash occurs (only the subsequent onSelect clears state.notValid = true)
                    // unfortunately I cannot distinguish an event caused by selecting a row and an event caused by clicking somewhere beside
                    //console.log(e);
                    this.setState({notValid: true}); // we make the input red
                    this.props.onErrorChange(this.createErrorMessage()); // we report invalidity to the parent
                }
            }
        }
        // we are leaving the input, we reset the flag - if the user starts working with the autocomplete, suggestions are loaded from the DB (if we have suggestionsLoad = onSearchStart)
        // we want to load suggestions, because the user may change another attribute that affects the autocomplete filter -> we want a new suggestions list
        this.suggestionsLoadedForOSS = false;
    }

    createErrorMessage(): string {
        return `Value "${this.state.inputValueState}" was not found among valid values.`;
    }

/*
    onBlurInvalidInput() {
        // if the user triggered onBlur by clicking an item of the dropdown list, then within 100 ms (the delay of calling onBlurInvalidInput()) onSelect was called,
        // inputChanged changed and nothing needs to be handled
        if (this.state.inputChanged) {
            console.log('onBlurInvalidInput - going to open confirm');
            if (window.confirm(`Value "${this.state.inputValueState}" was not found among valid values, create new valid value?`)) {
                // we open the dialog for insert
                this.formDialogObjectId = undefined;
                // TODO - add as a new prop a method that will have parameter this.state.inputValueState and will return an object
                // if this method is undefined, this original functionality will remain
                this.formDialogInitValuesForInsert = {};
                this.formDialogInitValuesForInsert[this.props.field] = this.state.inputValueState;
                this.setState({formDialogOpened: true});
            }
            else {
                // we return focus to the input, there is an invalid value there
                console.log('onBlurInvalidInput - going to return focus');
                this.setFocusToInput();
            }
        }
    }
*/

    setFocusToInput() {
        //this.autoCompleteRef.current.focus(); this used to be here
        this.autoCompleteInputRef.current.focus();
    }

    removeFocusFromInput() {
        this.autoCompleteInputRef.current.blur();
    }

    setObjectValue(object: any, objectChange: OperationType) {
        this.setState({inputChanged: false, notValid: false});
        this.props.onChange(object, objectChange);
        this.props.onErrorChange(undefined); // we are no longer in an invalid state
    }

    formDialogOnSaveOrCancel(object: any | null, objectChange: OperationType) {
        if (object !== null) {
            // if it was a save, this new object needs to be used
            this.setObjectValue(object, objectChange);
            // if we use the list this.state.suggestions, we reread it
            // note: if we use this.props.suggestions from the parent, the parent must reread the list itself!
            if (objectChange !== OperationType.None) {
                // the volunteer row changed in the DB
                // for now we only refresh from the DB
                // if the request were slow, on insert (new id) / update (existing id) we can adjust the list and thereby save a request to the DB
                this.loadSuggestions();
            }
            // do we need to adjust this.state.filteredSuggestions? we set a new object, the suggestions panel should be closed - TODO - verify
        }
        else {
            // it was cancel, we return focus to the input if needed
            if (this.state.inputChanged) {
                this.setFocusToInput();
            }
        }
        const formDialogState: FormDialogState = {opened: false};
        this.setState({formDialogState: formDialogState});
    }

    searchDialogOnChoose(chosenRow: any) {
        const searchBrowseDialogState: SearchBrowseDialogState = {opened: false};
        this.setState({searchBrowseDialogState: searchBrowseDialogState});
        // we write the selected row into the object
        this.setObjectValue(chosenRow, OperationType.None);
    }

    searchDialogOnHide() {
        const searchBrowseDialogState: SearchBrowseDialogState = {opened: false};
        this.setState({searchBrowseDialogState: searchBrowseDialogState});
        // if we have an invalid value in the input, we return the cursor to the input
        if (this.state.inputChanged) {
            this.setFocusToInput();
        }
    }

    createInsertItem(buttonItems: ButtonItem[]) {

        buttonItems.push(
            {
                icon: 'pi pi-plus',
                tooltip: !Utils.isMobile() ? this.props.insertButtonTooltip : undefined,
                command: (e: any) => {
                    if (this.props.onAddRow) {
                        // we have a custom handler for the "plus" button
                        // if we have an invalid value, we pass it (an attempt to be user friendly) - TODO - if we are not in an invalid state
                        let inputValue: string = "";
                        if (this.state.inputChanged) {
                            inputValue = this.state.inputValueState!;
                        }
                        this.props.onAddRow(inputValue);
                    }
                    else {
                        // we open the dialog for insert
                        const initValues: any = {};
                        // if we have an invalid value, we prefill it (an attempt to be user friendly)
                        if (this.state.inputChanged) {
                            initValues[this.getFirstField()] = this.state.inputValueState;
                        }
                        const formDialogState: FormDialogState = {
                            opened: true,
                            id: undefined,
                            initValues: initValues,
                            onSaveOrCancel: this.formDialogOnSaveOrCancel
                        };
                        this.setState({formDialogState: formDialogState});
                    }
                }
            });
    }

    createUpdateItem(buttonItems: ButtonItem[]) {
        buttonItems.push(
            {
                icon: 'pi pi-pencil',
                tooltip: !Utils.isMobile() ? this.props.updateButtonTooltip : undefined,
                command: (e: any) => {
                    if (this.state.inputChanged) {
                        alert(`Value "${this.state.inputValueState}" was not found among valid values, please enter some valid value.`);
                        this.setFocusToInput();
                    } else {
                        if (this.props.value === null) {
                            alert('Please select some row.');
                        } else {
                            this.onEditAssocValue();
                        }
                    }
                }
            });
        // we will not support remove, it is technically problematic - we cannot delete the row from the DB because of the FK constraint
        // {
        //     icon: 'pi pi-times',
        //     command: (e: any) => {
        //         console.log('remove');
        //     }
        // },
    }

    createSearchItem(buttonItems: ButtonItem[]) {

        buttonItems.push(
            {
                icon: 'pi pi-search',
                tooltip: !Utils.isMobile() ? this.props.searchButtonTooltip : undefined,
                command: (e: any) => {
                    const searchBrowseDialogState: SearchBrowseDialogState = {
                        opened: true,
                        searchBrowseParams: this.createSearchBrowseParams()
                    };
                    this.setState({searchBrowseDialogState: searchBrowseDialogState});
                }
            });
    }

    createDropdownItem(buttonItems: ButtonItem[]) {

        buttonItems.push(
            {
                icon: 'pi pi-chevron-down',
                command: (e: any) => {
                    // shows the whole suggestions list, useful if we want to see all options
                    // impractical if we have many items in the suggestions list

                    // nicely displays the whole object!
                    // this.autoCompleteRef.current is the element <AutoComplete .../>, which we create in the render method
                    //console.log(this.autoCompleteRef.current);

                    // opens the dropdown (search is a method described in the API, we copied the call from the primereact sources)
                    // if (this.props.onSearchStart) {
                    //     this.props.onSearchStart(() => this.finishSearchStart(e));
                    // }
                    // this.autoCompleteRef.current.search(e, '', 'dropdown');
                    this.onOpenDropdown(e);
                }
            });
    }

    onOpenDropdown(e: any) {
        this.openDropdown(e);
        this.suggestionsLoadedForOSS = false; // the user may have filled in something that changes the filter and is going to work with the autocomplete again, we load suggestions again (suggestionsLoad = onSearchStart)
        this.wasOnChangeCalled = false; // reset to the default value
    }

    openDropdown(e: any) {
        // opens the dropdown (search is a method described in the API, we copied the call from the primereact sources)
        this.autoCompleteRef.current.search(e, '', 'dropdown');
    }

    onEditAssocValue() {
        // we open the dialog for update
        if (this.props.idField === undefined) {
            throw "AutocompleteInput: property valueForm is defined but property idField is also needed for form editation.";
        }
        const formDialogState: FormDialogState = {
            opened: true,
            id: this.props.value[this.props.idField],
            initValues: undefined,
            onSaveOrCancel: this.formDialogOnSaveOrCancel
        };
        this.setState({formDialogState: formDialogState});
    }

    // returns an object (if inputChanged === false) or a string (if inputChanged === true)
    computeInputValue(): any {
        let inputValue;
        if (!this.state.inputChanged) {
            // note: if object === null then an empty string must be written into the input; if we used null, the change in the model to null would not show up
            const object = this.props.value;
            inputValue = (object !== null) ? this.computeItemTemplate(object, -1, true) : ""; // TODO - is "" ok?
        }
        else {
            inputValue = this.state.inputValueState;
        }
        return inputValue;
    }

    itemTemplate(suggestion: any, index: number): ReactNode {
        return this.computeItemTemplate(suggestion, index, false);
    }

    // used to create the value for the input (the selected row) and also for possible sorting and filtering on the frontend (if we do not use lazy loading)
    itemTemplateString(suggestion: any): string {
        const itemValue: ReactNode = this.computeItemTemplate(suggestion, -1, true);
        if (typeof itemValue !== "string") {
            throw `AutocompleteInput: function of the property itemTemplate created non-string value for suggestion. Please create string value if parameter createStringValue = true.`;
        }
        return itemValue;
    }

    computeItemTemplate(suggestion: any, index: number, createStringValue: boolean): ReactNode {
        let itemTemplate: ReactNode;
        // handling of the special item ... we put it here so it does not have to be handled elsewhere
        if (AutocompleteInput.isMoreSuggestions(suggestion)) {
            itemTemplate = suggestion;
        }
        else {
            if (this.props.itemTemplate) {
                itemTemplate = this.props.itemTemplate(suggestion, index, createStringValue, this.computeDefaultDisplayValue);
            } else {
                itemTemplate = this.computeDefaultDisplayValue(suggestion);
            }
        }
        return itemTemplate;
    }

    computeDefaultDisplayValue(suggestion: any): string {
        let displayValue: string;
        if (AutocompleteInput.isMoreSuggestions(suggestion)) {
            displayValue = suggestion;
        }
        else {
            displayValue = UtilsCommon.createDisplayValue(suggestion, this.xEntity, this.getFields());
        }
        return displayValue;
    }

    // returns true if it is the special type AutocompleteInput.valueMoreSuggestions
    static isMoreSuggestions(suggestion: any): boolean {
        return typeof suggestion === "string" && suggestion === AutocompleteInput.valueMoreSuggestions;
    }

    // this way via a method, maybe the method is called only when the dialog opens and we save something...
    createSearchBrowseParams(): SearchBrowseParams {
        return {
            onChoose: this.searchDialogOnChoose,
            displayFieldFilter: (this.state.inputChanged ? {field: this.getFirstField(), constraint: {value: this.state.inputValueState, matchMode: "contains"}} : undefined),
            customFilter: this.props.suggestionsQuery?.filter
        };
    }

    render() {

        const readOnly: boolean = this.props.readOnly ?? false;

        let buttons: ReactElement[];
        if (!readOnly) {
            const createInsertItem: boolean = (this.props.addRowEnabled && (this.hasValueForm() || this.props.onAddRow !== undefined));
            // TODO - clean up because of the split layout (if dropdownButtonEnabled = false a split button with a single button can arise)
            if (createInsertItem || this.hasValueForm() || this.hasSearchBrowse()) {
                // we have searchBrowse or CRUD operations, we need more buttons or a SplitButton
                const buttonItems: ButtonItem[] = [];

                if (createInsertItem) {
                    this.createInsertItem(buttonItems);
                }

                if (this.hasValueForm()) {
                    this.createUpdateItem(buttonItems);
                }

                if (this.hasSearchBrowse()) {
                    this.createSearchItem(buttonItems);
                }

                if (this.props.dropdownButtonEnabled) {
                    this.createDropdownItem(buttonItems);
                }

                if (this.props.buttonsLayout === "buttons") {
                    buttons = buttonItems.map((value: ButtonItem, index: number) => <PrimeButton key={`button${index}`} icon={value.icon} tooltip={value.tooltip} tooltipOptions={value.tooltip ? {position: 'top'} : undefined}
                                                                              onClick={(e: any) => value.command!(e)} className={'x-dropdownbutton' + Utils.mobileCssSuffix()}/>);
                }
                else {
                    // buttonsLayout === "splitButton"
                    // tooltips should be added...
                    const splitButtonItems: MenuItem[] = buttonItems.map<MenuItem>((value: ButtonItem) => {return {icon: value.icon, command: value.command}});
                    buttons = [<SplitButton model={splitButtonItems} className={'x-splitbutton-only-dropdown' + Utils.mobileCssSuffix()} menuClassName={'x-splitbutton-only-dropdown-menu' + Utils.mobileCssSuffix()} disabled={readOnly}/>];
                }
            }
            else {
                // we have only 1 operation - we use a simple button
                buttons = [<PrimeButton icon="pi pi-chevron-down" onClick={(e: any) => this.onOpenDropdown(e)} className={'x-dropdownbutton' + Utils.mobileCssSuffix()} disabled={!this.props.dropdownButtonEnabled}/>];
            }
        }
        else {
            // readOnly
            // if we have valueForm and we have an associated object, we allow editing the associated object
            if (this.hasValueForm() && this.props.value !== null) {
                buttons = [<PrimeButton icon="pi pi-pencil"
                                        tooltip={!Utils.isMobile() ? this.props.updateButtonTooltip : undefined}
                                        tooltipOptions={!Utils.isMobile() ? {position: 'top'} : undefined}
                                        onClick={(e: any) => this.onEditAssocValue()} className={'x-dropdownbutton' + Utils.mobileCssSuffix()}/>];
            }
            else {
                // we use a disabled button (for aesthetic reasons, we keep the width)
                buttons = [<PrimeButton icon="pi pi-chevron-down" className={'x-dropdownbutton' + Utils.mobileCssSuffix()} disabled={true}/>];
            }
        }

        // we compute inputValue
        const inputValue = this.computeInputValue();

        let error: string | undefined;
        if (this.state.notValid) {
            // if it is in an invalid state, this error message takes precedence over the others (if there happen to be any)
            error = this.createErrorMessage();
        }
        else {
            error = this.props.error;
        }

        // formgroup-inline sticks the SplitButton to the autocomplete and aligns its height
        return (
            <div className="x-auto-complete-base" style={{width: this.props.width, maxWidth: this.props.maxWidth}}>
                <AutoComplete value={inputValue} suggestions={this.state.filteredSuggestions} completeMethod={this.completeMethod} itemTemplate={this.itemTemplate}
                              onChange={this.onChange} onSelect={this.onSelect} onBlur={this.onBlur} minLength={this.props.minLength} scrollHeight={this.props.scrollHeight}
                              ref={this.autoCompleteRef} inputRef={this.autoCompleteInputRef} readOnly={readOnly} disabled={readOnly} {...Utils.createTooltipOrErrorProps(error)} inputClassName={this.props.inputClassName}
                              showEmptyMessage={true}/>
                {...buttons}{/* when there was only {buttons} without ..., it printed the message Warning: Each child in a list should have a unique "key" prop. */}
                {this.hasValueForm() ?
                    <FormDialog key="dialog-form" dialogState={this.state.formDialogState} Form={this.props.ValueForm} formElement={this.props.valueFormElement} entity={this.xEntity!.name}/>
                    : undefined}
                {this.hasSearchBrowse() && !readOnly ?
                    <SearchBrowseDialog key="dialog-browse" dialogState={this.state.searchBrowseDialogState} SearchBrowse={this.props.SearchBrowse} searchBrowseElement={this.props.searchBrowseElement} onHide={this.searchDialogOnHide}/>
                    : undefined}
            </div>
        );
    }
}
