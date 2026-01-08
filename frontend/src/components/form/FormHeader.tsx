import React from "react";
import {FormBase} from "./FormBase";
import {xLocaleOption} from "../XLocale";

export const FormHeader = (props: {form?: FormBase; label: string; appendNewRow: boolean; style?: React.CSSProperties;}) => {

    return (
        <div className="x-form-header" style={props.style}>{props.label + (props.appendNewRow && props.form?.isAddRow() ? " - " + xLocaleOption('newRow') : "")}</div>
    );
}

FormHeader.defaultProps = {
    appendNewRow: true
};

