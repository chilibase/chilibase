import {FormBase} from "../form";
import React, {type ReactElement, useRef, useState, cloneElement} from "react";
import {Utils} from "../../utils/Utils";
import {InputText} from "primereact/inputtext";
import {Button} from "primereact/button";
import {Dialog} from "primereact/dialog";
import type {SearchBrowseParams} from "../browse";
import type {TableFieldReadOnlyProp} from "../detail-data-table";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export const TableSearchField = (props: {form: FormBase; entity: string; assocField: string; displayField: string, searchBrowse: ReactElement; assocForm?: ReactElement; rowData: any; readOnly?: TableFieldReadOnlyProp}) => {

    const inputTextRef = useRef<any>(null);

    const [inputChanged, setInputChanged] = useState(false); // flag whether the user changed the value in the input by typing
    const [inputValueState, setInputValueState] = useState<any>(null); // used only if inputChanged === true; the changed value in the input is stored here

    const [dialogOpened, setDialogOpened] = useState(false);

    const computeInputValue = () : any => {
        let inputValue = null;
        if (!inputChanged) {
            if (props.rowData !== null) {
                // TODO - add the field type via a generic (if possible)
                // note: if assocObject === null then an empty string must be written into the input; if we used null, the change in the model to null would not show up
                const assocObject = props.rowData[props.assocField];
                inputValue = (assocObject !== null && assocObject !== undefined) ? assocObject[props.displayField] : "";
            }
        }
        else {
            inputValue = inputValueState;
        }
        return inputValue;
    }

    const onInputValueChange = (e: any) => {
        setInputChanged(true);
        setInputValueState(e.target.value);
    }

    const onInputBlur = async (e: any) => {
        // optimization - we test only if inputChanged === true
        if (inputChanged) {
            //console.log('onBlur = ' + e.target.value + ' - going to test');
            if (e.target.value === '') {
                setValueToModel(null); // an empty string means a null value
            }
            else {
                // TODO - maybe it is better to find out the entity behind the association already on the client - for now like this (x-find-rows-for-assoc)
                const rows: any[] = await Utils.fetchMany('x-find-rows-for-assoc', {entity: props.entity, assocField: props.assocField, displayField: props.displayField, filter: e.target.value});
                if (rows.length === 0) {
                    setDialogOpened(true);
                }
                else if (rows.length === 1) {
                    // we set the found row
                    setValueToModel(rows[0]);
                }
                else {
                    setDialogOpened(true);
                }
            }
        }
    }

    const setValueToModel = (row: any) => {
        // we change the value in the model (the value is read from there)
        props.rowData[props.assocField] = row;
        // since "rowData" is part of "props.form.state.object", it is enough to call setState({object: object}) for the change to show up
        props.form.onObjectDataChange();
        setInputChanged(false);
    }

    const onClickSearch = (e: any) => {
        //console.log("onClickSearch called");
        if (!readOnly) {
            setDialogOpened(true);
        }
        else {
            if (props.assocForm !== undefined) {
                const xEntity = UtilsMetadataCommon.getEntity(props.entity);
                const xEntityAssoc = UtilsMetadataCommon.getEntityForAssocToOne(xEntity, props.assocField)
                if (props.rowData !== null) {
                    const assocObject = props.rowData[props.assocField];
                    // QUESTION - obtain the id directly from the root object? but then it has to be added to the root object
                    const id = (assocObject !== null && assocObject !== undefined) ? assocObject[xEntityAssoc.idField] : null;
                    // by cloning the element we add the attribute id
                    const assocForm = cloneElement(props.assocForm as ReactElement<any>, {id: id}/*, props.assocForm.children*/);
                    (props.form.props as any).openForm(assocForm);
                }
            }
        }
    }

    const onChoose = (chosenRow: any) => {
        //console.log("onChoose called");
        // we close the search dialog
        setDialogOpened(false);
        // we write the selected row into the object
        setValueToModel(chosenRow);
    }

    const onHide = () => {
        setDialogOpened(false);
        // if we have an invalid value in the input, we must return the cursor to the input
        if (inputChanged) {
            inputTextRef.current.focus();
        }
    }

    // we compute inputValue
    const inputValue = computeInputValue();

    const readOnly: boolean = Utils.isReadOnlyTableField(undefined, props.readOnly, props.form.state.entityRow, props.rowData);

    return (
        <div>
            <div className="x-search-field">
                <InputText id={props.assocField} value={inputValue} onChange={onInputValueChange} onBlur={onInputBlur} readOnly={readOnly} ref={inputTextRef}/>
                <Button icon="pi pi-search" onClick={onClickSearch} />
            </div>
            <Dialog className="x-dialog-without-header" visible={dialogOpened} /*style={{ width: '50vw' }}*/ onHide={onHide}>
                {/* by cloning the element we add the attribute searchBrowseParams */}
                {cloneElement(props.searchBrowse as ReactElement<any>,
                    {
                            searchBrowseParams : {
                                onChoose: onChoose,
                                displayFieldFilter: (inputChanged ? {field: props.displayField, constraint: {value: inputValueState, matchMode: "contains"}} : undefined),
                                customFilter: undefined // TODO - implement
                            } satisfies SearchBrowseParams
                        }/*, props.searchBrowse.children*/)}
            </Dialog>
        </div>
    );
}
