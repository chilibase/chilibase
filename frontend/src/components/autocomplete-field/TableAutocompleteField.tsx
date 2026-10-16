import React, {type ReactElement, type ReactNode, type ComponentType} from "react";
import {TableFormField, type TableFormFieldProps} from "../detail-data-table";
import type {Assoc} from "../../common/EntityMetadata";
import {OperationType} from "../../utils/types";
import type {FieldError} from "../form/FormErrors";
import {AutocompleteInput, type SuggestionsLoadProp} from "./AutocompleteInput";
import type {TableFieldFilterProp} from "../detail-data-table";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import type {DataTableSortMeta} from "primereact/datatable";
import type {FormProps} from "../form";
import type {SearchBrowseProps} from "../lazy-data-table";

export interface TableAutocompleteFieldProps extends TableFormFieldProps {
    assocField: string;
    displayField: string | string[];
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => ReactNode; // used when we need some custom format for items (the defaultValue function computes the default format)
    SearchBrowse?: ComponentType<SearchBrowseProps>; // browse for searching row after clicking on search button
    searchBrowseElement?: ReactElement; // element version of SearchBrowse (for the case if additional (custom) props are needed)
    AssocForm?: ComponentType<FormProps>; // form for editing of the selected row and for adding new row
    assocFormElement?: ReactElement; // element version of AssocForm (for the case if additional (custom) props are needed)
    dropdownButtonEnabled?: boolean; // if set to false, the dropdown button is not shown (default is true), but if we would have no button at all then we (for now) show it readOnly so it is visible that we have an autocomplete
    suggestions?: any[]; // if we want to override suggestions obtained through the association
                        // note: we need to ensure setState is called if we override suggestions
                        // note2: if the associated object changes through "assocForm",
                        // we need to somehow ensure that the data in these overridden suggestions change as well
                        // (see AutocompleteInput.formDialogOnSaveOrCancel)
    suggestionsLoad?: SuggestionsLoadProp; // if we do not have suggestions, then suggestionsLoad (or its default) determines how suggestions are loaded
    lazyLoadMaxRows?: number; // max number of rows loaded when suggestionsLoad = lazy
    splitQueryValue?: boolean;
    addRowEnabled: boolean; // if set to false, the insert button is not shown even when "valueForm" is available (default is true)
    minLength?: number; // Minimum number of characters to initiate a search (default 1)
    filter?: TableFieldFilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // if we want to also load associated objects when reading suggestions
    scrollHeight?: string; // Maximum height of the suggestions panel.
    inputClassName?: string;
}

export class TableAutocompleteField extends TableFormField<TableAutocompleteFieldProps> {

    protected xAssoc: Assoc;
    protected errorInInput: string | undefined; // we store here info about invalidity of AutocompleteInput (invalidity needs to be checked on pressing Save)

    constructor(props: TableAutocompleteFieldProps) {
        super(props);

        this.xAssoc = UtilsMetadataCommon.getAssocToOne(UtilsMetadataCommon.getEntity(props.entity), props.assocField);
        this.errorInInput = undefined;

        this.onChangeAutocompleteInput = this.onChangeAutocompleteInput.bind(this);
        this.onErrorChangeAutocompleteInput = this.onErrorChangeAutocompleteInput.bind(this);
    }

    // componentDidMount() {
    // }

    getField(): string {
        return this.props.assocField;
    }

    isNotNull(): boolean {
        return !this.xAssoc.isNullable;
    }

    getValue(): any | null {
        const assocObject: any | null = this.getValueFromRowData();
        return assocObject;
    }

    onChangeAutocompleteInput(object: any, objectChange: OperationType) {
        this.onValueChangeBase(object, this.props.onChange, objectChange);
    }

    onErrorChangeAutocompleteInput(error: string | undefined) {
        this.errorInInput = error; // we store the error
    }

    // overrides method in FormField
    validate(): {field: string; fieldError: FieldError} | undefined {
        if (this.errorInInput) {
            // we put the error message on onChange, we could also put it on onSet (previously onBlur), it is more or less the same
            // TODO - fieldLabel
            return {field: this.getField(), fieldError: {onChange: this.errorInInput, fieldLabel: undefined}};
        }
        // we call the original method
        return super.validate();
    }

    render() {
        const xEntityAssoc = UtilsMetadataCommon.getEntity(this.xAssoc.entityName);
        //const xDisplayField = XUtilsMetadataCommon.getXFieldByPath(xEntityAssoc, this.props.displayField);

        // TODO - size
        //const size = this.props.size ?? xDisplayField.length;

        // div className="col" ensures that AutocompleteInput does not take the whole length of the grid (it has width=100% set thanks to "formgroup-inline")
        return (
            <AutocompleteInput value={this.getValue()} onChange={this.onChangeAutocompleteInput}
                               field={this.props.displayField} itemTemplate={this.props.itemTemplate}
                               SearchBrowse={this.props.SearchBrowse} searchBrowseElement={this.props.searchBrowseElement}
                               ValueForm={this.props.AssocForm} valueFormElement={this.props.assocFormElement}
                               dropdownButtonEnabled={this.props.dropdownButtonEnabled}
                               idField={xEntityAssoc.idField} readOnly={this.isReadOnly()}
                               error={this.getError()} onErrorChange={this.onErrorChangeAutocompleteInput}
                               suggestions={this.props.suggestions} suggestionsLoad={this.props.suggestionsLoad} lazyLoadMaxRows={this.props.lazyLoadMaxRows} splitQueryValue={this.props.splitQueryValue}
                               addRowEnabled={this.props.addRowEnabled} minLength={this.props.minLength} scrollHeight={this.props.scrollHeight}
                               suggestionsQuery={{entity: this.xAssoc.entityName, filter: () => this.getFilterBase(this.props.filter), sortField: this.props.sortField, fields: this.props.fields}}
                               inputClassName={this.props.inputClassName}/>
        );
    }
}
