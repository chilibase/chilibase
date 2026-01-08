import React from "react";
import {XFormRowCol} from "./XFormRowCol";
import {FormBase} from "../form";

export interface XFormRowProps {
    form?: FormBase;
    labelStyle?: React.CSSProperties;
    style?: React.CSSProperties; // prenesie sa na div
    children: JSX.Element | JSX.Element[];
}

export const XFormRow = (props: XFormRowProps) => {
    return <XFormRowCol className="x-form-row" form={props.form} labelStyle={props.labelStyle} style={props.style} children={props.children}/>;
}
