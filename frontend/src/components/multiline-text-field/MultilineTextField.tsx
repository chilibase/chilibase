import React, {type CSSProperties, createRef} from "react";
import {ValueField, type ValueFieldProps} from "../form/ValueField";
import {Utils} from "../../utils/Utils";
import {MultilineTextInput} from "./MultilineTextInput";
import {Tooltip} from "primereact/tooltip";

export interface MultilineTextFieldProps extends ValueFieldProps {
    rows?: number;
    cols?: number | "full"; // full - maximum width (width:100%)
    labelOnTop?: boolean;
    autoResize?: boolean;
    fieldStyle?: CSSProperties; // for now here, maybe in the future we will move it to the superclass
}

export class MultilineTextField extends ValueField<MultilineTextFieldProps> {

    public static defaultProps = {
        cols: "full"
    };

    multilineTextInputRef: any;
    labelOnTop: boolean;

    constructor(props: MultilineTextFieldProps) {
        super(props);

        this.multilineTextInputRef = createRef();

        if (props.labelOnTop !== undefined) {
            this.labelOnTop = props.labelOnTop;
        }
        else {
            this.labelOnTop = Utils.isMobile();
        }

        this.onValueChange = this.onValueChange.bind(this);
    }

    getValue(): string | null {
        return this.getValueFromObject();
    }

    onValueChange(value: string | null) {
        this.onValueChangeBase(value, this.props.onChange);
    }

    getLabelStyle(): CSSProperties {
        return this.labelOnTop ? (this.props.labelStyle ?? {}) : super.getLabelStyle();
    }

    // api method - can be called through "ref" from parent if needed to adjust the height of the input textarea according to the (changed) content
    autoResize() {
        if (this.multilineTextInputRef.current) {
            this.multilineTextInputRef.current.autoResize();
        }
    }

    render() {

        let fieldStyle: CSSProperties | undefined = this.props.fieldStyle;
        const labelStyle: CSSProperties = this.getLabelStyle();
        let inputStyle: CSSProperties = this.props.inputStyle ?? {};
        let cols: number | undefined;
        if (this.props.cols === "full") {
            cols = undefined;
            // we add width:100%
            //fieldStyle = {width: '100%'};
            let widthValue: string;
            if (this.labelOnTop) {
                widthValue = '100%';
            }
            else {
                // if we do not have labelOnTop=true, we must subtract the label width, otherwise the label ends up above the input (because of flex-wrap: wrap)
                const labelStyleWidth: string | number | undefined = labelStyle.width;
                if (labelStyleWidth) {
                    widthValue = `calc(100% - ${labelStyleWidth})`;
                }
                else {
                    widthValue = '100%';
                }
            }
            Utils.addCssPropIfNotExists(inputStyle, {width: widthValue});
        }
        else {
            // TODO - setting cols does not work if labelOnTop=true - then the input is stretched to 100%
            // stretching to 100% is caused by .x-inputtextarea-label-on-top {flex-direction: column;}
            // anyway "full" will probably always be used
            cols = this.props.cols;
        }

        const label: string | undefined = this.getLabel();
        const value: string | null = this.getValue();

        const {labelTooltip, labelElemId, inputTooltip} = this.getTooltipsAndLabelElemId(
            this.props.field, label, value, this.props.labelTooltip, this.props.tooltip, this.props.desc);

        // we render MultilineTextField only when we have the object loaded, because otherwise on autoResize the correct size is not set for us (the value is not available on the first rendering)
        return (
            <div className={!this.labelOnTop ? 'field grid' : 'field grid x-inputtextarea-label-on-top'} style={fieldStyle}>
                {label !== undefined ? <label id={labelElemId} htmlFor={this.props.field} className={!this.labelOnTop ? 'col-fixed' : undefined} style={labelStyle}>{label}</label> : null}
                {labelTooltip ? <Tooltip target={`#${labelElemId}`} content={labelTooltip}/> : null}
                {this.props.form.state.entityRow ?
                    <MultilineTextInput ref={this.multilineTextInputRef} id={this.props.field} value={value} onChange={this.onValueChange} readOnly={this.isReadOnly()}
                               maxLength={this.xField.length} style={inputStyle} className={this.props.inputClassName} rows={this.props.rows} cols={cols}
                               autoResize={this.props.autoResize} error={this.getError()} tooltip={inputTooltip} placeholder={this.props.placeholder ?? this.props.desc}/>
                    : null
                }
            </div>
        );
    }
}
