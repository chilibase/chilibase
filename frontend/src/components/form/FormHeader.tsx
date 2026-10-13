import React, {CSSProperties} from "react";
import {FormBase} from "./FormBase";
import {localeOption} from "../locale/Locale";

export const FormHeader = (props: {form?: FormBase; label: string; appendNewRow?: boolean; style?: CSSProperties;}) => {
    const appendNewRow = props.appendNewRow ?? true;

    return (
        <div className="x-form-header" style={props.style}>{props.label + (appendNewRow && props.form?.isAddRow() ? " - " + localeOption('newRow') : "")}</div>
    );
}

