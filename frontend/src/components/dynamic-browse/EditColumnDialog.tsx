import React, {useState} from "react";
import {Dialog} from "primereact/dialog";
import {FieldSelector} from "./FieldSelector";
import {InputText} from "primereact/inputtext";
import {Checkbox} from "primereact/checkbox";
import {Button} from "../button";
import {UtilsCommon} from "../../common/UtilsCommon";

export interface EditColumnDialogValues {
    field: string;
    header: string;
    dropdownInFilter: boolean;
}

export const EditColumnDialog = (props: {dialogOpened: boolean; addColumn: boolean; entity: string; editColumnDialogValues?: EditColumnDialogValues; onHideDialog: (editColumnDialogValues: EditColumnDialogValues | null) => void;}) => {

    const notNullValues = props.editColumnDialogValues ?? {field: "", header: "", dropdownInFilter: false};

    const [field, setField] = useState<string>(notNullValues.field);
    const [header, setHeader] = useState(notNullValues.header);
    const [dropdownInFilter, setDropdownInFilter] = useState(notNullValues.dropdownInFilter);
    const [dropdownInFilterReadOnly, setDropdownInFilterReadOnly] = useState(true);

    // without this method, initialization of the state according to "props.editColumnDialogValues" would not work when opening the dialog again
    // this is probably not a very nice way but I do not feel like moving the state to a higher component, for now we leave it like this
    const onShow = () => {

        setField(notNullValues.field);
        setHeader(notNullValues.header);
        setDropdownInFilter(notNullValues.dropdownInFilter);

        setupDropdownInFilter(notNullValues.field); // depends on "field"
    }

    const onFieldChange = (selectedField: string) => {

        setField(selectedField);
        setupDropdownInFilter(selectedField); // depends on "field"
    }

    const setupDropdownInFilter = (field: string) => {
        const fieldList: string[] = UtilsCommon.getFieldListForPath(field);
        if (fieldList.length < 2) {
            setDropdownInFilter(false);
            setDropdownInFilterReadOnly(true);
        }
        else {
            setDropdownInFilterReadOnly(false);
        }
    }

    const onSave = () => {

        if (!field) {
            alert("Please select the row.");
            return;
        }

        props.onHideDialog({field: field, header: header, dropdownInFilter: dropdownInFilter});
    }


    let fieldElement;
    let buttonLabel;
    if (props.addColumn) {
        fieldElement =
            <div className="mb-3">
                <FieldSelector entity={props.entity} assocSelectable={false}
                                           selectionField={field} onSelectionChange={onFieldChange}/>
            </div>;
        buttonLabel = "Add column";
    }
    else {
        fieldElement =
            <div className="field grid">
                <label htmlFor="field" className="col-fixed" style={{width:'9.3rem'}}>Field</label>
                <InputText id="field" value={field} readOnly={true}/>
            </div>;
        buttonLabel = "Modify column";
    }

    // note: rendering of the inner components of the Dialog is called only after the dialog is opened
    return (
        <Dialog visible={props.dialogOpened} onShow={onShow} onHide={() => props.onHideDialog(null)}>
            {fieldElement}
            <div className="field grid">
                <label htmlFor="header" className="col-fixed" style={{width:'9.3rem'}}>Header</label>
                <InputText id="header" value={header} onChange={(e: any) => setHeader(e.target.value)} maxLength={64}/>
            </div>
            <div className="field grid">
                <label htmlFor="dropdownInFilter" className="col-fixed" style={{width:'9.3rem'}}>Dropdown in filter</label>
                <Checkbox id="dropdownInFilter" checked={dropdownInFilter} onChange={(e: any) => setDropdownInFilter(e.checked)} readOnly={dropdownInFilterReadOnly}/>
            </div>
            <Button label={buttonLabel} onClick={onSave}/>
        </Dialog>
    );
}
