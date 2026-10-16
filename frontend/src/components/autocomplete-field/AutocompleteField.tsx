import React, {type ReactElement, type ReactNode, type ComponentType, type CSSProperties} from "react";
import {type FilterProp, FormField, type FormFieldProps} from "../form";
import type {Assoc} from "../../common/EntityMetadata";
import {OperationType} from "../../utils/types";
import {AutocompleteInput, type SuggestionsLoadProp} from "./AutocompleteInput";
import type {FieldError} from "../form/FormErrors";
import type {DataTableSortMeta} from "primereact/datatable";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import type {FormProps} from "../form";
import type {SearchBrowseProps} from "../lazy-data-table";

export interface AutocompleteFieldProps extends FormFieldProps {
    assocField: string; // can be also path (e.g. <assoc1>.<assoc2> - autocomplete will run on <assoc2>)
    displayField: string | string[];
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => ReactNode; // used when we need some custom format for items (the defaultValue function computes the default format)
    SearchBrowse?: ComponentType<SearchBrowseProps>; // browse for searching row after clicking on search button
    searchBrowseElement?: ReactElement; // element version of SearchBrowse (for the case if additional (custom) props are needed)
    AssocForm?: ComponentType<FormProps>; // form for editing of the selected row and for adding new row
    assocFormElement?: ReactElement; // element version of AssocForm (for the case if additional (custom) props are needed)
    dropdownButtonEnabled?: boolean; // if set to false, the dropdown button is not shown (default is true), but if we would have no button at all then we (for now) show it readOnly so it is visible that we have an autocomplete
    insertButtonTooltip?: string;
    updateButtonTooltip?: string;
    searchButtonTooltip?: string;
    suggestions?: any[]; // if we want to override suggestions obtained through the association (see notes in TableAutocompleteField) (suggestionsLoad is not used)
    suggestionsLoad?: SuggestionsLoadProp; // if we do not have suggestions, then suggestionsLoad (or its default) determines how suggestions are loaded
    lazyLoadMaxRows?: number; // max number of rows loaded when suggestionsLoad = lazy
    splitQueryValue?: boolean;
    minLength?: number; // Minimum number of characters to initiate a search (default 1)
    filter?: FilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // if we want to also load associated objects when reading suggestions
    width?: string;
    scrollHeight?: string; // Maximum height of the suggestions panel.
    inputClassName?: string;
    inputStyle?: CSSProperties;
    setFocusOnCreate?: boolean; // if true, sets focus into the input after the component is created
}

export class AutocompleteField extends FormField<AutocompleteFieldProps> {

    protected xAssoc: Assoc;
    protected errorInInput: string | undefined; // we store here info about invalidity of AutocompleteInput (invalidity needs to be checked on pressing Save)

    constructor(props: AutocompleteFieldProps) {
        super(props);

        this.xAssoc = UtilsMetadataCommon.getAssocToOneByPath(UtilsMetadataCommon.getEntity(props.form.getEntity()), props.assocField);
        this.errorInInput = undefined;

        this.onChangeAutocompleteInput = this.onChangeAutocompleteInput.bind(this);
        this.onErrorChangeAutocompleteInput = this.onErrorChangeAutocompleteInput.bind(this);

        props.form.addField(props.assocField + '.' + this.getFirstDisplayField());
    }

    // componentDidMount() {
    // }

    getField(): string {
        return this.props.assocField;
    }

    isNotNull(): boolean {
        return !this.xAssoc.isNullable;
    }

    getFirstDisplayField(): string {
        return Array.isArray(this.props.displayField) ? this.props.displayField[0] :this.props.displayField;
    }

    getValue(): any | null {
        const assocObject: any | null = this.getValueFromObject();
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
            return {field: this.getField(), fieldError: {onChange: this.errorInInput, fieldLabel: this.getLabel()}};
        }
        // we call the original method
        return super.validate();
    }

    render() {

        const xEntityAssoc = UtilsMetadataCommon.getEntity(this.xAssoc.entityName);

        // div className="col" ensures that AutocompleteInput does not take the whole length of the grid (it has width=100% set thanks to "formgroup-inline")
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <AutocompleteInput value={this.getValue()} onChange={this.onChangeAutocompleteInput}
                                   field={this.props.displayField} itemTemplate={this.props.itemTemplate}
                                   SearchBrowse={this.props.SearchBrowse} searchBrowseElement={this.props.searchBrowseElement}
                                   ValueForm={this.props.AssocForm} valueFormElement={this.props.assocFormElement}
                                   dropdownButtonEnabled={this.props.dropdownButtonEnabled}
                                   insertButtonTooltip={this.props.insertButtonTooltip}
                                   updateButtonTooltip={this.props.updateButtonTooltip}
                                   searchButtonTooltip={this.props.searchButtonTooltip}
                                   idField={xEntityAssoc.idField} readOnly={this.isReadOnly()}
                                   error={this.getError()} onErrorChange={this.onErrorChangeAutocompleteInput}
                                   width={this.props.width} scrollHeight={this.props.scrollHeight}
                                   suggestions={this.props.suggestions} suggestionsLoad={this.props.suggestionsLoad} lazyLoadMaxRows={this.props.lazyLoadMaxRows} splitQueryValue={this.props.splitQueryValue} minLength={this.props.minLength}
                                   suggestionsQuery={{entity: this.xAssoc.entityName, filter: () => this.getFilterBase(this.props.filter), sortField: this.props.sortField, fields: this.props.fields}}
                                   inputClassName={this.props.inputClassName} setFocusOnCreate={this.props.setFocusOnCreate}/>
            </div>
        );
    }
}
