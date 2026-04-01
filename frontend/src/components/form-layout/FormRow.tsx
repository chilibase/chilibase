import React from "react";
import {FormRowCol} from "./FormRowCol";
import {FormBase} from "../form";

export interface FormRowProps {
    form?: FormBase;
    labelStyle?: React.CSSProperties;
    style?: React.CSSProperties; // prenesie sa na div
    inline?: boolean; // if true, the children elements are aligned to the left (used to put more inputs into the row)
    children: JSX.Element | JSX.Element[];
}

export const FormRow = (props: FormRowProps) => {
    return <FormRowCol className={props.inline ? "x-form-inline-row" : "x-form-row"} form={props.form} labelStyle={props.labelStyle} style={props.style} children={props.children}/>;
}
