import React from "react";
import {FormRowCol} from "./FormRowCol";
import {FormBase} from "../form";

export interface FormColProps {
    form?: FormBase;
    width?: string | "full"; // nastavi css property {width: <props.width>} na div (full nastavuje 100%)
    labelStyle?: React.CSSProperties;
    style?: React.CSSProperties; // prenesie sa na div
    children: JSX.Element | JSX.Element[];
}

export const FormCol = (props: FormColProps) => {
    return <FormRowCol className="x-form-col" form={props.form} width={props.width} labelStyle={props.labelStyle} style={props.style} children={props.children}/>;
}
