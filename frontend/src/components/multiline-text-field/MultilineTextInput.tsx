import React, {Component, type CSSProperties, createRef, type FocusEvent} from "react";
import {stringAsUI, stringFromUI} from "../../common/UtilsConversions";
import {Utils} from "../../utils/Utils";
import {InputTextarea} from "primereact/inputtextarea";

// for optimization - it writes the typed text into its own state variable and calls onChange only from onBlur
// in large forms the call of the state change this.setState({object: this.state.object, errorMap: this.state.errorMap}); is namely slow

// note: we reworked MultilineTextInput from a functional component to a class component, because we needed the function autoResize(),
// which can be called from parent components via ref (a functional component does not allow providing a ref, because it has no instance
// (a ref can only be forwarded via forwardRef, which is complicated if we also want to have the function autoResize()))

export interface MultilineTextInputProps {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    rows?: number;
    cols?: number;
    autoResize?: boolean;
    readOnly?: boolean;
    error?: string;
    style?: CSSProperties;
    className?: string;
    maxLength?: number;
    tooltip?: string;
    placeholder?: string;
}

export class MultilineTextInput extends Component<MultilineTextInputProps> {

    inputTextareaRef: any;

    state: {
        inputChanged: boolean; // flag whether the user changed the value in the input by typing
        inputValueState: string | undefined; // used only if inputChanged === true; the changed value in the input is stored here
    };

    constructor(props: MultilineTextInputProps) {
        super(props);

        this.inputTextareaRef = createRef();

        this.state = {
            inputChanged: false,
            inputValueState: undefined
        };

        this.onChange = this.onChange.bind(this);
        this.onBlur = this.onBlur.bind(this);
    }

    onChange(e: any) {
        this.setState({inputChanged: true, inputValueState: e.target.value});
    }

    onBlur(e: FocusEvent<HTMLTextAreaElement>) {
        // optimization - we call onChange only if inputChanged === true
        if (this.state.inputChanged) {
            const value: string | null = stringFromUI(e.target.value);
            this.props.onChange(value);
            // for the sake of order we set inputValueState to undefined
            this.setState({inputChanged: false, inputValueState: undefined});
        }
    }

    getInputValue(): string {
        let inputValue: string;
        if (this.state.inputChanged) {
            inputValue = this.state.inputValueState!;
        }
        else {
            inputValue = stringAsUI(this.props.value);
        }
        return inputValue;
    }

    // call this method to autoresize textarea after setting the content of MultilineTextInput via onChange of some other attribute (e.g. onChangeClient)
    // must be called as callback (param) of the method XFormBase.setStateXForm
    autoResize() {
        // code from ChatGPT
        if (this.inputTextareaRef.current) {
            this.inputTextareaRef.current.style.height = 'auto'; // Reset height
            this.inputTextareaRef.current.style.height = `${this.inputTextareaRef.current.scrollHeight}px`; // Set height based on scrollHeight
        }
    }

    render() {
        return (
            <InputTextarea ref={this.inputTextareaRef} id={this.props.id} value={this.getInputValue()} onChange={this.onChange}
                           onBlur={this.onBlur} readOnly={this.props.readOnly}
                           maxLength={this.props.maxLength} style={this.props.style} rows={this.props.rows} cols={this.props.cols}
                           autoResize={this.props.autoResize}
                           {...Utils.addClassName(Utils.createTooltipOrErrorProps(this.props.error, this.props.tooltip), this.props.className)}
                           placeholder={this.props.placeholder}/>
        );
    }
}
