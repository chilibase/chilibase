import React, {useState, type CSSProperties, type FocusEvent} from "react";
import {Utils} from "../../utils/Utils";
import {Editor, type EditorTextChangeEvent} from "primereact/editor";
import Quill from 'quill';

// without this code the size options do not work
const Size: any = Quill.import('attributors/style/size');
Size.whitelist = ['10px', '12px', '14px', '16px', '18px', '24px', '32px', '48px'];
Quill.register(Size, true);

const Font: any = Quill.import('formats/font');
Font.whitelist = [
    'sans-serif', 'serif', 'monospace',
    'times-new-roman', 'comic-sans',
];
Quill.register(Font, true);

const headerTemplate = () => {
    // note - css styles placed in App.css are also tied to this layout
    const styleMarginRight: CSSProperties = {marginRight: '0.7rem'};
    return (
        <span className="ql-formats">

            <select className="ql-font" aria-label="Font">
                <option value="sans-serif" selected>Sans-Serif</option>
                <option value="serif">Serif</option>
                <option value="monospace">Monospace</option>
                <option value="times-new-roman">TimesNewRoman</option>
                <option value="comic-sans">Comic Sans</option>
            </select>

            <select className="ql-size" aria-label="Font Size" style={styleMarginRight}>
                <option value="10px">10</option>
                <option value="12px" selected>12</option>
                <option value="14px">14</option>
                <option value="16px">16</option>
                <option value="18px">18</option>
                <option value="24px">24</option>
                <option value="32px">32</option>
                <option value="48px">48</option>
            </select>

            <button className="ql-bold" aria-label="Bold"></button>
            <button className="ql-italic" aria-label="Italic"></button>
            <button className="ql-underline" aria-label="Underline"></button>
            <button className="ql-strike" aria-label="Strikethrough" style={styleMarginRight}></button>

            <select className="ql-color" aria-label="Text Color"></select>
            <select className="ql-background" aria-label="Background Color" style={styleMarginRight}></select>

            <select className="ql-align" aria-label="Text Alignment" style={styleMarginRight}>
                <option selected></option>
                <option value="center"></option>
                <option value="right"></option>
            </select>

            <button className="ql-list" value="ordered" aria-label="Ordered List"></button>
            <button className="ql-list" value="bullet" aria-label="Bullet List"></button>
            <button className="ql-indent" value="-1" aria-label="Indent to the left"></button>
            <button className="ql-indent" value="+1" aria-label="Indent to the right"></button>

        </span>
    );
};

// for optimization - it writes the typed text into its own state variable and calls onChange only from onBlur
// in large forms the call of the state change this.setState({object: this.state.object, errorMap: this.state.errorMap}); is namely slow
export interface RichTextInputProps {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    readOnly?: boolean;
    error?: string;
    style?: CSSProperties;
}

export const RichTextInput = (props: RichTextInputProps) => {

    // true if the user is typing a value
    // false if onBlur was called
    const [editorValueChanged, setEditorValueChanged] = useState<boolean>(false);
    // used only if editorValueChanged === true; the changed value in the editor is stored here
    const [editorValue, setEditorValue] = useState<string | null>(null);

    const onTextChange = (e: EditorTextChangeEvent) => {
        setEditorValueChanged(true);
        setEditorValue(e.htmlValue);
    }

    const onBlur = (e: FocusEvent<HTMLDivElement>) => {
        // optimization - we call onChange only if editorValueChanged === true
        if (editorValueChanged) {
            // TODO - will onBlur always be called only after editorValue has been set? because if not then the value has to be taken from "e"
            //const htmlValue: string | null = e.target.??;
            props.onChange(editorValue);
            setEditorValueChanged(false);
            setEditorValue(null); // for the sake of order
        }
    }

    const getValue = (): string | undefined => {
        let htmlValue: string | null;
        if (editorValueChanged) {
            htmlValue = editorValue;
        }
        else {
            htmlValue = props.value;
        }
        return htmlValue !== null ? htmlValue : undefined; // value in primereact Editor does not want null, it wants undefined
    }

    return (
        <Editor id={props.id} value={getValue()} onTextChange={onTextChange} onBlur={onBlur} readOnly={props.readOnly}
                pt={{root: {style: props.style}}}
                {...Utils.createTooltipOrErrorProps(props.error)} headerTemplate={headerTemplate()}/>
    );
}
