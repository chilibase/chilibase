import {FormBase} from "../form";
import type {EntityRow} from "../../common/types";
import React, {cloneElement} from "react";
import {Button} from "primereact/button";
import {Utils} from "../../utils/Utils";
import {UtilsMetadataCommon} from "../../common/UtilsMetadataCommon";

export const ToOneAssocButton = (props: {form: FormBase; assocField: string; assocForm: any; label?: string; buttonLabel?: string;}) => {

    // maybe it would be better to put xEntityAssoc.idField here but *FAKE* is enough too
    props.form.addField(props.assocField + '.*FAKE*');

    const label = props.label !== undefined ? props.label : props.assocField;

    const entityRow: EntityRow | null = props.form.state.entityRow;
    const assocObject = entityRow !== null ? entityRow[props.assocField] : null;

    const onClickButton = (e: any) => {
        const xEntity = UtilsMetadataCommon.getEntity(props.form.getEntity());
        const xEntityAssoc = UtilsMetadataCommon.getEntityForAssocToOne(xEntity, props.assocField)
        // QUESTION - obtain the id directly from the root object? but then it has to be added to the root object
        const id = assocObject !== null ? assocObject[xEntityAssoc.idField] : null;
        // by cloning the element we add the attribute id
        const assocForm = cloneElement(props.assocForm, {id: id}, props.assocForm.children);
        (props.form.props as any).openForm(assocForm);
    }

    return (
        <div className="field grid">
            <label htmlFor={props.assocField} className="col-fixed" style={{width: Utils.FIELD_LABEL_WIDTH}}>{label}</label>
            <Button label={props.buttonLabel !== undefined ? props.buttonLabel : label} onClick={onClickButton} disabled={assocObject === null}/>
        </div>
    );
}
