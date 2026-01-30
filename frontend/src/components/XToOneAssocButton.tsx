import {FormBase} from "./form";
import {EntityRow} from "../common/types";
import React from "react";
import {Button} from "primereact/button";
import {XUtils} from "./XUtils";
import {UtilsMetadataCommon} from "../common/UtilsMetadataCommon";

export const XToOneAssocButton = (props: {form: FormBase; assocField: string; assocForm: any; label?: string; buttonLabel?: string;}) => {

    // mozno lepsie by bolo sem dat xEntityAssoc.idField ale postaci aj *FAKE*
    props.form.addField(props.assocField + '.*FAKE*');

    const label = props.label !== undefined ? props.label : props.assocField;

    const entityRow: EntityRow | null = props.form.state.entityRow;
    const assocObject = entityRow !== null ? entityRow[props.assocField] : null;

    const onClickButton = (e: any) => {
        const xEntity = UtilsMetadataCommon.getEntity(props.form.getEntity());
        const xEntityAssoc = UtilsMetadataCommon.getEntityForAssocToOne(xEntity, props.assocField)
        // OTAZKA - ziskavat id priamo z root objektu? potom ho vsak treba do root objektu pridat
        const id = assocObject !== null ? assocObject[xEntityAssoc.idField] : null;
        // klonovanim elementu pridame atribut id
        const assocForm = React.cloneElement(props.assocForm, {id: id}, props.assocForm.children);
        (props.form.props as any).openForm(assocForm);
    }

    return (
        <div className="field grid">
            <label htmlFor={props.assocField} className="col-fixed" style={{width: XUtils.FIELD_LABEL_WIDTH}}>{label}</label>
            <Button label={props.buttonLabel !== undefined ? props.buttonLabel : label} onClick={onClickButton} disabled={assocObject === null}/>
        </div>
    );
}