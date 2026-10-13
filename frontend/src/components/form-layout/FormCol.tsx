import React, {ReactNode, CSSProperties} from "react";
import {FormRowCol} from "./FormRowCol";
import {FormBase} from "../form";

export interface FormColProps {
    form?: FormBase;
    width?: string | "full"; // nastavi css property {width: <props.width>} na div (full nastavuje 100%)
    labelStyle?: CSSProperties;
    style?: CSSProperties; // prenesie sa na div
    children: ReactNode;
}

export const FormCol = (props: FormColProps) => {
    return <FormRowCol className="x-form-col" form={props.form} width={props.width} labelStyle={props.labelStyle} style={props.style} children={props.children}/>;
}
