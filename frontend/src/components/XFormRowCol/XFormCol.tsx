import React from "react";
import {XFormRowCol} from "./XFormRowCol";
import {FormBase} from "../form";

export interface XFormColProps {
    form?: FormBase;
    width?: string | "full"; // nastavi css property {width: <props.width>} na div (full nastavuje 100%)
    labelStyle?: React.CSSProperties;
    style?: React.CSSProperties; // prenesie sa na div
    children: JSX.Element | JSX.Element[];
}

export const XFormCol = (props: XFormColProps) => {
    return <XFormRowCol className="x-form-col" form={props.form} width={props.width} labelStyle={props.labelStyle} style={props.style} children={props.children}/>;
}
