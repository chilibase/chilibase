import React from "react";
import {FormComponentDT, FormComponentDTProps} from "../form-data-table";
import {XAssoc} from "../../common/XEntityMetadata";
import {OperationType} from "../XUtils";
import {XError} from "../XErrors";
import {AutoCompleteBase, SuggestionsLoadProp} from "./AutoCompleteBase";
import {TableFieldFilterProp} from "../form-data-table";
import {XUtilsMetadataCommon} from "../../common/XUtilsMetadataCommon";
import {DataTableSortMeta} from "primereact/datatable";
import {FormProps} from "../form";
import {SearchBrowseProps} from "../lazy-data-table";

export interface AutoCompleteDTProps extends FormComponentDTProps {
    assocField: string;
    displayField: string | string[];
    itemTemplate?: (suggestion: any, index: number, createStringValue: boolean, defaultValue: (suggestion: any) => string) => React.ReactNode; // pouzivane ak potrebujeme nejaky custom format item-om (funkcia defaultValue rata default format)
    SearchBrowse?: React.ComponentType<SearchBrowseProps>; // browse for searching row after clicking on search button
    searchBrowseElement?: React.ReactElement; // element version of SearchBrowse (for the case if additional (custom) props are needed)
    AssocForm?: React.ComponentType<FormProps>; // form for editing of the selected row and for adding new row
    assocFormElement?: React.ReactElement; // element version of AssocForm (for the case if additional (custom) props are needed)
    dropdownButtonEnabled?: boolean; // ak dame false, tak nezobrazi dropdown button (default je true), ale ak by sme nemali mat ziadny button tak ho (zatial) zobrazime readOnly aby bolo vidno ze mame autocomplete
    suggestions?: any[]; // ak chceme overridnut suggestions ziskavane cez asociaciu
                        // poznamka: treba zabezpecit volanie setState, ak overridneme suggestions
                        // poznamka2: ak sa zmeni asociovany objekt cez "assocForm",
                        // tak treba nejako zabezpecit aby sa zmenili data aj v tychto overridnutych suggestions
                        // (pozri AutoCompleteBase.formDialogOnSaveOrCancel)
    suggestionsLoad?: SuggestionsLoadProp; // ak nemame suggestions, tak suggestionsLoad (resp. jeho default) urcuje ako sa nacitaju suggestions
    lazyLoadMaxRows?: number; // max pocet zaznamov ktore nacitavame pri suggestionsLoad = lazy
    splitQueryValue?: boolean;
    addRowEnabled: boolean; // ak dame false, tak nezobrazi insert button ani ked mame k dispozicii "valueForm" (default je true)
    minLength?: number; // Minimum number of characters to initiate a search (default 1)
    filter?: TableFieldFilterProp;
    sortField?: string | DataTableSortMeta[];
    fields?: string[]; // ak chceme pri citani suggestions nacitat aj asociovane objekty
    scrollHeight?: string; // Maximum height of the suggestions panel.
    inputClassName?: string;
}

export class AutoCompleteDT extends FormComponentDT<AutoCompleteDTProps> {

    protected xAssoc: XAssoc;
    protected errorInBase: string | undefined; // sem si odkladame info o nevalidnosti AutoCompleteBase (nevalidnost treba kontrolovat na stlacenie Save)

    constructor(props: AutoCompleteDTProps) {
        super(props);

        this.xAssoc = XUtilsMetadataCommon.getXAssocToOne(XUtilsMetadataCommon.getXEntity(props.entity), props.assocField);
        this.errorInBase = undefined;

        this.onChangeAutoCompleteBase = this.onChangeAutoCompleteBase.bind(this);
        this.onErrorChangeAutoCompleteBase = this.onErrorChangeAutoCompleteBase.bind(this);
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
            // TODO - fieldLabel
            return {field: this.getField(), xError: {onChange: this.errorInBase, fieldLabel: undefined}};
        }
        // zavolame povodnu metodu
        return super.validate();
    }

    render() {
        const xEntityAssoc = XUtilsMetadataCommon.getXEntity(this.xAssoc.entityName);
        //const xDisplayField = XUtilsMetadataCommon.getXFieldByPath(xEntityAssoc, this.props.displayField);

        // TODO - size
        //const size = this.props.size ?? xDisplayField.length;

        // div className="col" nam zabezpeci aby AutoCompleteBase nezaberal celu dlzku grid-u (ma nastaveny width=100% vdaka "formgroup-inline")
        return (
            <AutoCompleteBase value={this.getValue()} onChange={this.onChangeAutoCompleteBase}
                               field={this.props.displayField} itemTemplate={this.props.itemTemplate}
                               SearchBrowse={this.props.SearchBrowse} searchBrowseElement={this.props.searchBrowseElement}
                               ValueForm={this.props.AssocForm} valueFormElement={this.props.assocFormElement}
                               dropdownButtonEnabled={this.props.dropdownButtonEnabled}
                               idField={xEntityAssoc.idField} readOnly={this.isReadOnly()}
                               error={this.getError()} onErrorChange={this.onErrorChangeAutoCompleteBase}
                               suggestions={this.props.suggestions} suggestionsLoad={this.props.suggestionsLoad} lazyLoadMaxRows={this.props.lazyLoadMaxRows} splitQueryValue={this.props.splitQueryValue}
                               addRowEnabled={this.props.addRowEnabled} minLength={this.props.minLength} scrollHeight={this.props.scrollHeight}
                               suggestionsQuery={{entity: this.xAssoc.entityName, filter: () => this.getFilterBase(this.props.filter), sortField: this.props.sortField, fields: this.props.fields}}
                               inputClassName={this.props.inputClassName}/>
        );
    }
}
