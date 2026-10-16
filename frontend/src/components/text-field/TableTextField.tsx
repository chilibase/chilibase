import {FormBase} from "../form";
import React from "react";
import {InputText} from "primereact/inputtext";
import {stringAsUI, stringFromUI} from "../../common/UtilsConversions";
import {UtilsCommon} from "../../common/UtilsCommon";
import type {TableFieldReadOnlyProp} from "../detail-data-table";
import {Utils} from "../../utils/Utils";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export const TableTextField = (props: {form: FormBase; entity: string; field: string; rowData: any; readOnly?: TableFieldReadOnlyProp}) => {

    const xField = UtilsMetadataCommon.getFieldByPathStr(props.entity, props.field);

    const onValueChange = (field: string, rowData: any, newValue: any) => {

        // we change the value in the model (the value is read from there)
        rowData[field] = stringFromUI(newValue);
        // since "rowData" is part of "props.form.state.object", it is enough to call setState({object: object}) for the change to show up
        props.form.onObjectDataChange();
    }

    let fieldValue = "";
    // the test for undefined is here because of insert of a new row
    if (props.rowData !== undefined && props.rowData !== null) {
        let rowDataValue = UtilsCommon.getValueByPath(props.rowData, props.field);
        // on insert of a new row all fields are (for now) undefined, we set them to null, null is the standard
        if (rowDataValue === undefined) {
            rowDataValue = null;
        }
        // converting a null value to "" (in the function stringAsUI) is important so that the change to null in the model shows up (and also so that it correctly adds a new row)
        fieldValue = stringAsUI(rowDataValue);
    }

    const readOnly: boolean = Utils.isReadOnlyTableField(props.field, props.readOnly, props.form.state.entityRow, props.rowData);

    return (
        <InputText id={props.field} value={fieldValue} onChange={(e: any) => onValueChange(props.field, props.rowData, e.target.value)}
                   readOnly={readOnly} maxLength={xField.length} className="x-input-to-resize"/>
    );

}
