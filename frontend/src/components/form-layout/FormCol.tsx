import React, {type ReactNode, type CSSProperties} from "react";
import {FormRowCol} from "./FormRowCol";
import {FormBase} from "../form";

export interface FormColProps {
    form?: FormBase;
    width?: string | "full"; // sets css property {width: <props.width>} on the div (full sets 100%)
    labelStyle?: CSSProperties;
    style?: CSSProperties; // is transferred onto the div
    children: ReactNode;
}

export const FormCol = (props: FormColProps) => {
    return <FormRowCol className="x-form-col" form={props.form} width={props.width} labelStyle={props.labelStyle} style={props.style} children={props.children}/>;
}
