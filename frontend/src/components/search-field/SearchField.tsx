import React, {type ReactElement, type CSSProperties, createRef, cloneElement} from "react";
import {InputText} from "primereact/inputtext";
import {Button} from "primereact/button";
import {Utils} from "../../utils/Utils";
import {Dialog} from "primereact/dialog";
import {type FilterProp, FormField, type FormFieldProps} from "../form";
import type {Assoc} from "../../common/EntityMetadata";
import type {CustomFilter} from "../../common/FindParam";
import type {SearchBrowseParams} from "../browse";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";
import {UtilsCommon} from "../../common/UtilsCommon";

// faast-style zoom button - when the user writes something into the input and leaves - if exactly 1 row is found it sets it, if more rows are found it opens searchBrowse
// it is (no longer) used on any project (it was once used on BudgetLineForm), AutocompleteField is probably enough for us
// TODO - if it is to be used, change searchBrowse and assocForm (used for readOnly) to SearchBrowse/searchBrowseElement and AssocForm/assocFormElement and do not use FormNavigator

export interface SearchFieldProps extends FormFieldProps {
    assocField: string;
    displayField: string;
    searchBrowse: ReactElement;
    assocForm?: ReactElement;
    filter?: FilterProp;
    size?: number;
    inputStyle?: CSSProperties;
}

export class SearchField extends FormField<SearchFieldProps> {

    protected xAssoc: Assoc;

    inputTextRef: any;

    state: {
        inputChanged: boolean; // flag whether the user changed the value in the input by typing
        inputValueState: any; // used only if inputChanged === true; the changed value in the input is stored here
        dialogOpened: boolean;
    };

    constructor(props: SearchFieldProps) {
        super(props);

        this.xAssoc = UtilsMetadataCommon.getAssocToOne(UtilsMetadataCommon.getEntity(props.form.getEntity()), props.assocField);

        this.inputTextRef = createRef();
        // ORIGINAL CODE
        //this.overlayPanelEl = createRef();

        this.state = {
            inputChanged: false,
            inputValueState: null,
            dialogOpened: false
        };

        props.form.addField(props.assocField + '.' + props.displayField);
    }

    getField(): string {
        return this.props.assocField;
    }

    isNotNull(): boolean {
        return !this.xAssoc.isNullable;
    }

    render() {
        const props = this.props;

        const xEntityAssoc = UtilsMetadataCommon.getEntity(this.xAssoc.entityName);
        const xDisplayField = UtilsMetadataCommon.getFieldByPath(xEntityAssoc, props.displayField);

        // hooks used to be here...
        const inputChanged: boolean = this.state.inputChanged;
        const setInputChanged = (inputChanged: boolean) => {this.setState({inputChanged: inputChanged});}

        const inputValueState: any = this.state.inputValueState;
        const setInputValueState = (inputValueState: any) => {this.setState({inputValueState: inputValueState});}

        const dialogOpened: boolean = this.state.dialogOpened;
        const setDialogOpened = (dialogOpened: boolean) => {this.setState({dialogOpened: dialogOpened});}

        const computeInputValue = (): any => {
            let inputValue;
            if (!inputChanged) {
                // TODO - add the field type via a generic (if possible)
                // note: if assocObject === null then an empty string must be written into the input; if we used null, the change in the model to null would not show up
                const assocObject = this.getValueFromObject();
                inputValue = (assocObject !== null) ? assocObject[props.displayField] : "";
            }
            else {
                inputValue = inputValueState;
            }
            return inputValue;
        }

        const size = props.size ?? xDisplayField.length;

        const onInputValueChange = (e: any) => {
            setInputChanged(true);
            setInputValueState(e.target.value);
        }

        const onInputBlur = async (e: any) => {
            // optimization - we test only if inputChanged === true
            if (inputChanged) {
                //console.log('onBlur = ' + e.target.value + ' - going to test');
                // TODO - maybe it is better to find out the entity behind the association already on the client - for now like this (x-find-rows-for-assoc)
                if (e.target.value === '' || e.target.value === undefined || e.target.value === null) {
                    setValueToModel(null); // an empty string means a null value
                } else {
                    // deprecated code
                    // const rows: any[] = await Utils.fetchMany('x-find-rows-for-assoc', {
                    //     entity: props.form.entity,
                    //     assocField: props.assocField,
                    //     displayField: props.displayField,
                    //     filter: e.target.value
                    // });
                    const displayFieldFilter: CustomFilter = {where: `[${props.displayField}] LIKE :xDisplayFieldValue`, params: {"xDisplayFieldValue": `${e.target.value}%`}};
                    const customFilter: CustomFilter | undefined = this.getFilterBase(this.props.filter);
                    const rows: any[] = await Utils.fetchRows(this.xAssoc.entityName, UtilsCommon.filterAnd(displayFieldFilter, customFilter));
                    if (rows.length === 0) {
                        // ORIGINAL CODE
                        //overlayPanelEl.current.toggle(e);
                        setDialogOpened(true);
                    } else if (rows.length === 1) {
                        // we set the found row
                        setValueToModel(rows[0]);
                        setInputChanged(false);
                    } else {
                        // ORIGINAL CODE
                        //overlayPanelEl.current.toggle(e);
                        setDialogOpened(true);
                    }
                }
            }
        }

        const setValueToModel = (row: any) => {
            this.onValueChangeBase(row, this.props.onChange);
            setInputChanged(false);
        }

        const onClickSearch = (e: any) => {
            //console.log("onClickSearch called");
            if (!this.isReadOnly()) {
                setDialogOpened(true);
                // ORIGINAL CODE
                //overlayPanelEl.current.toggle(e);
            } else {
                if (props.assocForm !== undefined) {
                    const assocObject = this.getValueFromObject();
                    // QUESTION - obtain the id directly from the root object? but then it has to be added to the root object
                    const id = (assocObject !== null) ? assocObject[xEntityAssoc.idField] : null;
                    // by cloning the element we add the attribute id
                    const assocForm = cloneElement(props.assocForm as ReactElement<any>, {id: id}/*, props.assocForm.children*/);
                    (props.form.props as any).openForm(assocForm);
                }
            }
        }

        const onChoose = (chosenRow: any) => {
            //console.log("onChoose called");
            // we close the search dialog
            // ORIGINAL CODE
            //overlayPanelEl.current.hide();
            setDialogOpened(false);
            // we write the selected row into the object
            setValueToModel(chosenRow);
        }

        const onHide = () => {
            setDialogOpened(false);
            // if we have an invalid value in the input, we must return the cursor to the input
            if (inputChanged) {
                this.inputTextRef.current.focus();
            }
        }

        // this way via a method, maybe the method is called only when the dialog opens and we save something...
        const createSearchBrowseParams = (): SearchBrowseParams => {
            return {
                onChoose: onChoose,
                displayFieldFilter: (inputChanged ? {field: props.displayField, constraint: {value: inputValueState, matchMode: "contains"}} : undefined),
                customFilter: () => this.getFilterBase(this.props.filter)
            };
        }

        // we compute inputValue
        const inputValue = computeInputValue();

        return (
            <div className="field grid">
                <label htmlFor={props.assocField} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <div className="x-search-field">
                    <InputText id={props.assocField} value={inputValue} onChange={onInputValueChange} onBlur={onInputBlur}
                               readOnly={this.isReadOnly()} ref={this.inputTextRef} maxLength={xDisplayField.length} size={size} style={props.inputStyle}
                               {...this.getClassNameTooltip()}/>
                    <Button icon="pi pi-search" onClick={onClickSearch}/>
                </div>
                <Dialog className="x-dialog-without-header" visible={dialogOpened} /*style={{ width: '50vw' }}*/ onHide={onHide}>
                    {/* by cloning the element we add the attribute searchBrowseParams */}
                    {cloneElement(props.searchBrowse as ReactElement<any>, {searchBrowseParams: createSearchBrowseParams()}/*, props.searchBrowse.children*/)}
                </Dialog>
            </div>
        );
    }
}
