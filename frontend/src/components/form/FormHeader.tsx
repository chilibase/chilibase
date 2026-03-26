import React from "react";
import {FormBase} from "./FormBase";
import {localeOption} from "../locale/Locale";

export const FormHeader = (props: {form?: FormBase; label: string; appendNewRow: boolean; style?: React.CSSProperties;}) => {

    return (
        <div className="x-form-header" style={props.style}>{props.label + (props.appendNewRow && props.form?.isAddRow() ? " - " + localeOption('newRow') : "")}</div>
    );
}

FormHeader.defaultProps = {
    appendNewRow: true
};

