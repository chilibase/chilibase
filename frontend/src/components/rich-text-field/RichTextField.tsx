import React, {type CSSProperties} from "react";
import {ValueField, type ValueFieldProps} from "../form/ValueField";
import {Utils} from "../../utils/Utils";
import {RichTextInput} from "./RichTextInput";

export interface RichTextFieldProps extends ValueFieldProps {
    labelOnTop: boolean;
}

export class RichTextField extends ValueField<RichTextFieldProps> {

    public static defaultProps = {
        labelOnTop: false
    };

    constructor(props: RichTextFieldProps) {
        super(props);

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): string | null {
        return this.getValueFromObject();
    }

    onValueChange(value: string | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    getLabelStyle(): CSSProperties {
        return this.props.labelOnTop ? (this.props.labelStyle ?? {}) : super.getLabelStyle();
    }

    render() {

        // TODO - it is not tested

        let style: CSSProperties = this.props.inputStyle ?? {};
        // by default we add width:100%
        // if we do not have labelOnTop=true, we must subtract the label width, otherwise the label ends up above the input (because of flex-wrap: wrap)
        const widthValue: string = this.props.labelOnTop ? '100%' : `calc(100% - ${Utils.FIELD_LABEL_WIDTH})`;
        Utils.addCssPropIfNotExists(style, {width: widthValue});

        // x-editor-label-on-top - sets orientation: column, so that the label and RichTextInput are one under the other (done according to MultilineTextField)
        // we render RichTextInput only when we have the object loaded, because otherwise the correct size is not set for us (the value is not available on the first rendering) (done according to MultilineTextField)
        return (
            <div className={!this.props.labelOnTop ? 'field grid' : 'field grid x-editor-label-on-top'}>
                <label htmlFor={this.props.field} className={!this.props.labelOnTop ? 'col-fixed' : undefined} style={this.getLabelStyle()}>{this.getLabel()}</label>
                {this.props.form.state.entityRow ?
                    <RichTextInput id={this.props.field} value={this.getValue()} onChange={this.onValueChange} readOnly={this.isReadOnly()}
                                 style={style} error={this.getError()}/>
                    : null
                }
            </div>
        );
    }
}
