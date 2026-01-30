import React from "react";
import {FilterProp, FormComponent, FormComponentProps} from "../form";
import {Assoc} from "../../common/EntityMetadata";
import {OperationType} from "../XUtils";
import {AutoCompleteBase, SuggestionsLoadProp} from "./AutoCompleteBase";
import {XError} from "../XErrors";
import {DataTableSortMeta} from "primereact/datatable";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import {FormProps} from "../form";
import {SearchBrowseProps} from "../lazy-data-table";

export interface AutoCompleteProps extends FormComponentProps {
    assocField: string; // can be also path (e.g. <assoc1>.<assoc2> - autocomplete will run on <assoc2>)
    displayField: string | string[];
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => React.ReactNode; // pouzivane ak potrebujeme nejaky custom format item-om (funkcia defaultValue rata default format)
    SearchBrowse?: React.ComponentType<SearchBrowseProps>; // browse for searching row after clicking on search button
    searchBrowseElement?: React.ReactElement; // element version of SearchBrowse (for the case if additional (custom) props are needed)
    AssocForm?: React.ComponentType<FormProps>; // form for editing of the selected row and for adding new row
    assocFormElement?: React.ReactElement; // element version of AssocForm (for the case if additional (custom) props are needed)
    dropdownButtonEnabled?: boolean; // ak dame false, tak nezobrazi dropdown button (default je true), ale ak by sme nemali mat ziadny button tak ho (zatial) zobrazime readOnly aby bolo vidno ze mame autocomplete
    insertButtonTooltip?: string;
    updateButtonTooltip?: string;
    searchButtonTooltip?: string;
    suggestions?: any[]; // ak chceme overridnut suggestions ziskavane cez asociaciu (pozri poznamky v AutoCompleteDT) (suggestionsLoad sa nepouziva)
    suggestionsLoad?: SuggestionsLoadProp; // ak nemame suggestions, tak suggestionsLoad (resp. jeho default) urcuje ako sa nacitaju suggestions
    lazyLoadMaxRows?: number; // max pocet zaznamov ktore nacitavame pri suggestionsLoad = lazy
    splitQueryValue?: boolean;
    minLength?: number; // Minimum number of characters to initiate a search (default 1)
    filter?: FilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // ak chceme pri citani suggestions nacitat aj asociovane objekty
    width?: string;
    scrollHeight?: string; // Maximum height of the suggestions panel.
    inputClassName?: string;
    inputStyle?: React.CSSProperties;
    setFocusOnCreate?: boolean; // ak je true, nastavi focus do inputu po vytvoreni komponentu
}

export class AutoComplete extends FormComponent<AutoCompleteProps> {

    protected xAssoc: Assoc;
    protected errorInBase: string | undefined; // sem si odkladame info o nevalidnosti AutoCompleteBase (nevalidnost treba kontrolovat na stlacenie Save)

    constructor(props: AutoCompleteProps) {
        super(props);

        this.xAssoc = UtilsMetadataCommon.getAssocToOneByPath(UtilsMetadataCommon.getEntity(props.form.getEntity()), props.assocField);
        this.errorInBase = undefined;

        this.onChangeAutoCompleteBase = this.onChangeAutoCompleteBase.bind(this);
        this.onErrorChangeAutoCompleteBase = this.onErrorChangeAutoCompleteBase.bind(this);

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

    onChangeAutoCompleteBase(object: any, objectChange: OperationType) {
        this.onValueChangeBase(object, this.props.onChange, objectChange);
    }

    onErrorChangeAutoCompleteBase(error: string | undefined) {
        this.errorInBase = error; // odlozime si error
    }

    // overrides method in XFormComponent
    validate(): {field: string; xError: XError} | undefined {
        if (this.errorInBase) {
            // error message dame na onChange, mohli by sme aj na onSet (predtym onBlur), je to jedno viac-menej
            return {field: this.getField(), xError: {onChange: this.errorInBase, fieldLabel: this.getLabel()}};
        }
        // zavolame povodnu metodu
        return super.validate();
    }

    render() {

        const xEntityAssoc = UtilsMetadataCommon.getEntity(this.xAssoc.entityName);

        // div className="col" nam zabezpeci aby AutoCompleteBase nezaberal celu dlzku grid-u (ma nastaveny width=100% vdaka "formgroup-inline")
        return (
            <div className="field grid">
                <label htmlFor={this.props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <AutoCompleteBase value={this.getValue()} onChange={this.onChangeAutoCompleteBase}
                                   field={this.props.displayField} itemTemplate={this.props.itemTemplate}
                                   SearchBrowse={this.props.SearchBrowse} searchBrowseElement={this.props.searchBrowseElement}
                                   ValueForm={this.props.AssocForm} valueFormElement={this.props.assocFormElement}
                                   dropdownButtonEnabled={this.props.dropdownButtonEnabled}
                                   insertButtonTooltip={this.props.insertButtonTooltip}
                                   updateButtonTooltip={this.props.updateButtonTooltip}
                                   searchButtonTooltip={this.props.searchButtonTooltip}
                                   idField={xEntityAssoc.idField} readOnly={this.isReadOnly()}
                                   error={this.getError()} onErrorChange={this.onErrorChangeAutoCompleteBase}
                                   width={this.props.width} scrollHeight={this.props.scrollHeight}
                                   suggestions={this.props.suggestions} suggestionsLoad={this.props.suggestionsLoad} lazyLoadMaxRows={this.props.lazyLoadMaxRows} splitQueryValue={this.props.splitQueryValue} minLength={this.props.minLength}
                                   suggestionsQuery={{entity: this.xAssoc.entityName, filter: () => this.getFilterBase(this.props.filter), sortField: this.props.sortField, fields: this.props.fields}}
                                   inputClassName={this.props.inputClassName} setFocusOnCreate={this.props.setFocusOnCreate}/>
            </div>
        );
    }
}