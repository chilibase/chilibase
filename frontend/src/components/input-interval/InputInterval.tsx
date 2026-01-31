import React from "react";
import {XInput, XInputProps} from "../XInput";
import {IPostgresInterval} from "../../utils/types";
import {InputIntervalBase} from "./InputIntervalBase";

export interface InputIntervalProps extends XInputProps {
    inputStyle?: React.CSSProperties;
}

export class InputInterval extends XInput<InputIntervalProps> {

    constructor(props: InputIntervalProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): IPostgresInterval | null {
        return this.getValueFromObject();
    }

    onValueChange(value: IPostgresInterval | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    render() {
        return (
            <div className="field grid">
                <label htmlFor={this.props.field} className="col-fixed" style={this.getLabelStyle()}>{this.getLabel()}</label>
                <InputIntervalBase id={this.props.field} value={this.getValue()} onChange={this.onValueChange}
                                    readOnly={this.isReadOnly()} error={this.getError()} style={this.props.inputStyle} {...this.getClassNameTooltip()}/>
            </div>
        );
    }
}

