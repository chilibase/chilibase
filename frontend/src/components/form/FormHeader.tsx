import React, {type CSSProperties} from "react";
import {FormBase} from "./FormBase";
import {localeOption} from "../locale/Locale";

export interface FormHeaderProps {
    form?: FormBase;
    label: string;
    appendNewRow?: boolean;
    style?: CSSProperties;
}

export const FormHeader = (
    {
        appendNewRow = true,
        ...propsRest
    }
    : FormHeaderProps) => {
    const props = {
        appendNewRow,
        ...propsRest
    }

    return (
        <div className="x-form-header" style={props.style}>{props.label + (props.appendNewRow && props.form?.isAddRow() ? " - " + localeOption('newRow') : "")}</div>
    );
}

