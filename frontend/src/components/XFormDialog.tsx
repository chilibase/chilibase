import React, {useRef} from "react";
import {Dialog} from "primereact/dialog";
import {XFormBase, XFormWithLoaderProps, XOnSaveOrCancelProp} from "./XFormBase";
import {OperationType} from "./XUtils";
import {XFormProps} from "./XFormBase";
import {XFormWithLoader} from "./XFormWithLoader";

export interface XFormDialogState {
    opened: boolean;
    id?: number;
    initValues?: object;
    onSaveOrCancel?: XOnSaveOrCancelProp;
    Form?: React.ComponentType<XFormProps>;  // overrides prop form in XFormDialog
    formElement?: React.ReactElement;  // overrides prop form in XFormDialog
}

export const XFormDialog = (props: {
    dialogState: XFormDialogState;
    Form?: React.ComponentType<XFormProps>;
    formElement?: React.ReactElement;
    entity: string; // entity of the form - better would be to take entity from form (if it is technically possible)
}) => {

    const formBaseRef = useRef<XFormBase>(null);

    const onHide = () => {
        formBaseRef.current!.cancelEdit();
    }

    const createFormElem = (): React.ReactElement | undefined => {
        let form: React.ReactElement | undefined = undefined; // resulting form (JSX element)
        // optimalisation (otherwise the component FormWithLoader is created even if the form is not opened)
        if (props.dialogState.opened) {
            const Form: React.ComponentType<XFormProps> | undefined = props.dialogState.Form ?? props.Form;
            const formElement: React.ReactElement | undefined = props.dialogState.formElement ?? props.formElement;
            //console.log(`********** volany XFormDialog.createFormElem entity = ${props.entity} Form = ${Form?.name} id = ${props.dialogState.id}`);
            if (Form || formElement) {
                // wrap form component into component that first calls loader and after that renders the original form component
                const FormWithLoader: React.FC<XFormWithLoaderProps> = XFormWithLoader(Form, formElement, props.entity, props.dialogState.id === undefined ? OperationType.Insert : OperationType.Update);
                form = <FormWithLoader formBaseRef={formBaseRef} id={props.dialogState.id} initValues={props.dialogState.initValues} onSaveOrCancel={props.dialogState.onSaveOrCancel} isInDialog={true} params={props.dialogState.initValues}/>;
            }
        }
        return form;
    }

    return (
        <Dialog key="dialog-form" className="x-dialog-without-header" visible={props.dialogState.opened} onHide={onHide}>
            {createFormElem()}
        </Dialog>
    );
}
